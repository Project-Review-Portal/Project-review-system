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

        // Get all teams and extract both team leaders and accepted members
        const teams = await Team.find();
        let teamMemberIds = teams.flatMap(team => [
            team.teamLeader,
            ...(team.members || [])
        ]);

        // Ensure current user is also excluded from available students
        teamMemberIds = [...new Set([...teamMemberIds.filter(Boolean).map(id => id.toString()), currentUserId.toString()])];
        
        // Find students who are not in any team (neither as leader nor member) and not the current user
        const availableStudents = await User.find({
            'roles.role': 'student',
            _id: { $nin: teamMemberIds }
        }).select('username _id name');

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

        const guides = await User.find({
            'roles.role': 'guide',
            'memberType': 'internal', // Only show internal faculty as guides
            _id: { $nin: rejectedGuideIds }
        }).select('username name designation');

        const limitMap = await buildDesignationLimitMap();
        const guideIds = guides.map((guide) => guide._id);
        const countMap = await getTeamCountsByGuideIds(guideIds);

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

        // Check if user is already in a team
        const existingTeam = await Team.findOne({
            $or: [
                { teamLeader: teamLeaderId },
                { members: teamLeaderId }
            ]
        });

        if (existingTeam) {
            return res.status(400).json({ message: 'You are already part of a team' });
        }

        // Check if user has any pending invitations from other teams
        const pendingInvitations = await Team.findOne({
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

        // Get max team size from config
        const config = await Config.findOne();
        // Always allow team formation - no restrictions
        const maxTeamSize = config ? config.maxTeamSize : 4;

        // Validate team size
        if (members.length + 1 > maxTeamSize) {
            return res.status(400).json({ 
                message: `Team size cannot exceed ${maxTeamSize} members` 
            });
        }

        // Get the count of existing teams to generate the next sequential team name
        // const maxTeamNumber = await Team.find({}, {teamName : 1});

        const existingTeamNames = await Team.find({},{_id:0, teamName: 1})
        let numberTracker = 1;
        if (existingTeamNames){
            for(let x of existingTeamNames){
                if( numberTracker != Number(x.teamName.split(' ')[1]))
                    break;
                numberTracker++;
            }
        }

        const newTeamName = `Team ${numberTracker}`;

        // Create team
        const team = new Team({
            teamName: newTeamName, // Automatically generated team name
            teamLeader: teamLeaderId,
            members: [], // Keep empty until invitations are accepted
            memberStatus : members.map((m) => {
                return {
                    user : m,
                    status : 'pending'
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
        console.log('getUserTeam: Attempting to find team for userId:', userId);
        const team = await Team.findOne({
            $or: [
                { teamLeader: userId },
                { members: userId }
            ]
        }).populate('teamLeader members', 'username name')
          .populate({
              path: 'memberStatus.user',
              select: 'username name'
          })
          .populate({ 
              path: 'guidePreference', 
              select: 'username name'
          })
          .populate({ // Populate rejectedGuides to display names
              path: 'rejectedGuides',
              select: 'username name'
          });

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
        const team = await Team.findOne({ teamLeader: teamLeaderId });

        if (!team) {
            return res.status(404).json({ message: 'Team not found or you are not the team leader.' });
        }

        if (!team.isLocked) {
            return res.status(400).json({ message: 'You cannot request a guide until your team is locked and finalized.' });
        }

        // Check if there's an existing guide request that is pending or accepted
        if (team.guidePreference && (team.status === 'pending' || team.status === 'approved')) {
            return res.status(400).json({ message: 'You already have an active guide request or an assigned guide.' });
        }

        // Validate guideId
        const guide = await User.findById(guideId);
        if (!guide || !guide.roles.some(r => r.role === 'guide')) {
            return res.status(400).json({ message: 'Invalid guide selected.' });
        }

        const limitMap = await buildDesignationLimitMap();
        const countMap = await getTeamCountsByGuideIds([guide._id]);
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
        const team = await Team.findOne({
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
        const assignment = await TeamPanelAssignment.findOne({ teams: team._id })
            .populate({
                path: 'panel',
                select: 'name members coordinator',
                populate: [
                    { path: 'members', select: 'username name memberType' },
                    { path: 'coordinator', select: 'username name' }
                ]
            });
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
        const config = await Config.findOne();
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
        const teams = await Team.find({ _id: { $in: ids } }).select('_id teamName');
        res.json(teams);
    } catch (error) {
        console.error('Error in getTeamsByIds:', error);
        res.status(500).json({ message: 'Error fetching teams' });
    }
};

exports.uploadReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const team = await Team.findOne({ $or: [{ teamLeader: userId }, { members: userId }] });

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const existingReport = await FinalReport.findOne({ team: team._id });
        if (existingReport) {
            return res.status(400).json({ message: 'Report already uploaded' });
        }

        const newReport = new FinalReport({
            team: team._id,
            filePath: req.file.path,
            fileName: req.file.originalname,
            uploadedBy: userId,
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
        const team = await Team.findOne({ $or: [{ teamLeader: userId }, { members: userId }] });

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        const report = await FinalReport.findOne({ team: team._id });

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
        const team = await Team.findOne({ teamLeader: userId });
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
        } catch (e) {}
        try {
            const TeamPanelAssignment = require('../models/TeamPanelAssignment');
            await TeamPanelAssignment.updateMany({}, { $pull: { teams: team._id } });
        } catch (e) {}

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
        const invitations = await Team.find({
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

            // Set pending status in all other teams to rejected
            await Team.updateMany(
                {
                    _id: { $ne: teamId },
                    memberStatus: {
                        $elemMatch: {
                            user: userId,
                            status: 'pending'
                        }
                    }
                },
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

        const team = await Team.findOne({ teamLeader: userId });
        if (!team) {
            return res.status(404).json({ message: 'Team not found or you are not the team leader.' });
        }

        if (team.isLocked) {
            return res.status(400).json({ message: 'This team is locked and cannot be modified.' });
        }

        // Get max team size from config
        const config = await Config.findOne();
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

        // Check if student is already a team leader or member of a complete team
        const otherTeam = await Team.findOne({
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

        const team = await Team.findOne({ teamLeader: userId });
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
        const team = await Team.findOne({ teamLeader: userId });
        
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

        // Conditional Solo vs Group handling
        if (acceptedMembers.length === 0) {
            // No other accepted members, and zero pending members -> Lock solo instantly
            team.isLocked = true;
            team.lockRequested = false;
            
            await team.save();
            return res.json({ 
                message: 'Your solo team configuration has been finalized and locked successfully!', 
                team 
            });
        } else {
            // Group has accepted partners -> Start the collaborative voting loop
            team.lockRequested = true;
            
            // Reset lock approval consensus flags
            team.memberStatus.forEach(m => {
                if (m.status === 'accepted') {
                    m.lockApproved = false;
                }
            });

            await team.save();
            return res.json({ 
                message: 'Lock request sent to team members successfully!', 
                team 
            });
        }
    } catch (error) {
        console.error('Error requesting team lock:', error);
        res.status(500).json({ message: 'Error requesting team lock.' });
    }
};

// Cancel lock request (leader only)
exports.cancelLockRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const team = await Team.findOne({ teamLeader: userId });
        if (!team) {
            return res.status(404).json({ message: 'Team not found or you are not the team leader.' });
        }

        if (team.isLocked) {
            return res.status(400).json({ message: 'Cannot cancel. The team is already locked.' });
        }

        team.lockRequested = false;
        team.memberStatus.forEach(m => {
            m.lockApproved = false;
        });

        await team.save();
        res.json({ message: 'Lock request cancelled successfully!', team });
    } catch (error) {
        console.error('Error cancelling lock request:', error);
        res.status(500).json({ message: 'Error cancelling lock request.' });
    }
};

// Approve lock request (member only)
exports.approveLock = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find team where user is an accepted member and lock is requested
        const team = await Team.findOne({
            members: userId,
            lockRequested: true
        });

        if (!team) {
            return res.status(404).json({ message: 'No active lock request found for your team.' });
        }

        if (team.isLocked) {
            return res.status(400).json({ message: 'The team is already locked.' });
        }

        const memberIdx = team.memberStatus.findIndex(m => m.user.toString() === userId && m.status === 'accepted');
        if (memberIdx === -1) {
            return res.status(400).json({ message: 'Member not found or status not accepted.' });
        }

        team.memberStatus[memberIdx].lockApproved = true;

        // Check if all accepted members have approved lock
        const allApproved = team.memberStatus.filter(m => m.status === 'accepted').every(m => m.lockApproved === true);
        if (allApproved) {
            team.isLocked = true;
        }

        await team.save();
        res.json({ message: 'Lock approved successfully!', team });
    } catch (error) {
        console.error('Error approving lock request:', error);
        res.status(500).json({ message: 'Error approving lock request.' });
    }
};

// Cancel guide request (leader only)
exports.cancelGuideRequest = async (req, res) => {
    try {
        const teamLeaderId = req.user.id;

        // Find the team where the current user is the team leader
        const team = await Team.findOne({ teamLeader: teamLeaderId });

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
