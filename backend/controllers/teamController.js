const Team = require('../models/Team');
const User = require('../models/User');
const Config = require('../models/Config');
const {
    buildDesignationLimitMap,
    getTeamCountsByGuideIds,
    resolveGuideLimitStatus
} = require('../utils/guideTeamLimit');
const TeamPanelAssignment = require('../models/TeamPanelAssignment');
const FinalReport = require('../models/FinalReport');

// Get available students (not in any team)
exports.getAvailableStudents = async (req, res) => {
    try {
        const currentUserId = req.user.id; // Get the ID of the logged-in user
        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};

        // Get all teams and extract both team leaders and accepted members in this session
        const teams = await Team.find(sessionFilter);
        let teamMemberIds = teams.flatMap(team => [
            team.teamLeader,
            ...(team.members || [])
        ]);

        // Ensure current user is also excluded from available students
        teamMemberIds = [...new Set([...teamMemberIds.filter(Boolean).map(id => id.toString()), currentUserId.toString()])];

        // Fetch current user to get their programme
        const currentUser = await User.findById(currentUserId);
        const userProgramme = currentUser ? (currentUser.programme || 'B.E. CSE') : 'B.E. CSE';

        // Find students who are not in any team and not the current user, in the SAME programme and session
        const studentQuery = {
            'roles.role': 'student',
            programme: userProgramme,
            _id: { $nin: teamMemberIds }
        };
        if (req.sessionId) {
            studentQuery.$or = [
                { session: req.sessionId },
                { session: null },
                { session: { $exists: false } }
            ];
        }

        const availableStudents = await User.find(studentQuery).select('username _id name programme');

        console.log('Available students found:', availableStudents.length); // Debug log
        res.json(availableStudents);
    } catch (error) {
        console.error('Error in getAvailableStudents:', error); // Debug log
        res.status(500).json({ message: 'Error fetching available students' });
    }
};

// Get guides for selection
exports.getGuides = async (req, res) => {
    try {
        const userId = req.user.id;
        const team = await Team.findOne({
            $or: [
                { teamLeader: userId },
                { members: userId }
            ]
        });

        let rejectedGuideIds = [];
        if (team && team.rejectedGuides) {
            rejectedGuideIds = team.rejectedGuides;
        }

        const sessionFilter = req.sessionId ? { session: req.sessionId } : (team?.session ? { session: team.session } : {});

        const queryConditions = [
            {
                $or: [
                    { 'roles.role': 'guide' },
                    { role: 'guide' },
                    { role: 'faculty' }
                ]
            },
            { role: { $nin: ['student', 'admin'] } },
            { memberType: { $ne: 'external' } }, // Internal faculty only (excludes external examiners)
            { _id: { $nin: rejectedGuideIds } }
        ];

        if (sessionFilter.session) {
            queryConditions.push({
                $or: [
                    { session: sessionFilter.session },
                    { session: null },
                    { session: { $exists: false } }
                ]
            });
        }

        const guides = await User.find({ $and: queryConditions }).select('username name designation');

        const isPg = team && team.programme && team.programme !== 'UG' && team.programme !== 'B.E COMPUTER SCIENCE AND ENGINEERING' && team.programme !== 'B.E. CSE';
        const programmeType = isPg ? 'PG' : 'UG';
        const limitMap = await buildDesignationLimitMap(programmeType, sessionFilter.session);
        const guideIds = guides.map((guide) => guide._id);
        const countMap = await getTeamCountsByGuideIds(guideIds, programmeType, sessionFilter.session);

        const guidesWithStatus = guides.map((guide) => {
            const currentTeamCount = countMap.get(guide._id.toString()) || 0;
            const limitStatus = resolveGuideLimitStatus(guide, currentTeamCount, limitMap);

            return {
                ...guide.toObject(),
                ...limitStatus
            };
        });

        res.json(guidesWithStatus);
    } catch (error) {
        console.error('Error fetching guides:', error); // Added error logging
        res.status(500).json({ message: 'Error fetching guides' });
    }
};

