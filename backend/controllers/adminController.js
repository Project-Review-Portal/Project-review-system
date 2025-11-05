const Config = require('../models/Config');
const Team = require('../models/Team');
const User = require('../models/User');
const Panel = require('../models/Panel');
const TimeTable = require('../models/TimeTable');
const Attendance = require('../models/Attendance');
const Availability = require('../models/Availability');
const Mark = require('../models/Mark');

// Define daily review periods (9 periods of 40 minutes with 10 min break)
const dailyPeriods = [
    { start: "03:30", end: "04:10" },
    { start: "04:20", end: "05:00" },
    { start: "05:10", end: "05:50" },
    { start: "06:00", end: "06:40" },
    { start: "06:50", end: "07:30" },
    { start: "08:30", end: "09:10" },
    { start: "09:20", end: "10:00" },
    { start: "10:10", end: "10:50" },
    { start: "11:00", end: "11:40" }
];

// Helper to check if a specific time slot (start/end) overlaps with another slot
const doSlotsOverlap = (slot1Start, slot1End, slot2Start, slot2End) => {
    return slot1Start < slot2End && slot2Start < slot1End;
};

// Helper: Determine if a team has completed a given review ('review1' | 'review2' | 'review3')
const hasTeamCompletedReview = async (teamId, reviewKey) => {
    if (!['review1','review2','review3'].includes(reviewKey)) return false;
    const record = await Attendance.findOne({ team: teamId }).lean();
    if (!record || !Array.isArray(record.studentAttendances) || record.studentAttendances.length === 0) return false;
    // Completed only if ALL team members marked true for that review
    return record.studentAttendances.every(sa => !!sa[reviewKey]);
};

// Helper: Validate prerequisite chain for target slotType
const validatePrerequisiteForSlotType = async (teamId, slotType) => {
    if (slotType === 'review2') {
        const ok = await hasTeamCompletedReview(teamId, 'review1');
        if (!ok) return { ok: false, message: 'Team must complete review1 before scheduling review2' };
    }
    if (slotType === 'review3') {
        const ok = await hasTeamCompletedReview(teamId, 'review2');
        if (!ok) return { ok: false, message: 'Team must complete review2 before scheduling review3' };
    }
    return { ok: true };
};

// Helper to create a Date object with a specific time from a string (e.g., "09:00")
const createDateWithTime = (date, timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setUTCHours(hours, minutes, 0, 0);
    return newDate;
};

// Helper to check if a user is available in a given period on a specific date
const isUserAvailableInPeriod = (userAvailabilitySlots, startTime, endTime) => {
    if (!userAvailabilitySlots || !Array.isArray(userAvailabilitySlots) || userAvailabilitySlots.length === 0) {
        return false;
    }

    const proposedStart = startTime instanceof Date ? startTime : new Date(startTime);
    const proposedEnd = endTime instanceof Date ? endTime : new Date(endTime);

    return userAvailabilitySlots.some(slot => {
        const slotStart = new Date(slot.startTime);
        const slotEnd = new Date(slot.endTime);
        console.log(`Checking overlap: Proposed [${proposedStart.toISOString()}-${proposedEnd.toISOString()}] vs Availability [${slotStart.toISOString()}-${slotEnd.toISOString()}]`);
        console.log(`Timestamps: Proposed [${proposedStart.getTime()}-${proposedEnd.getTime()}] vs Availability [${slotStart.getTime()}-${slotEnd.getTime()}]`);
        return doSlotsOverlap(proposedStart, proposedEnd, slotStart, slotEnd);
    });
};

// Helper to check for clashes with existing TimeTable entries for a given user
const doesUserHaveClash = async (userId, proposedStartTime, proposedEndTime, existingSchedules) => {
    console.log(`doesUserHaveClash called for user ${userId}. Proposed: [${proposedStartTime.toISOString()}-${proposedEndTime.toISOString()}]. Checking against ${existingSchedules.length} existing schedules.`);
    const foundClash = existingSchedules.some(schedule => {
        const scheduleStartTime = new Date(schedule.startTime);
        const scheduleEndTime = new Date(schedule.endTime);
        const overlaps = doSlotsOverlap(proposedStartTime, proposedEndTime, scheduleStartTime, scheduleEndTime);
        if (overlaps) {
            console.log(`CLASH DETECTED: User ${userId} Proposed [${proposedStartTime.toISOString()}-${proposedEndTime.toISOString()}] vs Existing Schedule [${schedule.team}, ${schedule.panel}, ${scheduleStartTime.toISOString()}-${scheduleEndTime.toISOString()}]`);
        }
        return overlaps;
    });
    if (foundClash) {
        console.log(`User ${userId} has a clash with an existing schedule.`);
    } else {
        console.log(`User ${userId} has NO clash with any existing schedule.`);
    }
    return foundClash;
};

