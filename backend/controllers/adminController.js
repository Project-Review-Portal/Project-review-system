const Config = require('../models/Config');
const DesignationTeamLimit = require('../models/DesignationTeamLimit');
const Team = require('../models/Team');
const User = require('../models/User');
const Panel = require('../models/Panel');
const TimeTable = require('../models/TimeTable');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const { getReviewSettings } = require('../utils/reviewSettings');

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

// Helper: Determine if a team has completed a given review key (e.g. 'review1')
const hasTeamCompletedReview = async (teamId, reviewKey) => {
    const record = await Attendance.findOne({ team: teamId }).lean();
    if (!record || !Array.isArray(record.studentAttendances) || record.studentAttendances.length === 0) return false;
    // Completed only if ALL team members marked true for that review
    return record.studentAttendances.every(sa => !!sa[reviewKey]);
};

// Helper: Validate prerequisite chain for target slotType (dynamic based on config)
const validatePrerequisiteForSlotType = async (teamId, slotType) => {
    const { numReviews, vivaRequired, validSlotTypes } = await getReviewSettings();

    if (!validSlotTypes.includes(slotType)) {
        return { ok: false, message: `Invalid slotType '${slotType}'. Valid types: ${validSlotTypes.join(', ')}` };
    }

    // For reviewN (N > 1), require review(N-1) to be completed
    const reviewMatch = slotType.match(/^review(\d+)$/);
    if (reviewMatch) {
        const n = parseInt(reviewMatch[1], 10);
        if (n > 1) {
            const prevKey = `review${n - 1}`;
            const ok = await hasTeamCompletedReview(teamId, prevKey);
            if (!ok) return { ok: false, message: `Team must complete ${prevKey} before scheduling ${slotType}` };
        }
    }

    // For viva, require all reviews to be completed
    if (slotType === 'viva') {
        for (let i = 1; i <= numReviews; i++) {
            const ok = await hasTeamCompletedReview(teamId, `review${i}`);
            if (!ok) return { ok: false, message: `Team must complete review${i} before scheduling viva` };
        }
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
        const newMax = Number(maxTeamSize);

        if (!newMax || newMax < 1) {
            return res.status(400).json({ message: 'Invalid team size' });
        }

        // Capture old max BEFORE saving so we can determine direction of change
        let config = await Config.findOne();
        const oldMax = config ? Number(config.maxTeamSize) : newMax;

        if (!config) {
            config = new Config({ maxTeamSize: newMax });
        } else {
            config.maxTeamSize = newMax;
        }

        await config.save();

        let disbandedCount = 0;
        let unlockedCount = 0;

        if (newMax < oldMax) {
            // ── DECREASE: disband oversized teams; unlock non-conflicting locked teams ──
            const allTeams = await Team.find({});

            for (const team of allTeams) {
                // Total size = members accepted + team leader
                const totalSize = (team.members ? team.members.length : 0) + 1;
                if (totalSize > newMax) {
                    // Disband: use findOneAndDelete so the pre-hook cascade fires
                    // (cleans Attendance, Mark, TimeTable, FinalReport, TeamPanelAssignment)
                    await Team.findOneAndDelete({ _id: team._id });
                    disbandedCount++;
                } else if (team.isLocked) {
                    // Non-conflicting locked team → unlock so members can adjust if needed
                    await Team.findByIdAndUpdate(team._id, {
                        $set: { isLocked: false, isTeamComplete: false }
                    });
                    unlockedCount++;
                }
            }
        } else if (newMax > oldMax) {
            // ── INCREASE: unlock all locked teams so they can optionally add more members ──
            const result = await Team.updateMany(
                { isLocked: true },
                { $set: { isLocked: false, isTeamComplete: false } }
            );
            unlockedCount = result.modifiedCount || 0;
        }

        // Special case: maxTeamSize === 1 → auto-generate solo teams for teamless students and rename existing
        if (newMax === 1) {
            const students = await User.find({ role: 'student' });
            const allTeams = await Team.find({}).populate('teamLeader');

            // 1. Rename existing solo teams to the registration number of the leader
            for (const t of allTeams) {
                if (t.teamLeader && (!t.members || t.members.length === 0)) {
                    if (t.teamName !== t.teamLeader.username) {
                        t.teamName = t.teamLeader.username;
                        await t.save();
                    }
                }
            }

            const usersWithTeam = new Set();
            allTeams.forEach(t => {
                if (t.teamLeader) usersWithTeam.add(t.teamLeader._id.toString());
                if (t.members) t.members.forEach(m => usersWithTeam.add(m.toString()));
            });

            const studentsWithoutTeam = students.filter(s => !usersWithTeam.has(s._id.toString()));

            if (studentsWithoutTeam.length > 0) {
                for (const student of studentsWithoutTeam) {
                    const team = new Team({
                        teamName: student.username,
                        teamLeader: student._id,
                        programme: student.programme || 'B.E COMPUTER SCIENCE AND ENGINEERING',
                        members: [],
                        memberStatus: [],
                        isTeamComplete: true,
                        isLocked: true,
                        status: 'pending'
                    });
                    await team.save();
                }
            }
        }

        res.json({
            message: 'Team size updated successfully',
            config,
            disbandedCount,
            unlockedCount
        });
    } catch (error) {
        console.error('Error setting max team size:', error);
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
        const query = {
            $or: [
                { guidePreference: null },
                { status: 'pending' },
                { status: 'rejected' }
            ]
        };
        if (req.query.programme) query.programme = req.query.programme;
        const unassignedTeams = await Team.find(query)
            .populate('teamLeader', 'username name')
            .populate('members', 'username name');

        res.json(unassignedTeams);
    } catch (error) {
        console.error('Error fetching unassigned teams:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get guides with the count of teams assigned to them, sorted by count
exports.getGuidesWithTeamCounts = async (req, res) => {
    try {
        const progType = req.query.programmeType || 'B.E COMPUTER SCIENCE AND ENGINEERING';
        const isBE = progType === 'UG' || progType === 'B.E COMPUTER SCIENCE AND ENGINEERING';
        const programmeType = isBE ? 'UG' : 'PG';
        const guides = await User.find({
            'roles.role': 'guide',
            memberType: 'internal'
        }).select('username name designation');
        const { buildDesignationLimitMap, resolveGuideLimitStatus } = require('../utils/guideTeamLimit');
        const limitMap = await buildDesignationLimitMap(programmeType);

        const programmeQuery = isBE
            ? { programme: 'B.E COMPUTER SCIENCE AND ENGINEERING' }
            : { programme: { $ne: 'B.E COMPUTER SCIENCE AND ENGINEERING' } };

        const guidesWithCounts = await Promise.all(guides.map(async (guide) => {
            const teamsAssigned = await Team.find({
                guidePreference: guide._id,
                status: 'approved',
                ...programmeQuery
            }).select('_id teamName'); // Select team _id and teamName

            const limitStatus = resolveGuideLimitStatus(guide, teamsAssigned.length, limitMap);

            return { 
                ...guide.toObject(), 
                teamCount: teamsAssigned.length, 
                assignedTeams: teamsAssigned, // Add assigned teams array
                teamLimit: limitStatus.teamLimit,
                limitReached: limitStatus.teamLimit !== null && teamsAssigned.length >= limitStatus.teamLimit
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
        }).select('_id programme');

        if (unassignedTeams.length === 0) {
            return res.status(200).json({ message: 'No unassigned teams found to auto-assign guides.' });
        }

        const { buildDesignationLimitMap, resolveGuideLimitStatus, getTeamCountsByGuideIds } = require('../utils/guideTeamLimit');
        const limitMapUG = await buildDesignationLimitMap('UG');
        const limitMapPG = await buildDesignationLimitMap('PG');

        const guides = await User.find({
            'roles.role': 'guide',
            memberType: 'internal'
        }).select('username name designation');

        if (!guides || guides.length === 0) {
            return res.status(404).json({ message: 'No guides available for assignment.' });
        }

        const guideIds = guides.map(g => g._id);
        const countMapUG = await getTeamCountsByGuideIds(guideIds, 'UG');
        const countMapPG = await getTeamCountsByGuideIds(guideIds, 'PG');

        const guidesData = guides.map(guide => {
            const ugCount = countMapUG.get(guide._id.toString()) || 0;
            const pgCount = countMapPG.get(guide._id.toString()) || 0;
            const ugLimit = limitMapUG.get((guide.designation || '').trim().toLowerCase()) ?? null;
            const pgLimit = limitMapPG.get((guide.designation || '').trim().toLowerCase()) ?? null;

            return {
                _id: guide._id,
                name: guide.name,
                designation: guide.designation,
                ugCount,
                pgCount,
                ugLimit,
                pgLimit,
                totalCount: ugCount + pgCount
            };
        });

        let assignedCount = 0;
        for (const team of unassignedTeams) {
            const currentTeam = await Team.findById(team._id).select('rejectedGuides programme');
            const teamRejectedGuides = currentTeam ? currentTeam.rejectedGuides.map(id => id.toString()) : [];
            const isPg = currentTeam && currentTeam.programme && currentTeam.programme !== 'UG' && currentTeam.programme !== 'B.E COMPUTER SCIENCE AND ENGINEERING';
            const programmeType = isPg ? 'PG' : 'UG';

            // Sort guides to balance workload
            guidesData.sort((a, b) => {
                const countA = programmeType === 'UG' ? a.ugCount : a.pgCount;
                const countB = programmeType === 'UG' ? b.ugCount : b.pgCount;
                if (countA !== countB) return countA - countB;
                return a.totalCount - b.totalCount;
            });

            const eligibleAndAvailableGuide = guidesData.find(guide => {
                const isRejectedByTeam = teamRejectedGuides.includes(guide._id.toString());
                if (isRejectedByTeam) return false;

                const count = programmeType === 'UG' ? guide.ugCount : guide.pgCount;
                const limit = programmeType === 'UG' ? guide.ugLimit : guide.pgLimit;

                if (limit !== null && count >= limit) {
                    return false;
                }
                return true;
            });

            if (eligibleAndAvailableGuide) {
                await Team.findByIdAndUpdate(team._id, {
                    guidePreference: eligibleAndAvailableGuide._id,
                    status: 'approved'
                });
                assignedCount++;

                if (programmeType === 'UG') {
                    eligibleAndAvailableGuide.ugCount++;
                } else {
                    eligibleAndAvailableGuide.pgCount++;
                }
                eligibleAndAvailableGuide.totalCount++;
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
            .populate('panel', 'name members')
            .populate('vivaPanel', 'name members');

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

        // Determine target slot type dynamically from config
        const { validSlotTypes } = await getReviewSettings();
        const targetSlot = slotType && validSlotTypes.includes(slotType) ? slotType : validSlotTypes[0];

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
        if (slotType) {
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
        if (slotType) {
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

// Admin: Send schedule notification
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
        const { validSlotTypes } = await getReviewSettings();
        const totalEvents = validSlotTypes.length || 1;

        const teamFilter = {};
        if (req.query.programme) teamFilter.programme = req.query.programme;
        const teams = await Team.find(teamFilter)
            .populate('teamLeader', 'name username')
            .populate('members', 'name username')
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

                if (attendanceRecord) {
                    const studentAtt = attendanceRecord.studentAttendances.find(
                        sa => sa.student.toString() === member._id.toString()
                    );
                    
                    if (studentAtt && studentAtt.assessments) {
                        validSlotTypes.forEach(slot => {
                            // Find the matching assessment item by name within the array
                            const matchingAssessment = studentAtt.assessments.find(
                                asm => asm.name === slot
                            );
                            
                            // If found and the student was marked present, increment the count
                            if (matchingAssessment && matchingAssessment.isPresent) {
                                presentCount++;
                            }
                        });
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
                    studentRegNo: member.username,
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
        const filter = {};
        if (req.query.programme) filter.programme = req.query.programme;
        const teams = await Team.find(filter)
            .populate('teamLeader', 'username name')
            .populate('members', 'username name')
            .populate('guidePreference', 'username name')
            .populate({
                path: 'panel',
                populate: {
                    path: 'members',
                    select: 'username name memberType'
                }
            })
            .populate({
                path: 'vivaPanel',
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
        // Accept optional slotType; default to first valid slot from config
        const { validSlotTypes } = await getReviewSettings();
        const targetSlot = req.body && validSlotTypes.includes(req.body.slotType) ? req.body.slotType : validSlotTypes[0];

        // Get all teams that need schedules
        const teams = await Team.find({ status: 'approved' })
            .populate('guidePreference', 'username')
            .populate('panel', 'name');

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
            // Try to find a suitable time slot
            let scheduled = false;
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                // Skip weekends
                if (date.getDay() === 0 || date.getDay() === 6) continue;

                for (const period of dailyPeriods) {
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
                    scheduled = true;
                    break; // Move to next team
                }
                if (scheduled) break;
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

        // Decide target slot type dynamically from config
        const { validSlotTypes } = await getReviewSettings();
        const targetSlot = slotType && validSlotTypes.includes(slotType) ? slotType : validSlotTypes[0];

        // Enforce prerequisites
        const prereq = await validatePrerequisiteForSlotType(team._id, targetSlot);
        if (!prereq.ok) {
            return res.status(400).json({ message: prereq.message });
        }

        // Get review period dates
        const config = await Config.findOne();
        if (!config || !config.reviewPeriodStartDate || !config.reviewPeriodEndDate) {
            return res.status(400).json({ message: 'Review period dates not set' });
        }

        const startDate = new Date(config.reviewPeriodStartDate);
        const endDate = new Date(config.reviewPeriodEndDate);

        // Try to find a suitable time slot
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            for (const period of dailyPeriods) {
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
                const { name, memberType, designation, seniority } = faculty;

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

                let parsedSeniority = null;
                if (seniority !== undefined && seniority !== null && seniority !== '') {
                    const sVal = Number(seniority);
                    if (!Number.isNaN(sVal) && sVal >= 1) {
                        parsedSeniority = Math.floor(sVal);
                    }
                }

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
                    mustChangePassword: true,
                    seniority: parsedSeniority
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
        const { studentData, programme } = req.body;
        const targetProgramme = (programme && programme.trim()) ? programme.trim() : 'UG';
        let count = 0;

        if (!Array.isArray(studentData)) {
            return res.status(400).json({ message: 'Invalid payload: studentData must be an array' });
        }

        const config = await Config.findOne();
        const isSoloMode = config && config.maxTeamSize === 1;

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
                // Update programme if it changed
                if (existingUser.programme !== targetProgramme) {
                    existingUser.programme = targetProgramme;
                    await existingUser.save();
                }
                continue;
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
                programme: targetProgramme,
                mustChangePassword: true
            });

            await user.save();
            count++;

            // Auto-form solo team if maxTeamSize is 1
            if (isSoloMode) {
                const team = new Team({
                    teamName: user.username,
                    teamLeader: user._id,
                    programme: user.programme,
                    members: [],
                    memberStatus: [],
                    isTeamComplete: true,
                    isLocked: true,
                    status: 'pending'
                });
                await team.save();
            }
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
        const { name, designation, memberType, seniority } = req.body;

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
        if (designation !== undefined) {
            user.designation = designation;
        }
        if (memberType !== undefined) {
            user.memberType = memberType;
        }
        if (seniority !== undefined && seniority !== null && seniority !== '') {
            const sVal = Number(seniority);
            user.seniority = !Number.isNaN(sVal) && sVal >= 1 ? Math.floor(sVal) : null;
        } else if (seniority === '') {
            user.seniority = null;
        }

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

        // 1) All teams that have this faculty as guide will now have no guide
        await Team.updateMany({ guidePreference: facultyObjectId }, { $set: { guidePreference: null } });

        // 2) If the faculty is in a panel and is coordinator, remove the panel completely.
        const coordinatedPanels = await Panel.find({ coordinator: facultyObjectId });
        if (coordinatedPanels.length > 0) {
            const coordinatedPanelIds = coordinatedPanels.map(p => p._id);
            // Delete these panels completely (triggers Panel schema hooks)
            await Panel.deleteMany({ _id: { $in: coordinatedPanelIds } });
            
            // Delete associated TimeTable schedules
            await TimeTable.deleteMany({ panel: { $in: coordinatedPanelIds } });
        }

        // Pull from members list or assistantCoordinators list in other panels
        await Panel.updateMany(
            { $or: [{ members: facultyObjectId }, { assistantCoordinators: facultyObjectId }] },
            { 
                $pull: { 
                    members: facultyObjectId,
                    assistantCoordinators: facultyObjectId
                }
            }
        );

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

        // Check if the student is in any team
        const team = await Team.findOne({ $or: [{ teamLeader: studentId }, { members: studentId }] });
        if (team) {
            const isLeader = team.teamLeader && team.teamLeader.toString() === studentId.toString();
            if (isLeader) {
                // Disband the team! (triggers Team schema pre hooks which clean schedules, marks, assignments, etc.)
                await Team.findOneAndDelete({ _id: team._id });
                // Also update the users who were in that team to clear their team reference in roles array
                await User.updateMany(
                    { 'roles.team': team._id.toString() },
                    { $set: { 'roles.$.team': null } }
                );
            } else {
                // Remove student from members list & memberStatus, unlock team if it is locked
                await Team.updateOne(
                    { _id: team._id },
                    { 
                        $pull: { 
                            members: studentId,
                            memberStatus: { user: studentId }
                        },
                        $set: {
                            isLocked: false
                        }
                    }
                );
                // Reset lockApproved to false for all remaining members so they must re-approve locking
                await Team.updateOne(
                    { _id: team._id },
                    { $set: { 'memberStatus.$[].lockApproved': false } }
                );
            }
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

// Check student deletion metadata before executing
exports.checkStudentDeletion = async (req, res) => {
    try {
        const { regno } = req.params;
        const user = await User.findOne({ username: regno });
        if (!user) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const studentId = user._id;
        const team = await Team.findOne({ $or: [{ teamLeader: studentId }, { members: studentId }] });

        if (team) {
            const isLeader = team.teamLeader && team.teamLeader.toString() === studentId.toString();
            return res.json({
                inTeam: true,
                isLeader,
                teamName: team.teamName,
                studentName: user.name
            });
        }

        return res.json({
            inTeam: false,
            isLeader: false,
            teamName: null,
            studentName: user.name
        });
    } catch (error) {
        console.error('Error checking student deletion:', error);
        res.status(500).json({ message: 'Server error checking student deletion' });
    }
};

// Check faculty deletion metadata before executing
exports.checkFacultyDeletion = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const user = await User.findOne({ $or: [{ username: facultyId }, { email: facultyId }] });
        if (!user) {
            return res.status(404).json({ message: 'Faculty member not found' });
        }

        const facultyObjectId = user._id;

        // Count teams guided
        const guidedTeamsCount = await Team.countDocuments({ guidePreference: facultyObjectId });

        // Find coordinated panels
        const coordinatedPanels = await Panel.find({ coordinator: facultyObjectId }).select('name');
        const coordinatedPanelNames = coordinatedPanels.map(p => p.name);

        // Find other panel memberships
        const memberOrAssistPanels = await Panel.find({
            $and: [
                { coordinator: { $ne: facultyObjectId } },
                { $or: [{ members: facultyObjectId }, { assistantCoordinators: facultyObjectId }] }
            ]
        }).select('name');
        const memberOrAssistPanelNames = memberOrAssistPanels.map(p => p.name);

        return res.json({
            facultyName: user.name,
            guidedTeamsCount,
            isCoordinator: coordinatedPanelNames.length > 0,
            coordinatedPanels: coordinatedPanelNames,
            isMemberOrAssist: memberOrAssistPanelNames.length > 0,
            memberOrAssistPanels: memberOrAssistPanelNames
        });
    } catch (error) {
        console.error('Error checking faculty deletion:', error);
        res.status(500).json({ message: 'Server error checking faculty deletion' });
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
        // Include email, designation, and seniority in the response so frontend can display the correct fields
        const faculty = await User.find(match).select('username name roles memberType email designation seniority');
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
        const query = { 'roles.role': 'student' };
        if (req.query.programme) query.programme = req.query.programme;
        // Ensure email is returned for students so frontend can show the registered email (if any)
        const students = await User.find(query, 'username name roles email programme');
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

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.getDesignationTeamLimits = async (req, res) => {
    try {
        const limits = await DesignationTeamLimit.find({}).sort({ designation: 1 });
        res.json(limits);
    } catch (error) {
        console.error('Error fetching designation team limits:', error);
        res.status(500).json({ message: 'Error fetching designation team limits' });
    }
};

exports.saveDesignationTeamLimits = async (req, res) => {
    try {
        const { limits } = req.body;

        if (!Array.isArray(limits)) {
            return res.status(400).json({ message: 'Invalid payload: limits must be an array' });
        }

        // Deduplicate incoming limits: last entry wins for same designation (case-insensitive)
        const deduped = new Map();
        for (const item of limits) {
            const designation = String(item.designation || '').trim();
            const ugLimit = Number(item.ugLimit ?? item.ug_limit);
            const pgLimit = Number(item.pgLimit ?? item.pg_limit);

            if (!designation) {
                continue;
            }

            if (!Number.isInteger(ugLimit) || ugLimit < 1) {
                return res.status(400).json({
                    message: `Invalid UG team limit for designation "${designation}". Must be a positive integer starting from 1.`
                });
            }

            if (!Number.isInteger(pgLimit) || pgLimit < 1) {
                return res.status(400).json({
                    message: `Invalid PG team limit for designation "${designation}". Must be a positive integer starting from 1.`
                });
            }

            // Use lowercase key so duplicate designations (any casing) overwrite each other
            deduped.set(designation.toLowerCase(), { designation, ugLimit, pgLimit });
        }

        // Clear existing limits and insert the clean, deduplicated set
        await DesignationTeamLimit.deleteMany({});

        const toInsert = Array.from(deduped.values());
        let saved = [];
        if (toInsert.length > 0) {
            saved = await DesignationTeamLimit.insertMany(toInsert);
        }

        res.json({
            message: `Successfully saved ${saved.length} designation team limit(s)`,
            limits: saved
        });
    } catch (error) {
        console.error('Error saving designation team limits:', error);
        res.status(500).json({ message: 'Error saving designation team limits' });
    }
};

exports.deleteDesignationTeamLimit = async (req, res) => {
    try {
        const designation = decodeURIComponent(req.params.designation || '').trim();

        if (!designation) {
            return res.status(400).json({ message: 'Designation is required' });
        }

        const deleted = await DesignationTeamLimit.findOneAndDelete({
            designation: { $regex: new RegExp(`^${escapeRegex(designation)}$`, 'i') }
        });

        if (!deleted) {
            return res.status(404).json({ message: 'Designation team limit not found' });
        }

        res.json({ message: 'Designation team limit deleted successfully' });
    } catch (error) {
        console.error('Error deleting designation team limit:', error);
        res.status(500).json({ message: 'Error deleting designation team limit' });
    }
};

exports.deleteAllDesignationTeamLimits = async (req, res) => {
    try {
        const result = await DesignationTeamLimit.deleteMany({});
        res.json({
            message: `All designation team limits deleted successfully (${result.deletedCount} removed)`,
            deleted: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting all designation team limits:', error);
        res.status(500).json({ message: 'Error deleting all designation team limits' });
    }
};

// Admin: Get current reviews/viva settings
exports.getReviewsVivaSettings = async (req, res) => {
    try {
        const config = await Config.findOne();
        res.json({
            numReviews: config ? config.numReviews : 3,
            vivaRequired: config ? config.vivaRequired : true
        });
    } catch (error) {
        console.error('Error fetching reviews/viva settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Update reviews/viva settings
exports.setReviewsVivaSettings = async (req, res) => {
    try {
        const { numReviews, vivaRequired } = req.body;

        if (numReviews === undefined || vivaRequired === undefined) {
            return res.status(400).json({ message: 'numReviews and vivaRequired are required.' });
        }

        const n = parseInt(numReviews, 10);
        if (isNaN(n) || n < 1 || n > 10) {
            return res.status(400).json({ message: 'numReviews must be a number between 1 and 10.' });
        }

        let config = await Config.findOne();
        if (!config) {
            config = new Config({ numReviews: n, vivaRequired: !!vivaRequired });
        } else {
            config.numReviews = n;
            config.vivaRequired = !!vivaRequired;
        }

        await config.save();
        res.json({ message: 'Reviews/Viva settings updated successfully', numReviews: config.numReviews, vivaRequired: config.vivaRequired });
    } catch (error) {
        console.error('Error updating reviews/viva settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Update team allocation (guide and panel)
exports.updateTeamAllocation = async (req, res) => {
    try {
        const { teamId } = req.params;
        const { guideId, panelId, vivaPanelId } = req.body;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found.' });
        }

        let updated = false;
        const warnings = [];

        // Update Guide
        if (guideId !== undefined) {
            if (guideId === null) {
                team.guidePreference = null;
                team.status = 'pending';
            } else {
                const guide = await User.findById(guideId);
                if (!guide || !guide.roles.some(r => r.role === 'guide')) {
                    return res.status(400).json({ message: 'Invalid guide ID or guide not found.' });
                }

                // --- Limit Check Logic with Distinct Warning Messages ---
                const {
                    buildDesignationLimitMap,
                    getTeamCountsByGuideIds,
                    resolveGuideLimitStatus
                } = require('../utils/guideTeamLimit');

                const isPg = team.programme && team.programme !== 'UG';
                const programmeType = isPg ? 'PG' : 'UG';

                const limitMap = await buildDesignationLimitMap(programmeType);
                const countMap = await getTeamCountsByGuideIds([guide._id], programmeType);
                const currentApprovedCount = countMap.get(guide._id.toString()) || 0;
                const limitStatus = resolveGuideLimitStatus(guide, currentApprovedCount, limitMap);

                if (limitStatus.teamLimit !== null) {
                    const guideName = guide.name || 'Unknown Guide';
                    
                    if (currentApprovedCount > limitStatus.teamLimit) {
                        // The guide was already past their capacity before assigning this team
                        warnings.push(
                            `Warning: Guide ${guideName} has already exceeded their team limit (${currentApprovedCount}/${limitStatus.teamLimit}).`
                        );
                    } 
                    /* else if (currentApprovedCount === limitStatus.teamLimit) {
                        // The guide was exactly at capacity, and assigning this team pushes them over
                        warnings.push(
                            `Warning: Guide ${guideName} has reached their team limit (${currentApprovedCount}/${limitStatus.teamLimit}). Assigning this team will exceed it.`
                        );
                    } */
                }
                // ---------------------------------------------------------------------

                team.guidePreference = guideId;
                team.status = 'approved';
            }
            updated = true;
        }

        // Update Panel (Review Panel)
        if (panelId !== undefined) {
            const TeamPanelAssignment = require('../models/TeamPanelAssignment');
            // Pull the team from any existing panel assignments first
            await TeamPanelAssignment.updateMany({}, { $pull: { teams: teamId } });

            if (panelId === null) {
                team.panel = null;
                team.coordinator = null;
            } else {
                const panel = await Panel.findById(panelId);
                if (!panel) {
                    return res.status(404).json({ message: 'Panel not found.' });
                }
                team.panel = panelId;
                team.coordinator = panel.coordinator;

                // Push the team to the new panel assignment record
                await TeamPanelAssignment.findOneAndUpdate(
                    { panel: panelId },
                    { $addToSet: { teams: teamId } },
                    { upsert: true }
                );

                // Warn if no guide is assigned to this team
                if (!team.guidePreference) {
                    warnings.push(
                        `Warning: Review panel "${panel.name}" assigned, but no guide is assigned to this team.`
                    );
                }
            }
            updated = true;
        }

        // Update Viva Panel
        if (vivaPanelId !== undefined) {
            if (vivaPanelId === null) {
                team.vivaPanel = null;
            } else {
                const vivaPanel = await Panel.findById(vivaPanelId);
                if (!vivaPanel) {
                    return res.status(404).json({ message: 'Viva Panel not found.' });
                }
                team.vivaPanel = vivaPanelId;

                // Warn if no guide is assigned to this team
                if (!team.guidePreference) {
                    warnings.push(
                        `Warning: Viva panel "${vivaPanel.name}" assigned, but no guide is assigned to this team.`
                    );
                }
            }
            updated = true;
        }

        if (updated) {
            await team.save();
        }

        res.json({ 
            message: 'Team allocation updated successfully!', 
            team,
            warnings 
        });
        
    } catch (error) {
        console.error('Error updating team allocation:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Auto-assign panels to teams
exports.autoAssignPanels = async (req, res) => {
    try {
        const { panelType } = req.body;
        const isViva = panelType === 'viva';
        const teamField = isViva ? 'vivaPanel' : 'panel';
        const typeLabel = isViva ? 'Viva Panel' : 'Panel';

        // FIXED filter:
        // - For viva panels:   panelType === 'viva'
        // - For review panels: panelType !== 'viva'  (matches frontend: allPanels.filter(p => p.panelType !== 'viva'))
        //   This ensures panels without an explicit panelType field are correctly treated as review panels.
        const panels = isViva
            ? await Panel.find({ panelType: 'viva' })
            : await Panel.find({ panelType: { $ne: 'viva' } });

        if (panels.length === 0) {
            return res.status(400).json({ message: `No ${typeLabel}s exist to assign.` });
        }

        // Find all teams for this programme
        const teamQuery = {};
        if (req.body.programme) {
            teamQuery.programme = req.body.programme;
        }
        const teams = await Team.find(teamQuery).populate('guidePreference').populate(teamField);

        let assignedCount = 0;
        const warnings = [];

        // Count current assignments for each panel to ensure even distribution
        const panelCounts = {};
        for (const p of panels) {
            const count = await Team.countDocuments({ [teamField]: p._id });
            panelCounts[p._id.toString()] = count;
        }

        for (const team of teams) {
            let teamProgramme = (team.programme || 'B.E COMPUTER SCIENCE AND ENGINEERING').trim().toLowerCase();
            if (teamProgramme === 'ug') teamProgramme = 'b.e computer science and engineering';
            const guideId = team.guidePreference ? team.guidePreference._id.toString() : null;

            // Check if the currently assigned panel (if any) is valid and programme matches
            const currentPanel = team[teamField];
            let isUnassigned = !currentPanel;
            if (currentPanel) {
                let currentPanelProg = (currentPanel.programme || 'B.E COMPUTER SCIENCE AND ENGINEERING').trim().toLowerCase();
                if (currentPanelProg === 'ug') currentPanelProg = 'b.e computer science and engineering';
                if (currentPanelProg !== teamProgramme) {
                    isUnassigned = true; // mismatch => treat as unassigned
                }
            }

            if (isUnassigned) {
                // Filter panels by the team's programme (same logic as the frontend dropdown)
                const programmePanels = panels.filter(p => {
                    let pProg = (p.programme || 'B.E COMPUTER SCIENCE AND ENGINEERING').trim().toLowerCase();
                    if (pProg === 'ug') pProg = 'b.e computer science and engineering';
                    return pProg === teamProgramme;
                });

                if (programmePanels.length === 0) {
                    warnings.push(`Warning: No ${typeLabel} found for programme "${team.programme || 'B.E COMPUTER SCIENCE AND ENGINEERING'}" — Team ${team.teamName} was skipped.`);
                    continue;
                }

                // Sort matching panels by least assigned teams for even distribution
                const sortedPanels = [...programmePanels].sort(
                    (a, b) => (panelCounts[a._id.toString()] || 0) - (panelCounts[b._id.toString()] || 0)
                );

                let selectedPanel = null;
                let conflictPanel = null;

                for (const panel of sortedPanels) {
                    // Check if the team's guide is already in this panel (conflict check)
                    let hasConflict = false;
                    if (guideId) {
                        if (panel.coordinator && panel.coordinator.toString() === guideId) hasConflict = true;
                        if (panel.assistantCoordinators && panel.assistantCoordinators.some(ac => ac.toString() === guideId)) hasConflict = true;
                        if (panel.members && panel.members.some(m => m.toString() === guideId)) hasConflict = true;
                    }

                    if (!hasConflict) {
                        selectedPanel = panel;
                        break;
                    } else if (!conflictPanel) {
                        // Remember first conflicting panel as a fallback
                        conflictPanel = panel;
                    }
                }

                // If all panels have guide conflicts, use the least-loaded one with a warning
                if (!selectedPanel && conflictPanel) {
                    selectedPanel = conflictPanel;
                    const guideName = team.guidePreference ? team.guidePreference.name : 'Unknown Guide';
                    warnings.push(`Warning: Team ${team.teamName} assigned to ${typeLabel} "${selectedPanel.name}", which contains their Guide (${guideName}) as a panel member.`);
                } else if (!selectedPanel && sortedPanels.length > 0) {
                    selectedPanel = sortedPanels[0];
                }

                if (selectedPanel) {
                    team[teamField] = selectedPanel._id;
                    if (!isViva) {
                        team.coordinator = selectedPanel.coordinator;
                    }
                    await team.save();

                    // Also update TeamPanelAssignment model (for review panels only)
                    if (!isViva) {
                        const TeamPanelAssignment = require('../models/TeamPanelAssignment');
                        // Pull from any previous panel assignments first
                        await TeamPanelAssignment.updateMany({}, { $pull: { teams: team._id } });
                        // Add to new
                        await TeamPanelAssignment.findOneAndUpdate(
                            { panel: selectedPanel._id },
                            { $addToSet: { teams: team._id } },
                            { upsert: true }
                        );
                    }

                    panelCounts[selectedPanel._id.toString()] = (panelCounts[selectedPanel._id.toString()] || 0) + 1;
                    assignedCount++;
                }
            }
        }

        res.json({
            message: `Successfully assigned ${typeLabel}s to ${assignedCount} teams.`,
            assignedCount,
            warnings
        });

    } catch (error) {
        console.error('Error auto-assigning panels:', error);
        res.status(500).json({ message: 'Server error during auto-assignment' });
    }
};

// Auto-assign guides to unassigned teams (for allocations dashboard)
exports.autoAssignGuidesFromAllocations = async (req, res) => {
    try {
        // Fetch all guides sorted by their current team count (ascending)
        const guidesByTeamCount = await exports.getGuidesWithTeamCounts(
            { ...req, originalUrl: '' }, // override originalUrl to trigger internal return
            res, 
            true
        );

        if (!guidesByTeamCount || guidesByTeamCount.length === 0) {
            return res.status(404).json({ message: 'No guides available for assignment.' });
        }

        const validGuideIds = new Set(guidesByTeamCount.map(g => g._id.toString()));

        // Find all teams for this programme
        const query = {};
        if (req.body.programme) {
            query.programme = req.body.programme;
        }
        const teams = await Team.find(query).populate('guidePreference');

        let assignedCount = 0;
        const warnings = [];

        for (const team of teams) {
            // Check if the team has a valid internal guide assigned
            const hasValidGuide = team.guidePreference && validGuideIds.has(team.guidePreference._id.toString());

            if (!hasValidGuide) {
                const currentTeam = await Team.findById(team._id).select('rejectedGuides');
                const teamRejectedGuides = currentTeam ? currentTeam.rejectedGuides.map(id => id.toString()) : [];

                const eligibleGuide = guidesByTeamCount.find(guide => {
                    const isRejectedByTeam = teamRejectedGuides.includes(guide._id.toString());
                    if (isRejectedByTeam) return false;
                    if (guide.teamLimit !== null && guide.teamCount >= guide.teamLimit) return false;
                    return true;
                });

                if (eligibleGuide) {
                    await Team.findByIdAndUpdate(team._id, {
                        guidePreference: eligibleGuide._id,
                        status: 'approved'
                    });
                    assignedCount++;

                    const updatedGuideIndex = guidesByTeamCount.findIndex(g => g._id.toString() === eligibleGuide._id.toString());
                    if (updatedGuideIndex !== -1) {
                        guidesByTeamCount[updatedGuideIndex].teamCount++;
                    }
                    guidesByTeamCount.sort((a, b) => a.teamCount - b.teamCount);
                } else {
                    warnings.push(`No eligible guide found for team ${team.teamName || team._id}.`);
                }
            }
        }

        res.json({ 
            message: `Successfully assigned guides to ${assignedCount} teams.`, 
            assignedCount,
            warnings 
        });

    } catch (error) {
        console.error('Error auto-assigning guides:', error);
        res.status(500).json({ message: 'Server error during guide auto-assignment' });
    }
};