// Create a new team
exports.createTeam = async (req, res) => {
    try {
        const { members } = req.body;
        const teamLeaderId = req.user.id;
        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};

        // Check if user is already in a team in this session
        const existingTeam = await Team.findOne({
            ...sessionFilter,
            $or: [
                { teamLeader: teamLeaderId },
                { members: teamLeaderId }
            ]
        });

        if (existingTeam) {
            return res.status(400).json({ message: 'You are already part of a team in this session' });
        }

        // Check if user has any pending invitations from other teams in this session
        const pendingInvitations = await Team.findOne({
            ...sessionFilter,
            memberStatus: {
                $elemMatch: {
                    user: teamLeaderId,
                    status: 'pending'
                }
            }
        });
        if (pendingInvitations) {
            return res.status(400).json({ message: 'You have pending team invitations. You must decline all invitations before creating your own team.' });
        }

        const leader = await User.findById(teamLeaderId);
        const leaderProgramme = leader ? (leader.programme || 'B.E. CSE') : 'B.E. CSE';

        // Get max team size from config for this programme and session
        const config = (await Config.findOne({ programme: leaderProgramme, ...sessionFilter }))
            || (await Config.findOne({ programme: leaderProgramme }))
            || (await Config.findOne());
        // Always allow team formation - no restrictions
        const maxTeamSize = config ? config.maxTeamSize : 4;

        // Retrieve all existing teams for this programme and session to generate the next sequential team name
        const existingTeams = await Team.find({ programme: leaderProgramme, ...sessionFilter }, { teamName: 1 });

        // Helper function to escape regex special characters in the programme name
        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Match either "{Programme} Team {Number}" or the legacy "Team {Number}"
        const teamNameRegex = new RegExp(`^(?:${escapeRegExp(leaderProgramme)}\\s+)?Team\\s+(\\d+)$`, 'i');

        const existingNumbers = new Set();
        if (existingTeams) {
            for (const team of existingTeams) {
                if (team.teamName) {
                    const match = team.teamName.match(teamNameRegex);
                    if (match) {
                        existingNumbers.add(parseInt(match[1], 10));
                    }
                }
            }
        }

        let numberTracker = 1;
        while (existingNumbers.has(numberTracker)) {
            numberTracker++;
        }

        const newTeamName = `${leaderProgramme} Team ${numberTracker}`;

        // Create team
        const team = new Team({
            teamName: newTeamName, // Automatically generated team name
            teamLeader: teamLeaderId,
            programme: leaderProgramme,
            session: req.sessionId || null,
            members: [], // Keep empty until invitations are accepted
            memberStatus: members.map((m) => {
                return {
                    user: m,
                    status: 'pending'
                }
            }),
            isTeamComplete: false,
            status: 'pending'
        });

        await team.save();
        res.status(201).json(team);
    } catch (error) {
        console.error('Error in createTeam:', error); // Debug log
        res.status(500).json({ message: 'Error creating team' });
    }
};

// Get user's team
exports.getUserTeam = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('getUserTeam: Attempting to find team for userId:', userId, 'session:', req.sessionId);

        const populateOptions = [
            { path: 'teamLeader members', select: 'username name' },
            { path: 'memberStatus.user', select: 'username name' },
            { path: 'guidePreference', select: 'username name' },
            { path: 'rejectedGuides', select: 'username name' }
        ];

        let team = null;
        if (req.sessionId) {
            team = await Team.findOne({
                session: req.sessionId,
                $or: [
                    { teamLeader: userId },
                    { members: userId }
                ]
            }).populate(populateOptions);
        }

        // Fallback to finding without session if not found or session not passed
        if (!team) {
            team = await Team.findOne({
                $or: [
                    { teamLeader: userId },
                    { members: userId }
                ]
            }).populate(populateOptions);
        }

        if (!team) {
            console.log('getUserTeam: No team found for userId:', userId); // Detailed log
            return res.status(404).json({ message: 'No team found' });
        }

        console.log('getUserTeam: Team found:', team._id); // Detailed log
        res.json(team);
    } catch (error) {
        console.error('Error in getUserTeam:', error); // Debug log
        res.status(500).json({ message: 'Error fetching team' });
    }
};