exports.setMaxTeamSize = async (req, res) => {
    try {
        const { maxTeamSize } = req.body;

        if (!maxTeamSize || maxTeamSize < 1) {
            return res.status(400).json({ message: 'Invalid team size' });
        }

        let config = await Config.findOne();
        if (!config) {
            config = new Config({ maxTeamSize });
        } else {
            config.maxTeamSize = maxTeamSize;
        }

        await config.save();
        res.json({ message: 'Team size updated successfully', config });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMaxTeamSize = async (req, res) => {
    try {
        const config = await Config.findOne();
        res.json({ maxTeamSize: config ? config.maxTeamSize : 4 });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.setGuideSelectionDates = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Both start and end dates are required' });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        if (start >= end) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        let config = await Config.findOne();
        if (!config) {
            config = new Config({ guideSelectionStartDate: start, guideSelectionEndDate: end, teamFormationOpen: true });
        } else {
            config.guideSelectionStartDate = start;
            config.guideSelectionEndDate = end;
            config.teamFormationOpen = true; // Keep team formation always open
        }

        await config.save();

        // Removed auto-creation of solo teams

        res.json({ message: 'Guide selection dates updated successfully', config });
    } catch (error) {
        console.error('Error setting guide selection dates:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getGuideSelectionDates = async (req, res) => {
    try {
        const config = await Config.findOne();
        res.json({
            startDate: config ? config.guideSelectionStartDate : null,
            endDate: config ? config.guideSelectionEndDate : null,
        });
    } catch (error) {
        console.error('Error fetching guide selection dates:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Ensure team formation is always open
exports.ensureTeamFormationOpen = async (req, res) => {
    try {
        let config = await Config.findOne();
        if (!config) {
            config = new Config({ teamFormationOpen: true });
        } else {
            config.teamFormationOpen = true;
        }
        await config.save();
        res.json({ message: 'Team formation is now open', config });
    } catch (error) {
        console.error('Error ensuring team formation is open:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get teams with no guide assigned
exports.getUnassignedTeams = async (req, res) => {
    try {
        const unassignedTeams = await Team.find({
            $or: [
                { guidePreference: null },
                { status: 'pending' },
                { status: 'rejected' }
            ]
        }).populate('teamLeader', 'username name').populate('members', 'username name');

        res.json(unassignedTeams);
    } catch (error) {
        console.error('Error fetching unassigned teams:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get guides with the count of teams assigned to them, sorted by count
exports.getGuidesWithTeamCounts = async (req, res) => {
    try {
        const guides = await User.find({ role: 'guide' }).select('username name');

        const guidesWithCounts = await Promise.all(guides.map(async (guide) => {
            const teamsAssigned = await Team.find({
                guidePreference: guide._id,
                status: 'approved'
            }).select('_id teamName'); // Select team _id and teamName

            return { 
                ...guide.toObject(), 
                teamCount: teamsAssigned.length, 
                assignedTeams: teamsAssigned // Add assigned teams array
            };
        }));

        // Sort in ascending order based on teamCount
        guidesWithCounts.sort((a, b) => a.teamCount - b.teamCount);

        // The third parameter 'fromBulkAssignment' is a flag to prevent sending a response when called internally
        if (req.originalUrl && req.originalUrl.includes('/guides-with-team-counts')) { // Only send response if it's a direct API call
            res.json(guidesWithCounts);
        } else { // This is for internal calls from assignAllUnassignedGuides
            return guidesWithCounts; // Return data directly
        }
    } catch (error) {
        console.error('Error fetching guides with team counts:', error);
        // Only send error response if it's a direct API call
        if (req.originalUrl && req.originalUrl.includes('/guides-with-team-counts')) {
            res.status(500).json({ message: 'Server error' });
        } else {
            throw error; // Re-throw for internal calls to handle
        }
    }
};

// Get eligible guides for a specific team (guides not rejected by this team)
exports.getEligibleGuidesForTeam = async (req, res) => {
    try {
        const { teamId } = req.params;
        const team = await Team.findById(teamId);

        if (!team) {
            return res.status(404).json({ message: 'Team not found.' });
        }

        const rejectedGuideIds = team.rejectedGuides || [];

        const eligibleGuides = await User.find({
            role: 'guide',
            _id: { $nin: rejectedGuideIds }
        }).select('username');

        res.json(eligibleGuides);
    } catch (error) {
        console.error('Error fetching eligible guides for team:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin assigns a guide to a team
exports.assignGuideToTeam = async (req, res) => {
    try {
        const { teamId, guideId } = req.body;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found.' });
        }

        const guide = await User.findById(guideId);
        if (!guide || !guide.roles.some(r => r.role === 'guide')) {
            return res.status(400).json({ message: 'Invalid guide ID or guide not found.' });
        }

        // Assign the guide and update status
        team.guidePreference = guideId;
        team.status = 'approved'; // Mark as approved by admin assignment
        await team.save();

        res.json({ message: 'Guide assigned to team successfully!', team });

    } catch (error) {
        console.error('Error assigning guide to team:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin assigns all unassigned teams to guides automatically
exports.assignAllUnassignedGuides = async (req, res) => {
    try {
        const unassignedTeams = await Team.find({
            $or: [
                { guidePreference: null },
                { status: 'pending' },
                { status: 'rejected' }
            ]
        }).select('_id');

        if (unassignedTeams.length === 0) {
            return res.status(200).json({ message: 'No unassigned teams found to auto-assign guides.' });
        }

        // Get all guides sorted by their current team count (ascending)
        const guidesByTeamCount = await exports.getGuidesWithTeamCounts(req, res, true); // Pass true for internal call

        if (!guidesByTeamCount || guidesByTeamCount.length === 0) {
            return res.status(404).json({ message: 'No guides available for assignment.' });
        }

        let assignedCount = 0;
        for (const team of unassignedTeams) {
            // Find a guide that has not rejected this team
            // Also, consider the existing rejectedGuides array on the team.
            const currentTeam = await Team.findById(team._id).select('rejectedGuides');
            const teamRejectedGuides = currentTeam ? currentTeam.rejectedGuides.map(id => id.toString()) : [];

            const eligibleAndAvailableGuide = guidesByTeamCount.find(guide => {
                // Ensure guide is not in the team's rejectedGuides list
                const isRejectedByTeam = teamRejectedGuides.includes(guide._id.toString());
                return !isRejectedByTeam;
            });

            if (eligibleAndAvailableGuide) {
                await Team.findByIdAndUpdate(team._id, {
                    guidePreference: eligibleAndAvailableGuide._id,
                    status: 'approved'
                });
                assignedCount++;

                // Re-sort guidesByTeamCount to reflect the new assignment and ensure even distribution
                const updatedGuideIndex = guidesByTeamCount.findIndex(g => g._id.toString() === eligibleAndAvailableGuide._id.toString());
                if (updatedGuideIndex !== -1) {
                    guidesByTeamCount[updatedGuideIndex].teamCount++;
                }
                guidesByTeamCount.sort((a, b) => a.teamCount - b.teamCount);
            } else {
                console.log(`No eligible guide found for team ${team._id}. Team's rejected guides: ${teamRejectedGuides}`);
            }
        }

        res.json({ message: `${assignedCount} unassigned teams have been assigned guides successfully.` });

    } catch (error) {
        console.error('Error assigning all unassigned guides:', error);
        res.status(500).json({ message: 'Server error during bulk assignment' });
    }
};

// Admin removes a guide from a team
exports.removeGuideFromTeam = async (req, res) => {
    try {
        const { teamId } = req.body;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found.' });
        }

        if (!team.guidePreference) {
            return res.status(400).json({ message: 'Team does not have an assigned guide.' });
        }

        // Remove the guide and set status back to pending
        team.guidePreference = null;
        team.status = 'pending';
        await team.save();

        res.json({ message: 'Guide removed from team successfully.', team });

    } catch (error) {
        console.error('Error removing guide from team:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all panels
exports.getAllPanels = async (req, res) => {
    try {
        const panels = await Panel.find()
            .populate('members', 'username name memberType')
            .populate('coordinator', 'username name');
        res.json(panels);
    } catch (error) {
        console.error('Error fetching panels:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new panel
exports.createPanel = async (req, res) => {
    try {
        const { name, members } = req.body;

        if (!name || !members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ message: 'Panel name and members are required.' });
        }

        // Verify all members are valid users and have a role of 'panel'
        const validMembers = await User.find({
            _id: { $in: members },
            role: 'panel'
        });

        if (validMembers.length !== members.length) {
            return res.status(400).json({ message: 'One or more members are invalid or not panel members.' });
        }

        const newPanel = new Panel({ name, members: validMembers.map(m => m._id) });
        await newPanel.save();

        res.status(201).json({ message: 'Panel created successfully!', panel: newPanel });

    } catch (error) {
        console.error('Error creating panel:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update an existing panel
exports.updatePanel = async (req, res) => {
    try {
        const { panelId } = req.params;
        const { name, members } = req.body;

        const panel = await Panel.findById(panelId);
        if (!panel) {
            return res.status(404).json({ message: 'Panel not found.' });
        }

        if (name) {
            panel.name = name;
        }

        if (members && Array.isArray(members)) {
            // Verify all members are valid users and have a role of 'panel'
            const validMembers = await User.find({
                _id: { $in: members },
                role: 'panel'
            });

            if (validMembers.length !== members.length) {
                return res.status(400).json({ message: 'One or more members are invalid or not panel members.' });
            }
            panel.members = validMembers.map(m => m._id);
        }

        await panel.save();
        res.json({ message: 'Panel updated successfully!', panel });

    } catch (error) {
        console.error('Error updating panel:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a panel
exports.deletePanel = async (req, res) => {
    try {
        const { panelId } = req.params;

        const panel = await Panel.findById(panelId);
        if (!panel) {
            return res.status(404).json({ message: 'Panel not found.' });
        }

        // Before deleting the panel, remove its assignment from any teams
        await Team.updateMany({ panel: panelId }, { $set: { panel: null } });

        await Panel.findByIdAndDelete(panelId);

        res.json({ message: 'Panel deleted successfully!' });

    } catch (error) {
        console.error('Error deleting panel:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get teams with no panel assigned
exports.getUnassignedPanelTeams = async (req, res) => {
    try {
        const teams = await Team.find({ panel: null, status: 'approved' })
            .populate('teamLeader', 'username name')
            .populate('guidePreference', 'username name');

        res.json(teams);
    } catch (error) {
        console.error('Error fetching unassigned panel teams:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Assign a panel to a team
exports.assignPanelToTeam = async (req, res) => {
    try {
        const { teamId, panelId } = req.body;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found.' });
        }

        const panel = await Panel.findById(panelId);
        if (!panel) {
            return res.status(404).json({ message: 'Panel not found.' });
        }

        team.panel = panelId;
        team.coordinator = panel.coordinator; // Assign the panel's coordinator to the team
        await team.save();

        res.json({ message: 'Panel assigned to team successfully!', team });

    } catch (error) {
        console.error('Error assigning panel to team:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Remove panel from a team
exports.removePanelFromTeam = async (req, res) => {
    try {
        const { teamId } = req.body;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found.' });
        }

        team.panel = null;
        team.coordinator = null;
        await team.save();

        res.json({ message: 'Panel removed from team successfully!', team });

    } catch (error) {
        console.error('Error removing panel from team:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get team panel assignments
exports.getTeamPanelAssignments = async (req, res) => {
    try {
        const assignments = await Team.find({ panel: { $ne: null } })
            .populate('teamLeader', 'username name')
            .populate('guidePreference', 'username name')
            .populate('panel', 'name members');

        res.json(assignments);

    } catch (error) {
        console.error('Error fetching team panel assignments:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Set review period dates
exports.setReviewPeriodDates = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Both start and end dates are required' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        if (start >= end) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        let config = await Config.findOne();
        if (!config) {
            config = new Config({ reviewPeriodStartDate: start, reviewPeriodEndDate: end });
        } else {
            config.reviewPeriodStartDate = start;
            config.reviewPeriodEndDate = end;
        }

        await config.save();
        res.json({ message: 'Review period dates updated successfully', config });

    } catch (error) {
        console.error('Error setting review period dates:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Get review period dates
exports.getReviewPeriodDates = async (req, res) => {
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

// Admin: Get review schedules for all panels
exports.getReviewSchedules = async (req, res) => {
    try {
        // Only return valid scheduled items with existing team and panel
        const schedules = await TimeTable.find({ status: 'scheduled' })
            .populate('team', 'teamName')
            .populate('panel', 'name')
            .sort({ startTime: 1 });
        // Filter out any entries with missing population (deleted refs)
        const filtered = schedules.filter(s => s.team && s.panel);
        res.json(filtered);
    } catch (error) {
        console.error('Error fetching review schedules:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Create a new review schedule
exports.createReviewSchedule = async (req, res) => {
    try {
        const { teamId, panelId, date, period, slotType } = req.body;

        if (!teamId || !panelId || !date || !period) {
            return res.status(400).json({ message: 'Team, panel, date, and period are required.' });
        }

        // Determine target slot type; default to review1 if not provided
        const targetSlot = slotType && ['review1','review2','review3','viva'].includes(slotType) ? slotType : 'review1';

        // Enforce prerequisites for review2/review3
        const prereq = await validatePrerequisiteForSlotType(teamId, targetSlot);
        if (!prereq.ok) {
            return res.status(400).json({ message: prereq.message });
        }

        // Convert date string to Date object (assuming YYYY-MM-DD format for consistency)
        const scheduleDate = new Date(date);
        if (isNaN(scheduleDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format.' });
        }

        // Basic check for existing schedule for the same team, panel, date, period
        const existingSchedule = await TimeTable.findOne({ team: teamId, panel: panelId, date: scheduleDate, period });
        if (existingSchedule) {
            return res.status(409).json({ message: 'A review schedule for this team, panel, date, and period already exists.' });
        }

        const newSchedule = new TimeTable({
            team: teamId,
            panel: panelId,
            date: scheduleDate,
            period,
            isNotified: false, // Default to false
            slotType: targetSlot,
            name: `${targetSlot} for ${teamId}`
        });

        await newSchedule.save();
        res.status(201).json({ message: 'Review schedule created successfully!', schedule: newSchedule });

    } catch (error) {
        console.error('Error creating review schedule:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Update a review schedule
exports.updateReviewSchedule = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { teamId, panelId, date, period, slotType } = req.body;

        const schedule = await TimeTable.findById(scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: 'Review schedule not found.' });
        }

        // Convert date string to Date object
        const updatedDate = new Date(date);
        if (isNaN(updatedDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format.' });
        }

        // Validate prerequisites if slotType provided/changed
        if (slotType && ['review1','review2','review3','viva'].includes(slotType)) {
            const prereq = await validatePrerequisiteForSlotType(teamId, slotType);
            if (!prereq.ok) {
                return res.status(400).json({ message: prereq.message });
            }
        }

        // Check for conflicts if team, panel, date, or period are being changed
        if (teamId !== schedule.team.toString() || panelId !== schedule.panel.toString() || updatedDate.toISOString().split('T')[0] !== schedule.date.toISOString().split('T')[0] || period !== schedule.period) {
            const conflict = await TimeTable.findOne({
                _id: { $ne: scheduleId },
                team: teamId,
                panel: panelId,
                date: updatedDate,
                period
            });
            if (conflict) {
                return res.status(409).json({ message: 'A conflicting review schedule already exists.' });
            }
        }

        schedule.team = teamId;
        schedule.panel = panelId;
        schedule.date = updatedDate;
        schedule.period = period;
        if (slotType && ['review1','review2','review3','viva'].includes(slotType)) {
            schedule.slotType = slotType;
        }
        if (schedule.slotType) {
            schedule.name = `${schedule.slotType} for ${schedule.team}`;
        }
        await schedule.save();

        res.json({ message: 'Review schedule updated successfully!', schedule });

    } catch (error) {
        console.error('Error updating review schedule:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Delete a review schedule
exports.deleteReviewSchedule = async (req, res) => {
    try {
        const { scheduleId } = req.params;

        const schedule = await TimeTable.findByIdAndDelete(scheduleId);

        if (!schedule) {
            return res.status(404).json({ message: 'Review schedule not found.' });
        }

        res.json({ message: 'Review schedule deleted successfully!' });

    } catch (error) {
        console.error('Error deleting review schedule:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Send schedule notification
exports.sendScheduleNotification = async (req, res) => {
    try {
        const { scheduleId } = req.body;

        const schedule = await TimeTable.findById(scheduleId);

        if (!schedule) {
            return res.status(404).json({ message: 'Review schedule not found.' });
        }

        schedule.isNotified = true;
        await schedule.save();

        res.json({ message: 'Schedule notification sent successfully!', schedule });

    } catch (error) {
        console.error('Error sending schedule notification:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Get All Availabilities for Admin View
exports.getAllAvailabilities = async (req, res) => {
    try {
        const availabilities = await Availability.find()
            .populate('user', 'name username role') // Populate user details
            .sort({ userRole: 1, 'user.username': 1 });

        res.json(availabilities);

    } catch (error) {
        console.error('Error fetching all availabilities:', error);
        res.status(500).json({ message: 'Error fetching all availabilities' });
    }
};

// Admin: Add new user for admin side
exports.addUser = async (req, res) => {
    const { username, password, role, name, memberType } = req.body;

    if (!username || !role || !name) {
        return res.status(400).json({ message: 'Please enter all required fields.' });
    }

    try {
        let existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ message: 'User already exists.' });
        }

        // Determine initial plaintext password
        let initialPassword = password;
        if (role === 'student') {
            // Default student password is <rollno>@cs
            initialPassword = initialPassword && initialPassword.trim().length > 0 ? initialPassword : `${username}@cs`;
        } else if (!initialPassword || initialPassword.trim().length === 0) {
            return res.status(400).json({ message: 'Password is required for non-student users.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(initialPassword, salt);

        const user = new User({ username, password: hashedPassword, role, name, memberType });
        await user.save();

        res.status(201).json({ message: 'User registered successfully.', user: { id: user._id, username: user.username, role: user.role, name: user.name, memberType: user.memberType } });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Delete a user
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const userObjectId = user._id;

        // Check if user is a faculty member (guide, panel, coordinator)
        const hasFacultyRole = user.roles.some(role => ['guide', 'panel', 'coordinator'].includes(role.role));
        const isStudent = user.roles.some(role => role.role === 'student');

        if (hasFacultyRole) {
            // Handle faculty deletion with cascading deletes
            
            // 1) Delete ALL teams where this faculty is the assigned guide
            const teamsGuided = await Team.find({ guidePreference: userObjectId }).select('_id');
            const teamIdsGuided = teamsGuided.map(t => t._id);

            if (teamIdsGuided.length > 0) {
                // Cascade delete related data for these teams
                try { await TimeTable.deleteMany({ team: { $in: teamIdsGuided } }); } catch (e) {}
                try { await Mark.deleteMany({ team: { $in: teamIdsGuided } }); } catch (e) {}
                try { await Attendance.deleteMany({ team: { $in: teamIdsGuided } }); } catch (e) {}
                try { const FinalReport = require('../models/FinalReport'); await FinalReport.deleteMany({ team: { $in: teamIdsGuided } }); } catch (e) {}
                try { const TeamPanelAssignment = require('../models/TeamPanelAssignment'); await TeamPanelAssignment.updateMany({}, { $pull: { teams: { $in: teamIdsGuided } } }); } catch (e) {}
                await Team.deleteMany({ _id: { $in: teamIdsGuided } });
            }

            // 2) Remove this faculty from any panel memberships and coordinator positions
            try { await Panel.updateMany({ members: userObjectId }, { $pull: { members: userObjectId } }); } catch (e) {}
            try { await Panel.updateMany({ coordinator: userObjectId }, { $set: { coordinator: null } }); } catch (e) {}

            // 3) Delete availability records for this faculty
            try { await Availability.deleteMany({ user: userObjectId }); } catch (e) {}

            // 4) Delete marks given by this faculty
            try { await Mark.deleteMany({ markedBy: userObjectId }); } catch (e) {}

            // 5) Update attendance records to remove this faculty as guide
            try { await Attendance.updateMany({ guide: userObjectId }, { $set: { guide: null } }); } catch (e) {}

            // 6) Update final reports to remove this faculty as approver
            try { const FinalReport = require('../models/FinalReport'); await FinalReport.updateMany({ approvedBy: userObjectId }, { $set: { approvedBy: null } }); } catch (e) {}

            // 7) Update time table entries to remove this faculty as slot assigner
            try { await TimeTable.updateMany({ slotAssignedBy: userObjectId }, { $set: { slotAssignedBy: null } }); } catch (e) {}

        } else if (isStudent) {
            // Handle student deletion with cascading deletes
            
            // 1) Remove this student from all teams (members and leader)
            await Team.updateMany({ members: userObjectId }, { $pull: { members: userObjectId } });
            await Team.updateMany({ teamLeader: userObjectId }, { $set: { teamLeader: null } });

            // 2) Find teams that are now empty (no leader and no members) and delete them with cascade
            const orphanTeams = await Team.find({ $or: [ { members: { $size: 0 } }, { members: { $exists: false } } ], teamLeader: null }).select('_id');
            const orphanIds = orphanTeams.map(t => t._id);
            if (orphanIds.length > 0) {
                try { await TimeTable.deleteMany({ team: { $in: orphanIds } }); } catch (e) {}
                try { await Mark.deleteMany({ team: { $in: orphanIds } }); } catch (e) {}
                try { await Attendance.deleteMany({ team: { $in: orphanIds } }); } catch (e) {}
                try { const FinalReport = require('../models/FinalReport'); await FinalReport.deleteMany({ team: { $in: orphanIds } }); } catch (e) {}
                try { const TeamPanelAssignment = require('../models/TeamPanelAssignment'); await TeamPanelAssignment.updateMany({}, { $pull: { teams: { $in: orphanIds } } }); } catch (e) {}
                await Team.deleteMany({ _id: { $in: orphanIds } });
            }

            // 3) Clean student-specific data
            try { await Mark.deleteMany({ student: userObjectId }); } catch (e) {}
            try { await Attendance.updateMany({}, { $pull: { 'studentAttendances': { student: userObjectId } } }); } catch (e) {}

        } else {
            // Handle other user types (admin, etc.) - minimal cleanup
            try { await Availability.deleteMany({ user: userObjectId }); } catch (e) {}
        }

        // Finally delete the user
        await User.findByIdAndDelete(userObjectId);
        res.json({ message: 'User and all related data deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Get attendance records (original implementation)
exports.getAttendanceRecords = async (req, res) => {
    try {
        const attendanceRecords = await Attendance.find({ attendanceType: 'session' })
            .populate('panel', 'name')
            .populate('recordedBy', 'name')
            .populate('studentAttendances.student', 'name username');

        res.json(attendanceRecords);
    } catch (error) {
        console.error('Error fetching attendance records:', error);
        res.status(500).json({ message: 'Error fetching attendance records' });
    }
};

// Admin: Get daily attendance and marks records for all teams (for admin view)
exports.getDailyAttendanceRecords = async (req, res) => {
    try {
        const teams = await Team.find({})
            .populate('teamLeader', 'name')
            .populate('members', 'name')
            .populate('guidePreference', 'name')
            .populate('panel', 'name');

        const studentData = [];

        for (const team of teams) {
            const attendanceRecord = await Attendance.findOne({ team: team._id });

            // Create a combined list of all team members including the team leader
            const allTeamMembers = [];
            
            // Add team leader if exists
            if (team.teamLeader) {
                allTeamMembers.push(team.teamLeader);
            }
            
            // Add regular members
            allTeamMembers.push(...team.members);

            for (const member of allTeamMembers) {
                let presentCount = 0;
                const totalEvents = 4; // review1, review2, review3, viva

                if (attendanceRecord) {
                    const studentAtt = attendanceRecord.studentAttendances.find(
                        sa => sa.student.toString() === member._id.toString()
                    );
                    if (studentAtt) {
                        if (studentAtt.review1) presentCount++;
                        if (studentAtt.review2) presentCount++;
                        if (studentAtt.review3) presentCount++;
                        if (studentAtt.viva) presentCount++;
                    }
                }

                const attendancePercentage = ((presentCount / totalEvents) * 100).toFixed(2);

                const marks = await Mark.find({ student: member._id, team: team._id });
                
                let totalPercentageSum = 0;
                if (marks.length > 0) {
                    marks.forEach(mark => {
                        totalPercentageSum += mark.percentage;
                    });
                }

                const averageMarks = marks.length > 0 ? (totalPercentageSum / marks.length).toFixed(2) : 'N/A';

                studentData.push({
                    studentId: member._id,
                    studentName: member.name,
                    teamName: team.teamName,
                    guideName: team.guidePreference ? team.guidePreference.name : 'N/A',
                    panelName: team.panel ? team.panel.name : 'N/A',
                    attendancePercentage: attendancePercentage,
                    averageMarks: averageMarks
                });
            }
        }

        res.json(studentData);
    } catch (error) {
        console.error('Error in getDailyAttendanceRecords:', error);
        res.status(500).json({ message: 'Error fetching daily attendance and marks records' });
    }
};

// Admin: Get all teams
exports.getAllTeams = async (req, res) => {
    try {
        const teams = await Team.find()
            .populate('teamLeader', 'username name')
            .populate('members', 'username name')
            .populate('guidePreference', 'username name')
            .populate({
                path: 'panel',
                populate: {
                    path: 'members',
                    select: 'username name memberType'
                }
            });
        res.json(teams);
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Delete a single team by id (and clean references)
exports.deleteTeam = async (req, res) => {
    try {
        const { teamId } = req.params;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found.' });
        }

        // Clean related references
        try {
            await TimeTable.deleteMany({ team: teamId });
        } catch (e) {}
        try {
            const TeamPanelAssignment = require('../models/TeamPanelAssignment');
            await TeamPanelAssignment.updateMany({}, { $pull: { teams: teamId } });
        } catch (e) {}
        try {
            const FinalReport = require('../models/FinalReport');
            await FinalReport.deleteMany({ team: teamId });
        } catch (e) {}
        try {
            await Attendance.deleteMany({ team: teamId });
        } catch (e) {}

        // Finally delete the team
        await Team.findByIdAndDelete(teamId);

        return res.json({ message: 'Team deleted successfully.' });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ message: 'Error deleting team' });
    }
};

// Admin: Generate schedules automatically
exports.generateSchedules = async (req, res) => {
    try {
        // Accept optional slotType to generate for a specific review stage; default to review1
        const targetSlot = req.body && ['review1','review2','review3','viva'].includes(req.body.slotType) ? req.body.slotType : 'review1';

        // Get all teams that need schedules
        const teams = await Team.find({ status: 'approved' })
            .populate('guidePreference', 'username')
            .populate('panel', 'name');

        // Get all panel members' availabilities
        const panelAvailabilities = await Availability.find({ userRole: 'panel' })
            .populate('user', 'username');

        // Get review period dates
        const config = await Config.findOne();
        if (!config || !config.reviewPeriodStartDate || !config.reviewPeriodEndDate) {
            return res.status(400).json({ message: 'Review period dates not set' });
        }

        const startDate = new Date(config.reviewPeriodStartDate);
        const endDate = new Date(config.reviewPeriodEndDate);

        // Generate schedules for each team
        const generatedSchedules = [];
        for (const team of teams) {
            // Find available panel members for this team
            const availablePanelMembers = panelAvailabilities.filter(avail => 
                avail.user._id.toString() !== team.guidePreference?._id.toString()
            );

            // Try to find a suitable time slot
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                // Skip weekends
                if (date.getDay() === 0 || date.getDay() === 6) continue;

                for (const period of dailyPeriods) {
                    const startTime = createDateWithTime(date, period.start);
                    const endTime = createDateWithTime(date, period.end);

                    // Check if any panel members are available
                    const availableMembers = availablePanelMembers.filter(avail => 
                        isUserAvailableInPeriod(avail.slots, startTime, endTime)
                    );

                    if (availableMembers.length > 0) {
                        // Create schedule for this team
                        const schedule = new TimeTable({
                            team: team._id,
                            panel: team.panel,
                            date: date,
                            period: `${period.start}-${period.end}`,
                            isNotified: false,
                            slotType: targetSlot,
                            name: `${targetSlot} for ${team.teamName || team._id}`
                        });

                        await schedule.save();
                        generatedSchedules.push(schedule);
                        break; // Move to next team
                    }
                }
            }
        }

        res.json({ 
            message: `Generated ${generatedSchedules.length} schedules successfully`,
            schedules: generatedSchedules
        });

    } catch (error) {
        console.error('Error generating schedules:', error);
        res.status(500).json({ message: 'Error generating schedules' });
    }
};

// Admin: Generate a single slot for a team
exports.generateSlotForTeam = async (req, res) => {
    try {
        const { teamId, slotType } = req.body;

        const team = await Team.findById(teamId)
            .populate('guidePreference', 'username')
            .populate('panel', 'name');

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Decide target slot type; default to review1
        const targetSlot = slotType && ['review1','review2','review3','viva'].includes(slotType) ? slotType : 'review1';

        // Enforce prerequisites
        const prereq = await validatePrerequisiteForSlotType(team._id, targetSlot);
        if (!prereq.ok) {
            return res.status(400).json({ message: prereq.message });
        }

        // Get panel members' availabilities
        const panelAvailabilities = await Availability.find({ userRole: 'panel' })
            .populate('user', 'username');

        // Get review period dates
        const config = await Config.findOne();
        if (!config || !config.reviewPeriodStartDate || !config.reviewPeriodEndDate) {
            return res.status(400).json({ message: 'Review period dates not set' });
        }

        const startDate = new Date(config.reviewPeriodStartDate);
        const endDate = new Date(config.reviewPeriodEndDate);

        // Find available panel members for this team
        const availablePanelMembers = panelAvailabilities.filter(avail => 
            avail.user._id.toString() !== team.guidePreference?._id.toString()
        );

        // Try to find a suitable time slot
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            for (const period of dailyPeriods) {
                const startTime = createDateWithTime(date, period.start);
                const endTime = createDateWithTime(date, period.end);

                // Check if any panel members are available
                const availableMembers = availablePanelMembers.filter(avail => 
                    isUserAvailableInPeriod(avail.slots, startTime, endTime)
                );

                if (availableMembers.length > 0) {
                    // Create schedule for this team
                    const schedule = new TimeTable({
                    team: team._id,
                        panel: team.panel,
                        date: date,
                        period: `${period.start}-${period.end}`,
                        isNotified: false,
                        slotType: targetSlot,
                        name: `${targetSlot} for ${team.teamName || team._id}`
                    });

                    await schedule.save();
                    return res.json({ 
                        message: 'Schedule generated successfully',
                        schedule
                    });
                }
            }
        }

        res.status(404).json({ message: 'No suitable time slot found' });

    } catch (error) {
        console.error('Error generating slot for team:', error);
        res.status(500).json({ message: 'Error generating slot for team' });
    }
};

// Admin: Clear all schedules
exports.clearSchedules = async (req, res) => {
    try {
        // Only keep schedules that are linked to existing teams and panels
        await TimeTable.deleteMany({ $or: [ { team: { $exists: false } }, { panel: { $exists: false } } ] });
        // Additionally, remove any schedules whose referenced team or panel no longer exists
        const all = await TimeTable.find({});
        const toDelete = [];
        for (const s of all) {
            const teamExists = await Team.exists({ _id: s.team });
            const panelExists = await Panel.exists({ _id: s.panel });
            if (!teamExists || !panelExists) toDelete.push(s._id);
        }
        if (toDelete.length > 0) {
            await TimeTable.deleteMany({ _id: { $in: toDelete } });
        }
        res.json({ message: 'All schedules cleared successfully' });
    } catch (error) {
        console.error('Error clearing schedules:', error);
        res.status(500).json({ message: 'Error clearing schedules' });
    }
};

// Get all teams with their assigned guides
exports.getAssignedTeamsSummary = async (req, res) => {
    try {
        const assignedTeams = await Team.find({
            status: 'approved',
            guidePreference: { $ne: null }
        })
        .populate('guidePreference', 'name')
        .select('teamName guidePreference');

        res.json(assignedTeams);
    } catch (error) {
        console.error('Error fetching assigned teams summary:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// User Management Functions
const bcrypt = require('bcryptjs');

// Upload faculty from CSV (email-based)
exports.uploadFaculty = async (req, res) => {
    try {
        const { facultyData } = req.body;
        let count = 0;

        if (!Array.isArray(facultyData)) {
            return res.status(400).json({ message: 'Invalid payload: facultyData must be an array' });
        }

        for (const faculty of facultyData) {
            try {
                // Expect email_id, name, memberType
                const emailId = faculty.email_id || faculty.email || faculty.facultyId;
                const { name, memberType, designation } = faculty;

                // Validate required fields
                if (!emailId || !name) {
                    console.warn('Skipping faculty record with missing required fields:', faculty);
                    continue;
                }

                // Normalize and validate memberType (internal/external)
                let normalizedMemberType = null;
                if (typeof memberType === 'string' && memberType.trim().length > 0) {
                    const mt = memberType.trim().toLowerCase();
                    if (mt === 'internal' || mt === 'external') {
                        normalizedMemberType = mt;
                    } else {
                        console.warn(`Invalid memberType '${memberType}' for faculty ${emailId}. Expected 'internal' or 'external'. Defaulting to 'internal'.`);
                        normalizedMemberType = 'internal';
                    }
                } else {
                    // Default to internal if not provided
                    normalizedMemberType = 'internal';
                }

                // Check if user already exists
                const existingUser = await User.findOne({ $or: [{ username: emailId }, { email: emailId }] });
                if (existingUser) {
                    continue; // Skip if user already exists
                }

                // Hash password (default faculty password: local-part of email)
                const localPart = String(emailId).split('@')[0] || String(emailId);
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(localPart, salt);

                // Create user with default faculty role (store designation if provided)
                const user = new User({
                    username: emailId, // use email as username for faculty
                    name,
                    designation: designation || '',
                    email: emailId,
                    password: hashedPassword,
                    role: 'guide',
                    roles: [{ role: 'guide', team: null }],
                    memberType: normalizedMemberType,
                    mustChangePassword: true
                });

                await user.save();
                count++;
            } catch (e) {
                console.error('Failed to create faculty user:', faculty, e.message);
                // continue with next row instead of failing the whole request
                continue;
            }
        }

        res.json({ message: `Successfully uploaded ${count} faculty members`, count });
    } catch (error) {
        console.error('Error uploading faculty:', error);
        res.status(500).json({ message: 'Error uploading faculty data' });
    }
};

// Upload students from CSV (add email support; keep username = regno)
exports.uploadStudents = async (req, res) => {
    try {
        const { studentData } = req.body;
        let count = 0;

        if (!Array.isArray(studentData)) {
            return res.status(400).json({ message: 'Invalid payload: studentData must be an array' });
        }

        for (const student of studentData) {
            const { regno, name } = student;
            const emailId = student.email || student.email_id || null;

            // Validate required fields
            if (!regno || !name) {
                console.warn('Skipping student record with missing required fields:', student);
                continue;
            }

            // Check if user already exists
            const existingUser = await User.findOne({ username: regno });
            if (existingUser) {
                continue; // Skip if user already exists
            }

            // Hash password (default student password: <regno>@cs)
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(`${regno}@cs`, salt);

            // Create user
            const user = new User({
                username: regno, // keep regno as username for existing flows
                name,
                email: emailId,
                password: hashedPassword,
                role: 'student',
                roles: [{ role: 'student', team: null }],
                mustChangePassword: true
            });

            await user.save();
            count++;
        }

        res.json({ message: `Successfully uploaded ${count} students`, count });
    } catch (error) {
        console.error('Error uploading students:', error);
        res.status(500).json({ message: 'Error uploading student data' });
    }
};

// Update faculty member (identifier can be email or username)
exports.updateFaculty = async (req, res) => {
    try {
        const { facultyId } = req.params; // can be email or username
        const { name } = req.body;

        console.log('Updating faculty with identifier:', facultyId, 'and name:', name);

        const user = await User.findOne({ $or: [{ username: facultyId }, { email: facultyId }] });
        if (!user) {
            console.log('Faculty not found with identifier:', facultyId);
            return res.status(404).json({ message: `Faculty member with identifier ${facultyId} not found` });
        }

        // Check if user is actually a faculty member
        const hasFacultyRole = user.roles.some(role => ['guide', 'panel', 'coordinator'].includes(role.role));
        if (!hasFacultyRole) {
            return res.status(400).json({ message: `User ${facultyId} is not a faculty member` });
        }

        // Update user
        user.name = name;
        // If identifier is email and user has no email saved, set it
        if (!user.email && facultyId.includes('@')) {
            user.email = facultyId;
        }

        await user.save();
        res.json({ message: 'Faculty member updated successfully' });
    } catch (error) {
        console.error('Error updating faculty:', error);
        res.status(500).json({ message: 'Error updating faculty member' });
    }
};

// Update student
exports.updateStudent = async (req, res) => {
    try {
        const { regno } = req.params;
        const { name } = req.body;

        console.log('Updating student with regno:', regno, 'and name:', name);

        const user = await User.findOne({ username: regno });
        if (!user) {
            console.log('Student not found with regno:', regno);
            return res.status(404).json({ message: `Student with registration number ${regno} not found` });
        }

        // Check if user is actually a student
        const isStudent = user.roles.some(role => role.role === 'student');
        if (!isStudent) {
            return res.status(400).json({ message: `User ${regno} is not a student` });
        }

        // Update user
        user.name = name;
        user.roles = [{ role: 'student', team: null }];

        await user.save();
        res.json({ message: 'Student updated successfully' });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ message: 'Error updating student' });
    }
};

// Delete faculty member (identifier can be email or username)
exports.deleteFaculty = async (req, res) => {
    try {
        const { facultyId } = req.params; // can be email or username

        const user = await User.findOne({ $or: [{ username: facultyId }, { email: facultyId }] });
        if (!user) {
            return res.status(404).json({ message: 'Faculty member not found' });
        }

        // Check if user has faculty roles
        const hasFacultyRole = user.roles.some(role => ['guide', 'panel', 'coordinator'].includes(role.role));
        if (!hasFacultyRole) {
            return res.status(400).json({ message: 'User is not a faculty member' });
        }

        const facultyObjectId = user._id;

        // 1) Delete ALL teams where this faculty is the assigned guide
        const teamsGuided = await Team.find({ guidePreference: facultyObjectId }).select('_id');
        const teamIdsGuided = teamsGuided.map(t => t._id);

        if (teamIdsGuided.length > 0) {
            // Cascade delete related data for these teams
            try { await TimeTable.deleteMany({ team: { $in: teamIdsGuided } }); } catch (e) {}
            try { await Mark.deleteMany({ team: { $in: teamIdsGuided } }); } catch (e) {}
            try { await Attendance.deleteMany({ team: { $in: teamIdsGuided } }); } catch (e) {}
            try { const FinalReport = require('../models/FinalReport'); await FinalReport.deleteMany({ team: { $in: teamIdsGuided } }); } catch (e) {}
            try { const TeamPanelAssignment = require('../models/TeamPanelAssignment'); await TeamPanelAssignment.updateMany({}, { $pull: { teams: { $in: teamIdsGuided } } }); } catch (e) {}
            await Team.deleteMany({ _id: { $in: teamIdsGuided } });
        }

        // 2) Remove this faculty from any panel memberships and coordinator positions
        try { await Panel.updateMany({ members: facultyObjectId }, { $pull: { members: facultyObjectId } }); } catch (e) {}
        try { await Panel.updateMany({ coordinator: facultyObjectId }, { $set: { coordinator: null } }); } catch (e) {}

        // Finally delete the faculty user
        await User.deleteOne({ _id: facultyObjectId });
        res.json({ message: 'Faculty member and related team data deleted successfully' });
    } catch (error) {
        console.error('Error deleting faculty:', error);
        res.status(500).json({ message: 'Error deleting faculty member' });
    }
};

// Delete student
exports.deleteStudent = async (req, res) => {
    try {
        const { regno } = req.params;

        const user = await User.findOne({ username: regno });
        if (!user) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check if user is a student
        const isStudent = user.roles.some(role => role.role === 'student');
        if (!isStudent) {
            return res.status(400).json({ message: 'User is not a student' });
        }

        const studentId = user._id;

        // Remove this student from all teams (members and leader)
        await Team.updateMany({ members: studentId }, { $pull: { members: studentId } });
        await Team.updateMany({ teamLeader: studentId }, { $set: { teamLeader: null } });

        // Find teams that are now empty (no leader and no members) and delete them with cascade
        const orphanTeams = await Team.find({ $or: [ { members: { $size: 0 } }, { members: { $exists: false } } ], teamLeader: null }).select('_id');
        const orphanIds = orphanTeams.map(t => t._id);
        if (orphanIds.length > 0) {
            try { await TimeTable.deleteMany({ team: { $in: orphanIds } }); } catch (e) {}
            try { await Mark.deleteMany({ team: { $in: orphanIds } }); } catch (e) {}
            try { await Attendance.deleteMany({ team: { $in: orphanIds } }); } catch (e) {}
            try { const FinalReport = require('../models/FinalReport'); await FinalReport.deleteMany({ team: { $in: orphanIds } }); } catch (e) {}
            try { const TeamPanelAssignment = require('../models/TeamPanelAssignment'); await TeamPanelAssignment.updateMany({}, { $pull: { teams: { $in: orphanIds } } }); } catch (e) {}
            await Team.deleteMany({ _id: { $in: orphanIds } });
        }

        // Clean student-specific data
        try { await Mark.deleteMany({ student: studentId }); } catch (e) {}
        try { await Attendance.updateMany({}, { $pull: { 'studentAttendances': { student: studentId } } }); } catch (e) {}

        // Finally delete the user
        await User.deleteOne({ _id: studentId });
        res.json({ message: 'Student and related team data deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ message: 'Error deleting student' });
    }
}; 

// Get all faculty
exports.getAllFaculty = async (req, res) => {
    try {
        const includeExternal = String(req.query.includeExternal || '').toLowerCase() === 'true';
        const match = { 'roles.role': { $in: ['guide', 'panel', 'coordinator'] } };
        if (!includeExternal) {
            match.memberType = 'internal';
        }
        // Include email and designation in the response so frontend can display the correct fields
        const faculty = await User.find(match).select('username name roles memberType email designation');
        res.json(faculty);
    } catch (error) {
        console.error('Error fetching faculty:', error);
        res.status(500).json({ message: 'Error fetching faculty' });
    }
};

// Get coordinators without panels
exports.getUnassignedCoordinators = async (req, res) => {
    try {
        const Panel = require('../models/Panel');
        
        // Get all coordinators
        const coordinators = await User.find({
            'roles.role': 'coordinator',
            'memberType': 'internal'
        }).select('username name _id');
        
        // Get all panels with coordinators
        const panels = await Panel.find({ coordinator: { $ne: null } })
            .select('coordinator');
        
        const assignedCoordinatorIds = panels.map(p => p.coordinator.toString());
        
        // Filter out coordinators who already have panels
        const unassignedCoordinators = coordinators.filter(coord => 
            !assignedCoordinatorIds.includes(coord._id.toString())
        );
        
        res.json(unassignedCoordinators);
    } catch (error) {
        console.error('Error fetching unassigned coordinators:', error);
        res.status(500).json({ message: 'Error fetching unassigned coordinators' });
    }
};

// Get all students
exports.getAllStudents = async (req, res) => {
    try {
        // Ensure email is returned for students so frontend can show the registered email (if any)
        const students = await User.find({
                'roles.role': 'student'
            }, 'username name roles email');
        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Error fetching students' });
    }
};

// Admin: Delete all faculty members and clean all related data
exports.deleteAllFaculty = async (req, res) => {
    try {
        // Find all faculty users
        const faculty = await User.find({ 
            'roles.role': { $in: ['guide', 'panel', 'coordinator'] } 
        }).select('_id username');
        
        if (!faculty || faculty.length === 0) {
            return res.json({ message: 'No faculty found', deleted: 0 });
        }

        const facultyIds = faculty.map(f => f._id);

        // 1) Delete ALL teams (since all guides will be deleted)
        const allTeams = await Team.find({}).select('_id');
        const allTeamIds = allTeams.map(t => t._id);
        
        if (allTeamIds.length > 0) {
            // Cascade delete all team-related data
            try { await TimeTable.deleteMany({ team: { $in: allTeamIds } }); } catch (e) {}
            try { await Mark.deleteMany({ team: { $in: allTeamIds } }); } catch (e) {}
            try { await Attendance.deleteMany({ team: { $in: allTeamIds } }); } catch (e) {}
            try { const FinalReport = require('../models/FinalReport'); await FinalReport.deleteMany({ team: { $in: allTeamIds } }); } catch (e) {}
            try { const TeamPanelAssignment = require('../models/TeamPanelAssignment'); await TeamPanelAssignment.deleteMany({}); } catch (e) {}
            await Team.deleteMany({});
        }

        // 2) Delete all panels (since all panel members will be deleted)
        await Panel.deleteMany({});

        // 3) Clean up all faculty-related data
        try { await Availability.deleteMany({ user: { $in: facultyIds } }); } catch (e) {}
        try { await Mark.deleteMany({ markedBy: { $in: facultyIds } }); } catch (e) {}
        try { const FinalReport = require('../models/FinalReport'); await FinalReport.updateMany({ approvedBy: { $in: facultyIds } }, { $set: { approvedBy: null } }); } catch (e) {}
        try { await TimeTable.updateMany({ slotAssignedBy: { $in: facultyIds } }, { $set: { slotAssignedBy: null } }); } catch (e) {}

        // 4) Finally delete all faculty users
        const result = await User.deleteMany({ _id: { $in: facultyIds } });

        res.json({ 
            message: 'All faculty members and related data deleted successfully', 
            deleted: result.deletedCount || facultyIds.length 
        });
    } catch (error) {
        console.error('Error deleting all faculty:', error);
        res.status(500).json({ message: 'Error deleting all faculty members' });
    }
}; 

// Admin: Delete all teams and related assignments/schedules
exports.deleteAllTeams = async (req, res) => {
    try {
        // Clear team references in schedules and delete schedules
        await TimeTable.deleteMany({});

        // Remove all panel assignments linking teams
        try {
            const TeamPanelAssignment = require('../models/TeamPanelAssignment');
            await TeamPanelAssignment.deleteMany({});
        } catch (e) {
            // If model not present, ignore
        }

        // Finally delete teams
        await Team.deleteMany({});

        res.json({ message: 'All teams and related assignments were deleted successfully' });
    } catch (error) {
        console.error('Error deleting all teams:', error);
        res.status(500).json({ message: 'Error deleting all teams' });
    }
}; 

// Admin: Delete solo teams (teams with no members)
exports.deleteSoloTeams = async (req, res) => {
    try {
        const soloTeams = await Team.find({ $or: [{ members: { $size: 0 } }, { members: { $exists: false } }] });
        const soloTeamIds = soloTeams.map(t => t._id);
        if (soloTeamIds.length === 0) {
            return res.json({ message: 'No solo teams found', deleted: 0 });
        }

        // Cleanup related references
        try {
            const TimeTable = require('../models/TimeTable');
            await TimeTable.deleteMany({ team: { $in: soloTeamIds } });
        } catch (e) {}
        try {
            const TeamPanelAssignment = require('../models/TeamPanelAssignment');
            await TeamPanelAssignment.updateMany({}, { $pull: { teams: { $in: soloTeamIds } } });
        } catch (e) {}

        const result = await Team.deleteMany({ _id: { $in: soloTeamIds } });
        res.json({ message: 'Solo teams deleted successfully', deleted: result.deletedCount || soloTeamIds.length });
    } catch (error) {
        console.error('Error deleting solo teams:', error);
        res.status(500).json({ message: 'Error deleting solo teams' });
    }
};

// Admin: Delete all students and clean team references
exports.deleteAllStudents = async (req, res) => {
    try {
        // Find all student users
        const students = await User.find({ 'roles.role': 'student' }).select('_id username');
        if (!students || students.length === 0) {
            return res.json({ message: 'No students found', deleted: 0 });
        }

        const studentIds = students.map(s => s._id);

        // Remove students from teams (members) and clear teamLeader if a student
        await Team.updateMany(
            {},
            {
                $pull: { members: { $in: studentIds } },
            }
        );

        await Team.updateMany(
            { teamLeader: { $in: studentIds } },
            { $set: { teamLeader: null } }
        );

        // Finally delete student users
        const result = await User.deleteMany({ _id: { $in: studentIds } });

        res.json({ message: 'All students deleted successfully', deleted: result.deletedCount || studentIds.length });
    } catch (error) {
        console.error('Error deleting all students:', error);
        res.status(500).json({ message: 'Error deleting all students' });
    }
};
