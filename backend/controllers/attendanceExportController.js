const Team = require('../models/Team');
const exceljs = require('exceljs');

exports.exportZerothReviewAttendance = async (req, res) => {
    try {
        const { programme } = req.query;
        if (!programme) {
            return res.status(400).json({ message: 'Programme name is required.' });
        }

        // Fetch all teams for the given programme
        const teams = await Team.find({ programme: programme })
            .populate('teamLeader', 'name username')
            .populate('members', 'name username')
            .populate('guidePreference', 'name')
            .sort({ teamName: 1 });

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Zeroth Review Attendance');

        // Set column configurations (widths and keys)
        worksheet.columns = [
            { key: 'teamName', width: 22 },
            { key: 'guideName', width: 25 },
            { key: 'memberName', width: 28 },
            { key: 'rollNo', width: 16 },
            { key: 'signature', width: 20 },
            { key: 'date', width: 15 }
        ];

        // 1. Department & University Heading
        worksheet.mergeCells('A1:F1');
        const cellA1 = worksheet.getCell('A1');
        cellA1.value = 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING :: ANNA UNIVERSITY, CHENNAI 600025';
        cellA1.font = { name: 'Times New Roman', size: 14, bold: true };
        cellA1.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 25;

        // 2. Programme Name Heading
        worksheet.mergeCells('A2:F2');
        const cellA2 = worksheet.getCell('A2');
        cellA2.value = programme;
        cellA2.font = { name: 'Times New Roman', size: 12, bold: true };
        cellA2.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(2).height = 20;

        // 3. Review Title Heading
        worksheet.mergeCells('A3:F3');
        const cellA3 = worksheet.getCell('A3');
        cellA3.value = 'Zeroth Review Attendance Sheet';
        cellA3.font = { name: 'Times New Roman', size: 12, bold: true };
        cellA3.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(3).height = 20;

        // 4. Session Heading
        worksheet.mergeCells('A4:F4');
        const cellA4 = worksheet.getCell('A4');
        cellA4.value = 'Session: June 2026 - April 2027';
        cellA4.font = { name: 'Times New Roman', size: 12, bold: true };
        cellA4.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(4).height = 20;

        

        // Empty separator row
        worksheet.getRow(5).height = 15;

        // 6. Header Row
        const headerRow = worksheet.getRow(6);
        headerRow.values = [
            'Team No',
            'Guide',
            'Name',
            'Roll No',
            'Signature',
            'Date'
        ];
        headerRow.height = 24;
        headerRow.font = { name: 'Times New Roman', size: 11, bold: true };

        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEFEFEF' } // Light gray fill
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });

        // 7. Write Data Rows
        let currentRowNum = 7;
        for (const team of teams) {
            const members = [];
            if (team.teamLeader) {
                members.push(team.teamLeader);
            }
            if (team.members) {
                members.push(...team.members);
            }

            // Skip empty teams
            if (members.length === 0) continue;

            const startRow = currentRowNum;
            const endRow = startRow + members.length - 1;

            let teamDisplayName = team.teamName;
            const teamMatch = teamDisplayName.match(/Team\s+\d+/i);
            if (teamMatch) {
                teamDisplayName = teamMatch[0];
            }

            for (let i = 0; i < members.length; i++) {
                const member = members[i];
                const row = worksheet.getRow(currentRowNum);
                row.values = [
                    teamDisplayName,
                    team.guidePreference ? team.guidePreference.name : 'N/A',
                    member.name,
                    member.username,
                    '', // Empty for manual signature
                    ''  // Empty for manual date
                ];
                row.height = 22;

                row.eachCell((cell) => {
                    cell.font = { name: 'Times New Roman', size: 11 };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });

                currentRowNum++;
            }

            // Merge Team Name and Guide columns vertically for the team members
            if (members.length > 1) {
                worksheet.mergeCells(`A${startRow}:A${endRow}`);
                worksheet.mergeCells(`B${startRow}:B${endRow}`);
            }
        }

        // Send Excel file response
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Zeroth_Review_Attendance_${programme.replace(/\s+/g, '_')}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting zeroth review attendance:', error);
        res.status(500).json({ message: 'Error generating attendance Excel sheet.' });
    }
};

const Attendance = require('../models/Attendance');
const { getReviewSettings } = require('../utils/reviewSettings');

