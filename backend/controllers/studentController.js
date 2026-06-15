const path = require('path');
const fs = require('fs');
const Team = require('../models/Team');
const TimeTable = require('../models/TimeTable');
const InstructionTemplate = require('../models/InstructionTemplate')

exports.getReviewSchedule = async (req, res) => {
    try {
        const studentId = req.user.id;

        const team = await Team.findOne({ $or: [{ members: studentId }, { teamLeader: studentId }] });

        if (!team) {
            return res.json([]);
        }

        const schedules = await TimeTable.find({ team: team._id, isNotified: true })
            .populate({
                path: 'team',
                select: 'teamName guidePreference',
                populate: { path: 'guidePreference', select: 'name username' }
            })
            .populate({
                path: 'panel',
                select: 'name members coordinator',
                populate: [
                    { path: 'members', select: 'name username memberType' },
                    { path: 'coordinator', select: 'name username' }
                ]
            })
            .sort({ startTime: 1 });

        res.json(schedules);
    } catch (error) {
        console.error('Error fetching student review schedule:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 
exports.getInstructionTemplate = async (req, res) => {
    try {
        // 1. Get userId from query parameters (?userId=...)
        // Note: If you use an auth middleware that sets req.user, you can change this to: const userId = req.user.id;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ 
                message: "User ID is required to fetch instructions." 
            });
        }

        // 2. Find the team where this user is either the Leader OR a Member
        const team = await Team.findOne({
            $or: [
                { teamLeader: userId },
                { members: userId } // Mongoose automatically checks inside arrays for matching IDs
            ]
        }).select('panel');

        // 3. Guard: Check if a team exists for this user
        if (!team) {
            return res.status(404).json({ 
                message: "Your team has not been formed yet. Please form or join a team to view instructions." 
            });
        }

        // 4. Guard: Check if a panel has been assigned to this team
        if (!team.panel) {
            return res.status(404).json({ 
                message: "Your team has been formed, but no viva panel has been allotted to you yet." 
            });
        }

        // 5. Fetch instruction templates matching the extracted panel ID
        const templates = await InstructionTemplate.find({ panels: team.panel })
            .populate('uploadedBy', 'name') // Pulls only the coordinator's name from User table
            .select('reviewInstructions filePath fileName uploadedBy createdAt')
            .sort({ createdAt: -1 });

        if (!templates || templates.length === 0) {
            return res.status(404).json({ 
                message: "No instructions found for your allotted Panel." 
            });
        }

        // 6. Return instructions along with panel ID for your frontend UI
        return res.status(200).json({
            success: true,
            panelId: team.panel,
            data: templates
        });

    } catch (error) {
        console.error('Error in getInstructionTemplate:', error);
        return res.status(500).json({ 
            message: 'Server error while retrieving instructions.' 
        });
    }
};

// GET: Stream file attachment matching a specific templateId passed via route parameters
exports.downloadTemplateFile = async (req, res) => {
    try {
        // Reads from URL path parameter: /api/download-instruction/XYZ
        const { templateId } = req.params;

        const template = await InstructionTemplate.findById(templateId);
        
        if (!template) {
            return res.status(404).json({ message: 'Instruction template not found' });
        }

        if (!template.filePath || !template.fileName) {
            return res.status(400).json({ message: 'No file is attached to this instruction template' });
        }

        const filePath = path.join(__dirname, '..', template.filePath);

        if (fs.existsSync(filePath)) {
            res.download(filePath, template.fileName);
        } else {
            return res.status(404).json({ message: 'The requested file does not exist on the server' });
        }

    } catch (error) {
        console.error('Error downloading instruction file:', error);
        return res.status(500).json({ message: 'Server error during file retrieval' });
    }
};