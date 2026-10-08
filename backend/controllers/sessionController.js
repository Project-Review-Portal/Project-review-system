const Session = require('../models/Session');
const User = require('../models/User');
const Team = require('../models/Team');
const Config = require('../models/Config');
const { getISTDate, resolveCurrentSession } = require('../utils/sessionHelper');

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get all sessions.
 * Enriches with isCurrent (computed based on IST or manual override).
 */
exports.getAllSessions = async (req, res) => {
    try {
        const sessions = await Session.find().sort({ startYear: -1, startMonth: -1, createdAt: -1 });
        const currentSession = await resolveCurrentSession();
        const currentSessionId = currentSession ? currentSession._id.toString() : null;

        const enriched = sessions.map(s => {
            const sObj = s.toObject();
            sObj.isCurrent = sObj._id.toString() === currentSessionId;
            sObj.isReadOnly = sObj.status === 'archived' || (!sObj.isCurrent && sObj.status !== 'active');
            return sObj;
        });

        return res.json({
            sessions: enriched,
            currentSessionId
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        return res.status(500).json({ message: 'Failed to fetch sessions', error: error.message });
    }
};

/**
 * Get the current resolved session (for student auto-load and defaults)
 */
exports.getCurrentSession = async (req, res) => {
    try {
        const current = await resolveCurrentSession();
        if (!current) {
            return res.status(404).json({ message: 'No active session found' });
        }
        const sObj = current.toObject();
        sObj.isCurrent = true;
        sObj.isReadOnly = sObj.status === 'archived';
        return res.json(sObj);
    } catch (error) {
        console.error('Error resolving current session:', error);
        return res.status(500).json({ message: 'Failed to resolve current session', error: error.message });
    }
};

/**
 * Create a new session (Admin only)
 */
exports.createSession = async (req, res) => {
    try {
        const {
            startMonth,
            startYear,
            endMonth,
            endYear,
            semesterType,
            status,
            isManualCurrent,
            programmes
        } = req.body;

        if (!startMonth || !startYear || !endMonth || !endYear) {
            return res.status(400).json({ message: 'Start Month/Year and End Month/Year are required.' });
        }

        const sMonthNum = parseInt(startMonth, 10);
        const sYearNum = parseInt(startYear, 10);
        const eMonthNum = parseInt(endMonth, 10);
        const eYearNum = parseInt(endYear, 10);

        if (sMonthNum < 1 || sMonthNum > 12 || eMonthNum < 1 || eMonthNum > 12) {
            return res.status(400).json({ message: 'Month must be between 1 and 12.' });
        }

        const formattedName = Session.formatSessionName(sMonthNum, sYearNum, eMonthNum, eYearNum);

        // Check if session with same name already exists
        const existing = await Session.findOne({ name: formattedName });
        if (existing) {
            return res.status(400).json({ message: `Session '${formattedName}' already exists.` });
        }

        // Auto calculate academic year if not provided
        const academicYear = `${sYearNum}-${eYearNum}`;
        const semType = semesterType || (sMonthNum >= 6 && sMonthNum <= 11 ? 'odd' : 'even');

        if (isManualCurrent) {
            await Session.updateMany({}, { isManualCurrent: false });
        }

        const newSession = new Session({
            name: formattedName,
            startMonth: sMonthNum,
            startYear: sYearNum,
            endMonth: eMonthNum,
            endYear: eYearNum,
            semesterType: semType,
            academicYear,
            status: status || 'paused', // Default is paused as requested
            isManualCurrent: !!isManualCurrent,
            programmes: Array.isArray(programmes) ? programmes : ['B.E. CSE']
        });

        await newSession.save();

        return res.status(201).json({
            message: `Session '${formattedName}' created successfully.`,
            session: newSession
        });
    } catch (error) {
        console.error('Error creating session:', error);
        return res.status(500).json({ message: 'Failed to create session', error: error.message });
    }
};

/**
 * Update an existing session
 */
exports.updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            startMonth,
            startYear,
            endMonth,
            endYear,
            semesterType,
            status,
            isManualCurrent,
            programmes
        } = req.body;

        const session = await Session.findById(id);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        if (startMonth !== undefined) session.startMonth = parseInt(startMonth, 10);
        if (startYear !== undefined) session.startYear = parseInt(startYear, 10);
        if (endMonth !== undefined) session.endMonth = parseInt(endMonth, 10);
        if (endYear !== undefined) session.endYear = parseInt(endYear, 10);
        if (semesterType !== undefined) session.semesterType = semesterType;
        if (status !== undefined) session.status = status;
        if (programmes !== undefined) session.programmes = programmes;

        session.name = Session.formatSessionName(session.startMonth, session.startYear, session.endMonth, session.endYear);
        session.academicYear = `${session.startYear}-${session.endYear}`;

        if (isManualCurrent !== undefined) {
            if (isManualCurrent) {
                await Session.updateMany({ _id: { $ne: id } }, { isManualCurrent: false });
                session.isManualCurrent = true;
            } else {
                session.isManualCurrent = false;
            }
        }

        await session.save();

        return res.json({
            message: `Session '${session.name}' updated successfully.`,
            session
        });
    } catch (error) {
        console.error('Error updating session:', error);
        return res.status(500).json({ message: 'Failed to update session', error: error.message });
    }
};