exports.exportFullAttendance = async (req, res) => {
    try {
        const { programme } = req.query;
        if (!programme) {
            return res.status(400).json({ message: 'Programme name is required.' });
        }

        const teams = await Team.find({ programme: programme })
            .populate('teamLeader', 'name username')
            .populate('members', 'name username')
            .populate('guidePreference', 'name')
            .sort({ teamName: 1 });

        const teamIds = teams.map(t => t._id);
        const attendanceRecords = await Attendance.find({ team: { $in: teamIds } });

        const { validSlotTypes } = await getReviewSettings();
        
        const attendanceMap = {};
        for (const record of attendanceRecords) {
            if (record.studentAttendances) {
                for (const studentAtt of record.studentAttendances) {
                    const studentId = studentAtt.student ? studentAtt.student.toString() : null;
                    if (!studentId) continue;
                    attendanceMap[studentId] = {};
                    for (const slot of validSlotTypes) {
                        const matching = (studentAtt.assessments || []).find(a => a.name === slot);
                        attendanceMap[studentId][slot] = matching ? matching.isPresent : false;
                    }
                }
            }
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Full Review Attendance');

        const slotHeaders = validSlotTypes.map(s => s.toUpperCase().replace('REVIEW', 'REVIEW '));

        worksheet.columns = [
            { key: 'teamName', width: 22 },
            { key: 'guideName', width: 25 },
            { key: 'memberName', width: 28 },
            { key: 'rollNo', width: 16 },
            ...validSlotTypes.map(s => ({ key: s, width: 15 })),
            { key: 'percentage', width: 18 }
        ];

        const lastColCharCode = 65 + 3 + validSlotTypes.length + 1;
        const lastColLetter = String.fromCharCode(lastColCharCode);
        
        worksheet.mergeCells(`A1:${lastColLetter}1`);
        const cellA1 = worksheet.getCell('A1');
        cellA1.value = 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING :: ANNA UNIVERSITY, CHENNAI 600025';
        cellA1.font = { name: 'Times New Roman', size: 14, bold: true };
        cellA1.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 25;

        worksheet.mergeCells(`A2:${lastColLetter}2`);
        const cellA2 = worksheet.getCell('A2');
        cellA2.value = programme;
        cellA2.font = { name: 'Times New Roman', size: 12, bold: true };
        cellA2.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(2).height = 20;

        worksheet.mergeCells(`A3:${lastColLetter}3`);
        const cellA3 = worksheet.getCell('A3');
        cellA3.value = 'Consolidated Review Attendance Sheet';
        cellA3.font = { name: 'Times New Roman', size: 12, bold: true };
        cellA3.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(3).height = 20;

        worksheet.getRow(4).height = 15;

        const headerRow = worksheet.getRow(5);
        headerRow.values = [
            'Team No',
            'Guide',
            'Name',
            'Roll No',
            ...slotHeaders,
            'Attendance %'
        ];
        headerRow.height = 24;
        headerRow.font = { name: 'Times New Roman', size: 11, bold: true };
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEFEFEF' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });

        let currentRowNum = 6;
        for (const team of teams) {
            const members = [];
            if (team.teamLeader) members.push(team.teamLeader);
            if (team.members) members.push(...team.members);

            if (members.length === 0) continue;

            const startRow = currentRowNum;
            const endRow = startRow + members.length - 1;

            let teamDisplayName = team.teamName;
            const teamMatch = teamDisplayName.match(/Team\s+\d+/i);
            if (teamMatch) teamDisplayName = teamMatch[0];

            for (const member of members) {
                const studentAtt = attendanceMap[member._id.toString()] || {};
                let presentCount = 0;
                const slotValues = validSlotTypes.map(slot => {
                    const val = studentAtt[slot];
                    if (val === true) {
                        presentCount++;
                        return 'P';
                    } else if (val === false) {
                        return 'A';
                    }
                    return '—';
                });
                const pct = validSlotTypes.length > 0 ? Math.round((presentCount / validSlotTypes.length) * 100) + '%' : '0%';

                const row = worksheet.getRow(currentRowNum);
                row.values = [
                    teamDisplayName,
                    team.guidePreference ? team.guidePreference.name : 'N/A',
                    member.name,
                    member.username,
                    ...slotValues,
                    pct
                ];
                row.height = 22;

                row.eachCell((cell) => {
                    cell.font = { name: 'Times New Roman', size: 11 };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });

                currentRowNum++;
            }

            if (members.length > 1) {
                worksheet.mergeCells(`A${startRow}:A${endRow}`);
                worksheet.mergeCells(`B${startRow}:B${endRow}`);
            }
        }

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Full_Review_Attendance_${programme.replace(/\s+/g, '_')}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting full review attendance:', error);
        res.status(500).json({ message: 'Error generating attendance Excel sheet.' });
    }
};
