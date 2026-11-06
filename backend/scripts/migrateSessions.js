const mongoose = require('mongoose');
const Session = require('../models/Session');
const Team = require('../models/Team');
const Panel = require('../models/Panel');
const TeamPanelAssignment = require('../models/TeamPanelAssignment');
const TimeTable = require('../models/TimeTable');
const Mark = require('../models/Mark');
const Attendance = require('../models/Attendance');
const FinalReport = require('../models/FinalReport');
const Config = require('../models/Config');
const MarkingScheme = require('../models/MarkingScheme');
const MaterialSetting = require('../models/MaterialSetting');
const InstructionTemplate = require('../models/InstructionTemplate');
const User = require('../models/User');
const Programme = require('../models/Programme');
const { getISTDate, resolveCurrentSession } = require('../utils/sessionHelper');

const ensureDefaultSessionAndMigrate = async () => {
    try {
        console.log('🔄 Checking Session initialization and migration...');

        // 1. Fetch or create all registered programmes list
        const registeredProgrammes = await Programme.find();
        const progNames = registeredProgrammes.map(p => p.name);
        if (!progNames.some(p => p.toLowerCase() === 'b.e. cse')) {
            progNames.unshift('B.E. CSE');
        }

        // 2. Check if any session exists
        let defaultSession = await Session.findOne();
        if (!defaultSession) {
            const ist = getISTDate();
            const year = ist.getFullYear();
            const month = ist.getMonth() + 1;

            let sMonth = 1;
            let sYear = year;
            let eMonth = 5;
            let eYear = year;
            let semType = 'even';

            if (month >= 6 && month <= 11) {
                sMonth = 7;
                sYear = year;
                eMonth = 11;
                eYear = year;
                semType = 'odd';
            }

            const formattedName = Session.formatSessionName(sMonth, sYear, eMonth, eYear);
            defaultSession = new Session({
                name: formattedName,
                startMonth: sMonth,
                startYear: sYear,
                endMonth: eMonth,
                endYear: eYear,
                semesterType: semType,
                academicYear: `${sYear}-${eYear}`,
                status: 'active', // Set initial migrated session as active
                isManualCurrent: true,
                programmes: progNames
            });

            await defaultSession.save();
            console.log(`✅ Created default initial session: '${formattedName}'`);
        }

        const sessionId = defaultSession._id;

        // 3. Drop obsolete indexes if they conflict with session-based compound indexes
        const db = mongoose.connection.db;
        try {
            await db.collection('teams').dropIndex('teamName_1_programme_1');
            console.log('Dropped obsolete teamName_1_programme_1 index from teams');
        } catch (e) {}

        try {
            await db.collection('panels').dropIndex('name_1_panelType_1_programme_1');
            console.log('Dropped obsolete name_1_panelType_1_programme_1 index from panels');
        } catch (e) {}

        try {
            await db.collection('configs').dropIndex('programme_1');
            console.log('Dropped obsolete programme_1 index from configs');
        } catch (e) {}

        try {
            await db.collection('markingschemes').dropIndex('panel_1_slotType_1_evaluatorType_1');
            console.log('Dropped obsolete index from markingschemes');
        } catch (e) {}

        try {
            await db.collection('marks').dropIndex('student_1_team_1_markedBy_1_slotType_1');
            console.log('Dropped obsolete index from marks');
        } catch (e) {}

        // 4. Update unassigned documents to use defaultSession
        const updateFilter = { $or: [{ session: { $exists: false } }, { session: null }] };
        const updateAction = { $set: { session: sessionId } };

        const resTeams = await Team.updateMany(updateFilter, updateAction);
        const resPanels = await Panel.updateMany(updateFilter, updateAction);
        const resAssignments = await TeamPanelAssignment.updateMany(updateFilter, updateAction);
        const resTimeTables = await TimeTable.updateMany(updateFilter, updateAction);
        const resMarks = await Mark.updateMany(updateFilter, updateAction);
        const resAttendance = await Attendance.updateMany(updateFilter, updateAction);
        const resReports = await FinalReport.updateMany(updateFilter, updateAction);
        const resConfigs = await Config.updateMany(updateFilter, updateAction);
        const resSchemes = await MarkingScheme.updateMany(updateFilter, updateAction);
        const resSettings = await MaterialSetting.updateMany(updateFilter, updateAction);
        const resTemplates = await InstructionTemplate.updateMany(updateFilter, updateAction);
        const resUsers = await User.updateMany({ role: { $ne: 'admin' }, ...updateFilter }, updateAction);

        console.log(`✅ Session migration completed. Linked records to '${defaultSession.name}':`, {
            teams: resTeams.modifiedCount,
            panels: resPanels.modifiedCount,
            assignments: resAssignments.modifiedCount,
            timetables: resTimeTables.modifiedCount,
            marks: resMarks.modifiedCount,
            attendances: resAttendance.modifiedCount,
            reports: resReports.modifiedCount,
            configs: resConfigs.modifiedCount,
            markingSchemes: resSchemes.modifiedCount,
            materialSettings: resSettings.modifiedCount,
            templates: resTemplates.modifiedCount,
            users: resUsers.modifiedCount
        });
    } catch (err) {
        console.error('Error during session migration:', err);
    }
};

module.exports = { ensureDefaultSessionAndMigrate };
