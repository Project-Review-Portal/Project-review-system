const Team = require('../models/Team');
const User = require('../models/User');
const Panel = require('../models/Panel');
const TimeTable = require('../models/TimeTable');
const Availability = require('../models/Availability');
const Config = require('../models/Config');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const FinalReport = require('../models/FinalReport');
const fs = require('fs');
const path = require('path');

// Get all pending guide requests for the logged-in guide
exports.getGuideRequests = async (req, res) => {
    try {
        const guideId = req.user.id;
        console.log('=== Guide Request Debug ===');
        console.log('Guide ID from token:', guideId);
        console.log('User object:', req.user);

        // First, verify the guide exists
        const guide = await User.findById(guideId);
        console.log('Guide found in database:', guide ? 'Yes' : 'No');

        // Get all teams with this guide as preference (both pending and approved)
        const requests = await Team.find({
            guidePreference: guideId,
            status: { $in: ['pending', 'approved'] }
        })
        .populate({
            path: 'teamLeader',
            select: 'username name',
            model: 'User'
        })
        .populate({
            path: 'members',
            select: 'username name',
            model: 'User'
        });

        console.log('Teams found:', requests.length);
        console.log('Teams data:', JSON.stringify(requests, null, 2));
        console.log('=== End Guide Request Debug ===');

        res.json(requests);
    } catch (error) {
        console.error('Error fetching guide requests:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Accept a guide request
exports.acceptRequest = async (req, res) => {
    try {
        const guideId = req.user.id;
        const { teamId } = req.body;

        const team = await Team.findOne({
            _id: teamId,
            guidePreference: guideId,
            status: 'pending'
        });

        if (!team) {
            return res.status(404).json({ message: 'Team request not found or already processed.' });
        }

        // Accept the request for this team
        team.status = 'approved';
        await team.save();

        // Optionally, reject all other pending requests for this guide
        await Team.updateMany(
            {
                guidePreference: guideId,
                status: 'pending',
                _id: { $ne: teamId }
            },
            { $set: { status: 'rejected' } }
        );

        res.json({ message: 'Guide request accepted successfully!', team });

    } catch (error) {
        console.error('Error accepting guide request:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Reject a guide request
exports.rejectRequest = async (req, res) => {
    try {
        const guideId = req.user.id;
        const { teamId } = req.body;

        const team = await Team.findOne({
            _id: teamId,
            guidePreference: guideId,
            status: 'pending'
        });

        if (!team) {
            return res.status(404).json({ message: 'Team request not found or already processed.' });
        }

        // Reject the request for this team
        team.guidePreference = null; // Clear guide preference on rejection
        team.status = 'rejected';
        // Add the rejecting guide to the rejectedGuides array
        if (!team.rejectedGuides.includes(guideId)) {
            team.rejectedGuides.push(guideId);
        }
        await team.save();

        res.json({ message: 'Guide request rejected successfully!', team });

    } catch (error) {
        console.error('Error rejecting guide request:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all teams assigned to the logged-in guide
exports.getMyTeams = async (req, res) => {
    try {
        const guideId = req.user.id;
        console.log('=== My Teams Debug ===');
        console.log('Guide ID from token:', guideId);

        // Get all teams where this guide is the assigned guide
        const teams = await Team.find({
            guidePreference: guideId,
            status: 'approved'
        })
        .populate({
            path: 'teamLeader',
            select: 'username name',
            model: 'User'
        })
        .populate({
            path: 'members',
            select: 'username name',
            model: 'User'
        });

        console.log('Teams found:', teams.length);
        console.log('Teams data:', JSON.stringify(teams, null, 2));
        console.log('=== End My Teams Debug ===');

        res.json(teams);
    } catch (error) {
        console.error('Error fetching my teams:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get approved teams with their panel assignments
exports.getApprovedTeams = async (req, res) => {
    try {
        console.log('Fetching approved teams for guide:', req.user.id);
        
        const teams = await Team.find({
            guidePreference: req.user.id,
            status: 'approved'
        })
        .populate({
            path: 'teamLeader',
            select: 'username name',
            model: 'User'
        })
        .populate({
            path: 'members',
            select: 'username name',
            model: 'User'
        })
        .populate({
            path: 'panel',
            select: 'name members',
            model: 'Panel'
        });

        console.log('Found teams:', teams.length);
        
        if (!teams || teams.length === 0) {
            return res.json([]); // Return empty array if no teams found
        }

        res.json(teams);
    } catch (error) {
        console.error('Error fetching approved teams:', error);
        res.status(500).json({ 
            message: 'Error fetching approved teams',
            error: error.message 
        });
    }
};

// Request time table for reviews
exports.requestTimeTable = async (req, res) => {
    try {
        const { startTime, endTime } = req.body;
        
        // Validate time inputs
        if (!startTime || !endTime) {
            return res.status(400).json({ message: 'Start time and end time are required' });
        }

        const guideId = req.user.id;

        // You might want to save this request to a TimeTable model or similar
        // For now, let's just log it or return a success message
        console.log(`Guide ${guideId} requested time table from ${startTime} to ${endTime}`);
        
        // Example: Save to TimeTable model (assuming a structure)
        // const newTimeTableRequest = new TimeTable({
        //     user: guideId,
        //     startTime,
        //     endTime,
        //     type: 'guide-request'
        // });
        // await newTimeTableRequest.save();

        res.json({ message: 'Time table request submitted successfully!' });

    } catch (error) {
        console.error('Error submitting time table request:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get guide's availability
exports.getGuideAvailability = async (req, res) => {
    try {
        const guideId = req.user.id;
        let availability = await Availability.findOne({ user: guideId, userRole: 'guide' });
        
        // Get global review period from Config
        const config = await Config.findOne();
        
        if (!availability) {
            // If no availability document exists, return the review period dates from the global config
            return res.json({
                availableSlots: [],
                reviewPeriodStartDate: config ? config.reviewPeriodStartDate : null,
                reviewPeriodEndDate: config ? config.reviewPeriodEndDate : null,
            });
        }
        
        // Add the global review period dates to the response
        availability = availability.toObject();
        availability.reviewPeriodStartDate = config ? config.reviewPeriodStartDate : null;
        availability.reviewPeriodEndDate = config ? config.reviewPeriodEndDate : null;
        
        res.json(availability);
    } catch (error) {
        console.error('Error fetching guide availability:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get guide selection dates for public view
exports.getGuideSelectionDatesPublic = async (req, res) => {
    try {
        const config = await Config.findOne();
        if (!config) {
            return res.status(404).json({ message: 'Configuration not found' });
        }
        res.json({
            startDate: config.guideSelectionStartDate,
            endDate: config.guideSelectionEndDate,
        });
    } catch (error) {
        console.error('Error fetching public guide selection dates:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Submit or update guide's availability
exports.submitGuideAvailability = async (req, res) => {
    try {
        const guideId = req.user.id;
        const { availableSlots } = req.body;

        // Get global review period from Config
        const config = await Config.findOne();

        // Ensure review period dates are present in config
        if (!config || !config.reviewPeriodStartDate || !config.reviewPeriodEndDate) {
            return res.status(400).json({
                message: 'Global review period not set by admin. Please ask an admin to set it.'
            });
        }

        // Validate availableSlots array structure if needed
        if (!Array.isArray(availableSlots)) {
            return res.status(400).json({ message: 'Available slots must be an array.' });
        }

        let availability = await Availability.findOne({ user: guideId, userRole: 'guide' });

        if (!availability) {
            availability = new Availability({
                user: guideId,
                userRole: 'guide',
                availableSlots: availableSlots,
                reviewPeriodStartDate: config.reviewPeriodStartDate,
                reviewPeriodEndDate: config.reviewPeriodEndDate
            });
        } else {
            availability.availableSlots = availableSlots;
            availability.reviewPeriodStartDate = config.reviewPeriodStartDate;
            availability.reviewPeriodEndDate = config.reviewPeriodEndDate;
        }

        await availability.save();
        res.json({ message: 'Availability submitted successfully!', availability });

    } catch (error) {
        console.error('Error submitting guide availability:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get review schedules for a guide
exports.getGuideReviewSchedules = async (req, res) => {
    try {
        const guideId = req.user.id;
        const teams = await Team.find({
            guidePreference: guideId,
            status: 'approved'
        }).select('_id'); 

        if (teams.length === 0) {
            return res.json([]); 
        }

        const teamIds = teams.map(team => team._id);

        const schedules = await TimeTable.find({
            team: { $in: teamIds },
            isNotified: true 
        })
        .populate({
            path: 'team',
            select: 'teamName teamLeader members guidePreference',
            populate: [
                { path: 'teamLeader', select: 'name username' },
                { path: 'members', select: 'name username' },
                { path: 'guidePreference', select: 'name username' }
            ]
        })
        .populate({
            path: 'panel',
            select: 'name members coordinator',
            populate: [
                { path: 'members', select: 'username name memberType' },
                { path: 'coordinator', select: 'username name' }
            ]
        });

        res.json(schedules);
    } catch (error) {
        console.error('Error fetching guide review schedules:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get assigned teams for a guide
exports.getAssignedTeams = async (req, res) => {
    try {
        const guideId = req.user.id;
        console.log(`Fetching assigned teams for guide ID: ${guideId}`);
        const teams = await Team.find({ guidePreference: guideId, status: 'approved' })
            .populate('teamLeader', 'name')
            .populate('members', 'name');
        console.log(`Found ${teams.length} assigned teams:`, teams);
        res.json(teams);
    } catch (error) {
        console.error('Error fetching assigned teams:', error);
        res.status(500).json({ message: 'Error fetching assigned teams' });
    }
};

// Get review period dates
exports.getReviewPeriodDatesPublic = async (req, res) => {
    try {
        const config = await Config.findOne();
        if (!config) {
            return res.status(404).json({ message: 'Review period dates not set' });
        }
        res.json({
            startDate: config.reviewPeriodStartDate,
            endDate: config.reviewPeriodEndDate
        });
    } catch (error) {
        console.error('Error fetching review period dates:', error);
        res.status(500).json({ message: 'Error fetching review period dates' });
    }
};

// Get daily attendance for guide's teams
exports.getDailyAttendance = async (req, res) => {
    try {
        const guideId = req.user.id;
        const teams = await Team.find({ guidePreference: guideId, status: 'approved' }).select('_id');
        if (teams.length === 0) {
            return res.json({});
        }
        const teamIds = teams.map(t => t._id);

        const attendanceRecords = await Attendance.find({ team: { $in: teamIds } });

        const formattedAttendance = {};
        for (const record of attendanceRecords) {
            for (const studentAtt of record.studentAttendances) {
                const studentId = studentAtt.student.toString();
                formattedAttendance[studentId] = {
                    review1: studentAtt.review1,
                    review2: studentAtt.review2,
                    review3: studentAtt.review3,
                    viva: studentAtt.viva,
                };
            }
        }

        res.json(formattedAttendance);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ message: 'Error fetching attendance' });
    }
};

// Upload daily attendance
exports.uploadAttendance = async (req, res) => {
    try {
        const { teamId, studentAttendances } = req.body;
        const guideId = req.user.id;

        const team = await Team.findOne({ _id: teamId, guidePreference: guideId });
        if (!team) {
            return res.status(403).json({ message: 'You are not authorized to mark attendance for this team.' });
        }
        
        await Attendance.findOneAndUpdate(
            { team: teamId },
            {
                $set: {
                    studentAttendances: studentAttendances,
                    guide: guideId
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ message: 'Attendance uploaded successfully' });
    } catch (error) {
        console.error('Error uploading attendance:', error);
        res.status(500).json({ message: 'Error uploading attendance' });
    }
};

// Submit marks for a team (Guide)
exports.submitMarks = async (req, res) => {
    try {
        const { teamId, studentId, mark1, mark2, mark3, mark4, slotType } = req.body;

        // Validate slotType
        const validSlotTypes = ['review1', 'review2', 'review3', 'viva'];
        if (!slotType || !validSlotTypes.includes(slotType)) {
            return res.status(400).json({ message: 'Invalid or missing slotType. Expected one of review1, review2, review3, viva.' });
        }
        const guideId = req.user.id;

        const totalMarks = mark1 + mark2 + mark3 + mark4;
        const percentage = (totalMarks / 40) * 100;

        const team = await Team.findOne({ _id: teamId, guidePreference: guideId });
        if (!team) {
            return res.status(403).json({ message: 'Unauthorized: You are not the guide for this team.' });
        }

        // Check if student is either a team member or the team leader
        const isTeamMember = team.members.includes(studentId);
        const isTeamLeader = team.teamLeader && team.teamLeader.toString() === studentId;
        
        if (!isTeamMember && !isTeamLeader) {
            return res.status(400).json({ message: 'Student is not a member of this team.' });
        }

        const mark = await Mark.findOneAndUpdate(
            { student: studentId, team: teamId, markedBy: guideId, slotType },
            {
                mark1,
                mark2,
                mark3,
                mark4,
                totalMarks: totalMarks,
                percentage: percentage,
                role: 'guide',
                slotType
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ message: 'Marks submitted successfully', mark });
    } catch (error) {
        console.error('Error submitting marks:', error);
        res.status(500).json({ message: 'Failed to submit marks' });
    }
};

// Get marks for teams assigned to the guide
exports.getMarks = async (req, res) => {
    try {
        const guideId = req.user.id;

        const teams = await Team.find({ guidePreference: guideId, status: 'approved' }).select('_id');
        const teamIds = teams.map(team => team._id);

        const marks = await Mark.find({ team: { $in: teamIds }, markedBy: guideId });

        const formattedMarks = {};
        marks.forEach(mark => {
            if (mark.student && mark.slotType) {
                const studentId = mark.student.toString();
                if (!formattedMarks[studentId]) formattedMarks[studentId] = {};
                formattedMarks[studentId][mark.slotType] = {
                    mark1: mark.mark1,
                    mark2: mark.mark2,
                    mark3: mark.mark3,
                    mark4: mark.mark4,
                    totalMarks: mark.totalMarks,
                    percentage: mark.percentage,
                };
            }
        });

        res.json(formattedMarks);
    } catch (error) {
        console.error('Error fetching marks:', error);
        res.status(500).json({ message: 'Failed to fetch marks' });
    }
};

// Final report routes
exports.getReportsForGuide = async (req, res) => {
    try {
        const guideId = req.user.id;
        const teams = await Team.find({ guidePreference: guideId, status: 'approved' }).select('_id');
        const teamIds = teams.map(team => team._id);

        const reports = await FinalReport.find({ team: { $in: teamIds } }).populate({
            path: 'team',
            select: 'teamName teamLeader members',
            populate: {
                path: 'teamLeader members',
                select: 'name username'
            }
        });

        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports for guide:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.approveReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const guideId = req.user.id;

        const report = await FinalReport.findById(reportId).populate('team');
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        if (report.team.guidePreference.toString() !== guideId) {
            return res.status(403).json({ message: 'You are not authorized to approve this report' });
        }

        report.status = 'approved';
        report.approvedBy = guideId;
        await report.save();

        res.json({ message: 'Report approved successfully', report });
    } catch (error) {
        console.error('Error approving report:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.downloadReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const guideId = req.user.id;

        const report = await FinalReport.findById(reportId).populate('team');
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        if (report.team.guidePreference.toString() !== guideId) {
            return res.status(403).json({ message: 'You are not authorized to download this report' });
        }

        const filePath = path.join(__dirname, '..', report.filePath);
        if (fs.existsSync(filePath)) {
            res.download(filePath, report.fileName);
        } else {
            res.status(404).json({ message: 'File not found' });
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 