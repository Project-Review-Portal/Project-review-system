const Team = require('../models/Team');
const User = require('../models/User');
const Config = require('../models/Config');
const TeamPanelAssignment = require('../models/TeamPanelAssignment');
const FinalReport = require('../models/FinalReport');

// Get available students (not in any team)
exports.getAvailableStudents = async (req, res) => {
    try {
        const currentUserId = req.user.id; // Get the ID of the logged-in user

        // Get all teams and extract both team leaders and members
        const teams = await Team.find();
        let teamMemberIds = teams.flatMap(team => [
            team.teamLeader,
            ...(team.members || [])
        ]);

        // Ensure current user is also excluded from available students
        teamMemberIds = [...new Set([...teamMemberIds.map(id => id.toString()), currentUserId.toString()])];
        
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
        }).select('username name');
        
        res.json(guides);
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
        const teamCount = await Team.countDocuments({});
        const newTeamName = `Team ${teamCount + 1}`;

        // Create team
        const team = new Team({
            teamName: newTeamName, // Automatically generated team name
            teamLeader: teamLeaderId,
            members,
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

        // Check if there's an existing guide request that is pending or accepted
        if (team.guidePreference && (team.status === 'pending' || team.status === 'approved')) {
            return res.status(400).json({ message: 'You already have an active guide request or an assigned guide.' });
        }

        // Validate guideId
        const guide = await User.findById(guideId);
        if (!guide || !guide.roles.some(r => r.role === 'guide')) {
            return res.status(400).json({ message: 'Invalid guide selected.' });
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