/**
 * Delete a session
 */
exports.deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await Session.findById(id);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Count linked teams or panels
        const teamCount = await Team.countDocuments({ session: id });
        if (teamCount > 0 && req.query.force !== 'true') {
            return res.status(400).json({
                message: `This session has ${teamCount} active teams. Confirm deletion to remove it and related records.`,
                requiresForce: true
            });
        }

        // Cascade delete session-scoped data if forced
        await Team.deleteMany({ session: id });
        try {
            const TimeTable = require('../models/TimeTable');
            const Panel = require('../models/Panel');
            const MarkingScheme = require('../models/MarkingScheme');
            const TeamPanelAssignment = require('../models/TeamPanelAssignment');
            const Attendance = require('../models/Attendance');
            const FinalReport = require('../models/FinalReport');
            const InstructionTemplate = require('../models/InstructionTemplate');
            const DesignationTeamLimit = require('../models/DesignationTeamLimit');
            const Programme = require('../models/Programme');

            await TimeTable.deleteMany({ session: id });
            await Panel.deleteMany({ session: id });
            await MarkingScheme.deleteMany({ session: id });
            await TeamPanelAssignment.deleteMany({ session: id });
            await Attendance.deleteMany({ session: id });
            await FinalReport.deleteMany({ session: id });
            await InstructionTemplate.deleteMany({ session: id });
            await DesignationTeamLimit.deleteMany({ session: id });
            await Config.deleteMany({ session: id });
            await Programme.deleteMany({ session: id });
            await User.deleteMany({ session: id, role: 'student' });
        } catch (e) {
            console.error('Error during session cascade cleanup:', e);
        }
        await Session.findByIdAndDelete(id);

        return res.json({ message: `Session '${session.name}' deleted successfully.` });
    } catch (error) {
        console.error('Error deleting session:', error);
        return res.status(500).json({ message: 'Failed to delete session', error: error.message });
    }
};

/**
 * Toggle session status between 'active' and 'paused' (Admin control)
 */
exports.toggleSessionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await Session.findById(id);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const newStatus = session.status === 'active' ? 'paused' : 'active';
        session.status = newStatus;
        await session.save();

        return res.json({
            message: `Session status changed to '${newStatus}'.`,
            status: newStatus,
            session
        });
    } catch (error) {
        console.error('Error toggling session status:', error);
        return res.status(500).json({ message: 'Failed to toggle session status', error: error.message });
    }
};

/**
 * Rollover UG Data from an Odd Semester session into an Even Semester session.
 * Copies:
 * - UG Students
 * - UG Teams (name, leader, members, member status, isLocked, guide preference, approved guide status)
 * Does NOT copy:
 * - PG Students / Teams (they start from scratch each semester)
 * - Marks, Attendance, Reviews, Timetables (fresh start in Even semester)
 */
exports.rolloverUgData = async (req, res) => {
    try {
        const { fromSessionId, toSessionId } = req.body;

        if (!fromSessionId || !toSessionId) {
            return res.status(400).json({ message: 'Source (fromSessionId) and Target (toSessionId) sessions are required.' });
        }

        if (fromSessionId === toSessionId) {
            return res.status(400).json({ message: 'Source and Target sessions must be different.' });
        }

        const fromSession = await Session.findById(fromSessionId);
        const toSession = await Session.findById(toSessionId);

        if (!fromSession || !toSession) {
            return res.status(404).json({ message: 'One or both sessions were not found.' });
        }

        // Fetch all UG teams from source session
        const ugRegex = /^(b\.?e\.?|ug)/i;
        const sourceUgTeams = await Team.find({
            session: fromSessionId,
            $or: [
                { programme: { $regex: ugRegex } },
                { programme: 'B.E. CSE' }
            ]
        });

        let copiedTeams = 0;
        let skippedTeams = 0;

        for (const team of sourceUgTeams) {
            // Check if team already exists in target session
            const existing = await Team.findOne({
                session: toSessionId,
                teamName: team.teamName,
                programme: team.programme
            });

            if (existing) {
                skippedTeams++;
                continue;
            }

            const newTeam = new Team({
                teamName: team.teamName,
                teamLeader: team.teamLeader,
                members: team.members,
                memberStatus: team.memberStatus,
                isTeamComplete: team.isTeamComplete,
                isLocked: team.isLocked,
                guidePreference: team.guidePreference,
                rejectedGuides: [],
                status: team.status,
                programme: team.programme,
                session: toSessionId
            });

            await newTeam.save();
            copiedTeams++;
        }

        return res.json({
            message: `UG Rollover completed successfully. Copied ${copiedTeams} teams (${skippedTeams} already existed in target session).`,
            copiedTeams,
            skippedTeams
        });
    } catch (error) {
        console.error('Error rolling over UG data:', error);
        return res.status(500).json({ message: 'Failed to perform UG rollover', error: error.message });
    }
};