// Request a guide for a team (only by team leader)
exports.requestGuide = async (req, res) => {
    try {
        const teamLeaderId = req.user.id;
        const { guideId } = req.body;

        // Find the team where the current user is the team leader
        const team = (req.sessionId ? await Team.findOne({ teamLeader: teamLeaderId, session: req.sessionId }) : null)
            || await Team.findOne({ teamLeader: teamLeaderId });

        if (!team) {
            return res.status(404).json({ message: 'Team not found or you are not the team leader.' });
        }

        if (!team.isLocked) {
            return res.status(400).json({ message: 'You cannot request a guide until your team is locked and finalized.' });
        }

        // Validate that guide selection period is currently active according to admin settings
        const sessionFilter = req.sessionId ? { session: req.sessionId } : (team.session ? { session: team.session } : {});
        const programme = team.programme;
        const config = (await Config.findOne({ programme, ...sessionFilter }))
            || (await Config.findOne({ ...sessionFilter }))
            || (await Config.findOne({ programme }))
            || (await Config.findOne());

        if (!config || !config.guideSelectionStartDate || !config.guideSelectionEndDate) {
            return res.status(400).json({
                message: 'Guide selection period is not currently active. Selection dates have not been set by the administrator.'
            });
        }

        const now = new Date();
        const start = new Date(config.guideSelectionStartDate);
        const end = new Date(config.guideSelectionEndDate);

        if (now < start) {
            return res.status(400).json({
                message: `Guide selection process has not started yet. It will begin on ${start.toLocaleString()}.`
            });
        }

        if (now > end) {
            return res.status(400).json({
                message: `Guide selection process has ended. It concluded on ${end.toLocaleString()}.`
            });
        }

        // Check if there's an existing guide request that is pending or accepted
        if (team.guidePreference && (team.status === 'pending' || team.status === 'approved')) {
            return res.status(400).json({ message: 'You already have an active guide request or an assigned guide.' });
        }

        // Validate guideId
        const guide = await User.findById(guideId);
        if (!guide || guide.role === 'student' || guide.role === 'admin' || (!guide.roles.some(r => r.role === 'guide') && guide.role !== 'guide' && guide.role !== 'faculty')) {
            return res.status(400).json({ message: 'Invalid guide selected.' });
        }

        const isPg = team && team.programme && team.programme !== 'UG' && team.programme !== 'B.E COMPUTER SCIENCE AND ENGINEERING' && team.programme !== 'B.E. CSE';
        const programmeType = isPg ? 'PG' : 'UG';
        const limitMap = await buildDesignationLimitMap(programmeType, team.session);
        const countMap = await getTeamCountsByGuideIds([guide._id], programmeType, team.session);
        const currentTeamCount = countMap.get(guide._id.toString()) || 0;
        const limitStatus = resolveGuideLimitStatus(guide, currentTeamCount, limitMap);

        if (!limitStatus.canRequest && limitStatus.teamLimit !== null) {
            return res.status(400).json({ message: 'Request not available (limit reached)' });
        }

        // Update team with new guide preference and set status to pending
        team.guidePreference = guideId;
        team.status = 'pending';
        await team.save();

        res.json({ message: 'Guide request sent successfully!', team });

    } catch (error) {
        console.error('Error requesting guide:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get a student's assigned panel
exports.getAssignedPanel = async (req, res) => {
    try {
        const studentId = req.user.id; // Assuming req.user.id contains the student's ID
        console.log('Fetching assigned panel for studentId:', studentId); // Debug log

        // Find the team the student belongs to (either as a leader or a member)
        const team = (req.sessionId ? await Team.findOne({
            session: req.sessionId,
            $or: [
                { teamLeader: studentId },
                { members: studentId }
            ]
        }) : null) || await Team.findOne({
            $or: [
                { teamLeader: studentId },
                { members: studentId }
            ]
        });
        console.log('Found team for student:', team); // Debug log

        if (!team) {
            console.log('Team not found for student:', studentId); // Debug log
            return res.status(404).json({ message: 'Team not found for this student.' });
        }

        // Find the panel assignment for this team
        const assignmentQuery = { teams: team._id };
        if (team.session) {
            assignmentQuery.session = team.session;
        } else if (req.sessionId) {
            assignmentQuery.session = req.sessionId;
        }

        let assignment = await TeamPanelAssignment.findOne(assignmentQuery)
            .populate({
                path: 'panel',
                select: 'name members coordinator',
                populate: [
                    { path: 'members', select: 'username name memberType' },
                    { path: 'coordinator', select: 'username name' }
                ]
            });

        if (!assignment) {
            assignment = await TeamPanelAssignment.findOne({ teams: team._id })
                .populate({
                    path: 'panel',
                    select: 'name members coordinator',
                    populate: [
                        { path: 'members', select: 'username name memberType' },
                        { path: 'coordinator', select: 'username name' }
                    ]
                });
        }
        console.log('Found assignment for team:', assignment); // Debug log

        if (!assignment) {
            console.log('No panel assigned to team:', team._id); // Debug log
            return res.status(404).json({ message: 'No panel assigned to this team yet.' });
        }

        // Also fetch the team's guide to show in My Panel
        const teamWithGuide = await Team.findById(team._id)
            .select('guidePreference')
            .populate({ path: 'guidePreference', select: 'username name' });

        res.json({ panel: assignment.panel, guide: teamWithGuide?.guidePreference || null });
    } catch (error) {
        console.error('Error fetching assigned panel:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get max team size for public view
exports.getMaxTeamSizePublic = async (req, res) => {
    try {
        const programme = req.headers['x-selected-programme'] || req.headers['x-selected-program'] || req.query.programme;
        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};
        let config = null;
        if (programme) {
            config = await Config.findOne({
                programme: { $regex: new RegExp(`^${programme.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                ...sessionFilter
            });
            if (!config) {
                config = await Config.findOne({
                    programme: { $regex: new RegExp(`^${programme.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                });
            }
        }
        if (!config) {
            config = await Config.findOne(sessionFilter) || await Config.findOne();
        }
        if (!config) {
            return res.status(404).json({ message: 'Configuration not found' });
        }
        res.json({ maxTeamSize: config.maxTeamSize });
    } catch (error) {
        console.error('Error fetching public max team size:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get teams by comma-separated ids query parameter: ?ids=id1,id2
exports.getTeamsByIds = async (req, res) => {
    try {
        const idsParam = req.query.ids;
        if (!idsParam) return res.status(400).json({ message: 'ids query parameter required' });
        const ids = idsParam.split(',').map(id => id.trim()).filter(Boolean);
        const teams = await Team.find({ _id: { $in: ids } }).select('_id teamName programme session');
        res.json(teams);
    } catch (error) {
        console.error('Error in getTeamsByIds:', error);
        res.status(500).json({ message: 'Error fetching teams' });
    }
};

exports.uploadReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const team = (req.sessionId ? await Team.findOne({ session: req.sessionId, $or: [{ teamLeader: userId }, { members: userId }] }) : null)
            || await Team.findOne({ $or: [{ teamLeader: userId }, { members: userId }] });

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        if (!team.isLocked) {
            return res.status(403).json({ message: 'Team must be locked before uploading the final report.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const reportSession = team.session || req.sessionId || null;
        const existingReport = await FinalReport.findOne({ team: team._id, ...(reportSession ? { session: reportSession } : {}) });
        if (existingReport) {
            if (existingReport.status !== 'rejected') {
                return res.status(400).json({ message: 'Report already uploaded' });
            } else {
                const fs = require('fs');
                const path = require('path');
                const oldPath = path.join(__dirname, '..', existingReport.filePath);
                if (fs.existsSync(oldPath)) {
                    try {
                        fs.unlinkSync(oldPath);
                    } catch (e) {
                        console.warn('Failed to delete old rejected file:', e);
                    }
                }
                existingReport.filePath = req.file.path;
                existingReport.fileName = req.file.originalname;
                existingReport.uploadedBy = userId;
                if (reportSession && !existingReport.session) existingReport.session = reportSession;
                existingReport.status = 'uploaded';
                existingReport.remarks = '';
                existingReport.rejectedAt = null;
                existingReport.approvedBy = undefined;
                await existingReport.save();
                return res.status(200).json({ message: 'Report updated successfully', report: existingReport });
            }
        }

        const newReport = new FinalReport({
            team: team._id,
            filePath: req.file.path,
            fileName: req.file.originalname,
            uploadedBy: userId,
            session: reportSession
        });

        await newReport.save();
        res.status(201).json({ message: 'Report uploaded successfully', report: newReport });
    } catch (error) {
        console.error('Error uploading report:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getReportStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const team = (req.sessionId ? await Team.findOne({ session: req.sessionId, $or: [{ teamLeader: userId }, { members: userId }] }) : null)
            || await Team.findOne({ $or: [{ teamLeader: userId }, { members: userId }] });

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        const report = await FinalReport.findOne({ team: team._id, ...(team.session ? { session: team.session } : (req.sessionId ? { session: req.sessionId } : {})) })
            || await FinalReport.findOne({ team: team._id });

        if (!report) {
            return res.status(404).json({ message: 'Report not uploaded yet' });
        }

        res.json(report);
    } catch (error) {
        console.error('Error fetching report status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete the current user's team (leader-only)
exports.deleteMyTeam = async (req, res) => {
    try {
        const userId = req.user.id;

        // Only a leader can delete their team
        const team = (req.sessionId ? await Team.findOne({ teamLeader: userId, session: req.sessionId }) : null)
            || await Team.findOne({ teamLeader: userId });
        if (!team) {
            return res.status(404).json({ message: 'Team not found or you are not the team leader.' });
        }

        if (team.isLocked) {
            return res.status(400).json({ message: 'This team is locked and cannot be disbanded. Only an administrator can delete a locked team.' });
        }

        // Clear any schedules and assignments referencing this team
        try {
            const TimeTable = require('../models/TimeTable');
            await TimeTable.deleteMany({ team: team._id });
        } catch (e) { }
        try {
            const TeamPanelAssignment = require('../models/TeamPanelAssignment');
            await TeamPanelAssignment.updateMany({}, { $pull: { teams: team._id } });
        } catch (e) { }

        await Team.findByIdAndDelete(team._id);
        return res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ message: 'Error deleting team' });
    }
};

// Get all pending team invitations for a student
exports.getTeamInvitations = async (req, res) => {
    try {
        const userId = req.user.id;
        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};
        const invitations = await Team.find({
            ...sessionFilter,
            memberStatus: {
                $elemMatch: {
                    user: userId,
                    status: 'pending'
                }
            }
        }).populate('teamLeader', 'username name')
            .populate('memberStatus.user', 'username name');

        res.json(invitations);
    } catch (error) {
        console.error('Error fetching team invitations:', error);
        res.status(500).json({ message: 'Error fetching team invitations' });
    }
};

// Accept or reject a team invitation
exports.respondToInvitation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { teamId, action } = req.body;

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Must be accept or reject.' });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        const memberIdx = team.memberStatus.findIndex(m => m.user.toString() === userId && m.status === 'pending');
        if (memberIdx === -1) {
            return res.status(400).json({ message: 'No pending invitation found for this team.' });
        }

        if (action === 'accept') {
            team.memberStatus[memberIdx].status = 'accepted';
            if (!team.members.includes(userId)) {
                team.members.push(userId);
            }

            // Recalculate if team is complete
            const allAccepted = team.memberStatus.length > 0 && team.memberStatus.every(m => m.status === 'accepted');
            team.isTeamComplete = allAccepted;

            await team.save();

            // Set pending status in all other teams in this session to rejected
            const otherTeamFilter = {
                _id: { $ne: teamId },
                memberStatus: {
                    $elemMatch: {
                        user: userId,
                        status: 'pending'
                    }
                }
            };
            if (team.session) {
                otherTeamFilter.session = team.session;
            }

            await Team.updateMany(
                otherTeamFilter,
                {
                    $set: { 'memberStatus.$[elem].status': 'rejected' }
                },
                {
                    arrayFilters: [{ 'elem.user': userId, 'elem.status': 'pending' }]
                }
            );

            return res.json({ message: 'Invitation accepted successfully', team });
        } else {
            // reject
            team.memberStatus[memberIdx].status = 'rejected';
            team.members = team.members.filter(m => m.toString() !== userId);

            // Recalculate complete
            const allAccepted = team.memberStatus.length > 0 && team.memberStatus.every(m => m.status === 'accepted');
            team.isTeamComplete = allAccepted;

            await team.save();
            return res.json({ message: 'Invitation rejected successfully', team });
        }
    } catch (error) {
        console.error('Error responding to invitation:', error);
        res.status(500).json({ message: 'Error processing response to invitation' });
    }
};

// Invite a new member to an existing team (leader only)
exports.inviteMember = async (req, res) => {
    try {
        const userId = req.user.id;
        const { studentId } = req.body;

        const team = (req.sessionId ? await Team.findOne({ teamLeader: userId, session: req.sessionId }) : null)
            || await Team.findOne({ teamLeader: userId });
        if (!team) {
            return res.status(404).json({ message: 'Team not found or you are not the team leader.' });
        }

        if (team.isLocked) {
            return res.status(400).json({ message: 'This team is locked and cannot be modified.' });
        }

        // Get max team size from config for this programme and session
        const sessionFilter = team.session ? { session: team.session } : (req.sessionId ? { session: req.sessionId } : {});
        const config = (await Config.findOne({ programme: team.programme, ...sessionFilter }))
            || (await Config.findOne({ programme: team.programme }))
            || (await Config.findOne());
        const maxTeamSize = config ? config.maxTeamSize : 4;

        // Check current number of invited/accepted members + leader (1) (EXCLUDING REJECTED MEMBERS!)
        const activeInvitesCount = team.memberStatus.filter(m => m.status !== 'rejected').length;
        const currentTotalSize = activeInvitesCount + 1;
        if (currentTotalSize >= maxTeamSize) {
            return res.status(400).json({ message: `Team size cannot exceed ${maxTeamSize} members.` });
        }

        // Check if student is already in memberStatus
        const alreadyInvited = team.memberStatus.some(m => m.user.toString() === studentId);
        if (alreadyInvited) {
            const member = team.memberStatus.find(m => m.user.toString() === studentId);
            if (member.status === 'rejected') {
                member.status = 'pending';
                team.isTeamComplete = false;
                await team.save();
                return res.json({ message: 'Member re-invited successfully!', team });
            }
            return res.status(400).json({ message: 'Student is already invited or a member.' });
        }

        // Check if student is already a team leader or member of a complete team in this session
        const otherTeam = await Team.findOne({
            ...sessionFilter,
            $or: [
                { teamLeader: studentId },
                { members: studentId }
            ]
        });
        if (otherTeam) {
            return res.status(400).json({ message: 'Student is already part of another team.' });
        }

        // Add to memberStatus
        team.memberStatus.push({ user: studentId, status: 'pending' });
        team.isTeamComplete = false;
        await team.save();

        res.json({ message: 'Invitation sent successfully!', team });
    } catch (error) {
        console.error('Error inviting member:', error);
        res.status(500).json({ message: 'Error inviting member.' });
    }
};

// Remove a member from the team (leader only)
exports.removeMember = async (req, res) => {
    try {
        const userId = req.user.id;
        const { studentId } = req.body;

        const team = (req.sessionId ? await Team.findOne({ teamLeader: userId, session: req.sessionId }) : null)
            || await Team.findOne({ teamLeader: userId });
        if (!team) {
            return res.status(404).json({ message: 'Team not found or you are not the team leader.' });
        }

        if (team.isLocked) {
            return res.status(400).json({ message: 'This team is locked and cannot be modified.' });
        }

        // Remove from members
        team.members = team.members.filter(m => m.toString() !== studentId);

        // Remove from memberStatus
        team.memberStatus = team.memberStatus.filter(m => m.user.toString() !== studentId);

        // Recalculate completeness
        const allAccepted = team.memberStatus.length > 0 && team.memberStatus.every(m => m.status === 'accepted');
        team.isTeamComplete = allAccepted;

        await team.save();
        res.json({ message: 'Member removed successfully!', team });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ message: 'Error removing member.' });
    }
};

// Request to lock the team (leader only)
exports.requestLock = async (req, res) => {
    try {
        const userId = req.user.id;
        const team = (req.sessionId ? await Team.findOne({ teamLeader: userId, session: req.sessionId }) : null)
            || await Team.findOne({ teamLeader: userId });

        if (!team) {
            return res.status(404).json({ message: 'Team not found or you are not the team leader.' });
        }

        if (team.isLocked) {
            return res.status(400).json({ message: 'The team is already locked.' });
        }

        // CRITICAL CHECK: Enforce that no pending invitations exist before locking is authorized
        const hasPendingInvites = team.memberStatus.some(m => m.status === 'pending');
        if (hasPendingInvites) {
            return res.status(400).json({
                message: 'Cannot lock team. You have pending invitations. Please wait for them to respond or remove them before locking.'
            });
        }

        // Filter out accepted partners
        const acceptedMembers = team.memberStatus.filter(m => m.status === 'accepted');
        team.members = acceptedMembers.map(m => m.user);
        team.isTeamComplete = true;
        team.isLocked = true;

        // Reset lock approval consensus flags
        team.memberStatus.forEach(m => {
            if (m.status === 'accepted') {
                m.lockApproved = true;
            }
        });

        await team.save();
        return res.json({
            message: 'Your team configuration has been finalized and locked successfully!',
            team
        });
    } catch (error) {
        console.error('Error locking team:', error);
        res.status(500).json({ message: 'Error locking team.' });
    }
};

// Cancel lock request (leader only)
exports.cancelLockRequest = async (req, res) => {
    return res.status(400).json({ message: 'Team lock is immediate. There is no pending lock request to cancel.' });
};

// Approve lock request (member only)
exports.approveLock = async (req, res) => {
    return res.status(400).json({ message: 'Team lock is immediate. Member approval is not required.' });
};

// Cancel guide request (leader only)
exports.cancelGuideRequest = async (req, res) => {
    try {
        const teamLeaderId = req.user.id;

        // Find the team where the current user is the team leader
        const team = (req.sessionId ? await Team.findOne({ teamLeader: teamLeaderId, session: req.sessionId }) : null)
            || await Team.findOne({ teamLeader: teamLeaderId });

        if (!team) {
            return res.status(404).json({ message: 'Team not found or you are not the team leader.' });
        }

        if (!team.guidePreference) {
            return res.status(400).json({ message: 'No active guide request to cancel.' });
        }

        if (team.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending guide requests can be cancelled.' });
        }

        // Cancel the guide request
        team.guidePreference = null;
        team.status = 'pending';
        await team.save();

        res.json({ message: 'Guide request cancelled successfully!', team });
    } catch (error) {
        console.error('Error cancelling guide request:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
