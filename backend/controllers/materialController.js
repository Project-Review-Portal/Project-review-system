const path = require('path');
const fs = require('fs');
const MaterialSetting = require('../models/MaterialSetting');
const FinalReport = require('../models/FinalReport');
const Panel = require('../models/Panel');
const Team = require('../models/Team');

// ---------------------------------------------------------------------------
// Helper — build a case-insensitive regex for programme matching
// ---------------------------------------------------------------------------
function programmeRegex(programme) {
    const escaped = programme.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    return new RegExp(`^${escaped}$`, 'i');
}

const normalizeProgramme = (prog) => {
    if (!prog) return 'B.E. CSE';
    const clean = String(prog).trim();
    if (clean.toLowerCase() === 'ug' || clean === 'B.E COMPUTER SCIENCE AND ENGINEERING') {
        return 'B.E. CSE';
    }
    return clean;
};

// ---------------------------------------------------------------------------
// GET /api/materials/settings
// Coordinator only — returns settings they created for their current programme
// ---------------------------------------------------------------------------
exports.getMaterialSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const rawProgramme = req.headers['programme'] || req.user.programme;
        const programme = normalizeProgramme(rawProgramme);
        const settings = await MaterialSetting.find({
            createdBy: userId,
            programme: programmeRegex(programme)
        }).populate('panel', 'name');

        res.json(settings);
    } catch (error) {
        console.error('Error fetching material settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// POST /api/materials/settings
// Coordinator only — create a new material requirement setting
// ---------------------------------------------------------------------------
exports.createMaterialSetting = async (req, res) => {
    try {
        const { name, fileType, isRequired } = req.body;
        const userId = req.user.id;
        const rawProgramme = req.headers['programme'] || req.user.programme;
        const programme = normalizeProgramme(rawProgramme);
        // Try to find the coordinator's panel for this programme — optional
        const panel = await Panel.findOne({
            coordinator: userId,
            programme: programmeRegex(programme)
        });

        const setting = new MaterialSetting({
            panel: panel ? panel._id : null,
            programme,
            name,
            fileType: fileType ? fileType.toLowerCase().trim() : fileType,
            isRequired,
            createdBy: userId
        });

        await setting.save();
        res.status(201).json(setting);
    } catch (error) {
        console.error('Error creating material setting:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// PUT /api/materials/settings/:id
// Coordinator only — update their own setting
// ---------------------------------------------------------------------------
exports.updateMaterialSetting = async (req, res) => {
    try {
        const { name, fileType, isRequired } = req.body;
        const { id } = req.params;

        const setting = await MaterialSetting.findById(id);
        if (!setting) {
            return res.status(404).json({ message: 'Setting not found.' });
        }

        if (setting.createdBy.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this setting.' });
        }

        setting.name = name;
        setting.fileType = fileType ? fileType.toLowerCase().trim() : fileType;
        setting.isRequired = isRequired;

        await setting.save();
        res.json(setting);
    } catch (error) {
        console.error('Error updating material setting:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/materials/settings/:id
// Coordinator only — delete setting and cascade remove uploads
// ---------------------------------------------------------------------------
exports.deleteMaterialSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const setting = await MaterialSetting.findById(id);

        if (!setting) {
            return res.status(404).json({ message: 'Setting not found.' });
        }

        if (setting.createdBy.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this setting.' });
        }

        await setting.deleteOne();
        await FinalReport.deleteMany({ materialSetting: id });

        res.json({ message: 'Setting deleted successfully.' });
    } catch (error) {
        console.error('Error deleting material setting:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// GET /api/materials/student/requirements
// Student only — returns settings & uploads scoped to their team's coordinator
// ---------------------------------------------------------------------------
exports.getStudentRequirements = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find the student's team (they may be teamLeader or a regular member)
        const team = await Team.findOne({
            $or: [
                { members: userId },
                { teamLeader: userId }
            ]
        }).populate('panel');

        if (!team) {
            return res.status(404).json({ message: 'Team not found. Please join or form a team first.' });
        }

        let settings = [];

        if (team.panel && team.panel.coordinator) {
            // Primary path: find settings created by the panel coordinator for this programme
            settings = await MaterialSetting.find({
                createdBy: team.panel.coordinator,
                programme: programmeRegex(normalizeProgramme(team.programme))
            });
        } else {
            // Fallback: no panel yet — try to find settings by programme only
            // (returns nothing if no coordinator has configured settings for this programme)
            settings = await MaterialSetting.find({
                programme: programmeRegex(normalizeProgramme(team.programme))
            });
        }

        // Populate materialSetting so frontend can compare by _id safely
        const uploads = await FinalReport.find({ team: team._id })
            .populate('materialSetting', '_id name fileType isRequired');

        console.log(`[getStudentRequirements] team=${team._id} settings=${settings.length} uploads=${uploads.length}`);
        res.json({ settings, uploads });
    } catch (error) {
        console.error('Error fetching student requirements:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// POST /api/materials/student/upload/:settingId
// Student only — upload a material file for a specific setting
// ---------------------------------------------------------------------------
exports.uploadMaterial = async (req, res) => {
    try {
        const { settingId } = req.params;
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        // Resolve the student's team
        const team = await Team.findOne({
            $or: [
                { members: userId },
                { teamLeader: userId }
            ]
        });

        if (!team) {
            return res.status(404).json({ message: 'Team not found.' });
        }

        if (!team.isLocked) {
            return res.status(400).json({ message: 'Your team must be locked before uploading materials.' });
        }

        const setting = await MaterialSetting.findById(settingId);
        if (!setting) {
            return res.status(404).json({ message: 'Material setting not found.' });
        }

        // ── File type validation ──────────────────────────────────────────
        // setting.fileType is expected to be a comma-separated list or a single
        // extension e.g. "pdf" or "pdf,zip,docx"
        const allowedTypes = setting.fileType
            .split(',')
            .map(t => t.trim().toLowerCase().replace(/^\./, ''));

        const uploadedExt = path.extname(req.file.originalname)
            .toLowerCase()
            .replace(/^\./, '');

        if (allowedTypes.length > 0 && !allowedTypes.includes(uploadedExt)) {
            // Remove the already-saved file to avoid orphaned uploads
            try { fs.unlinkSync(req.file.path); } catch (_) {}
            return res.status(400).json({
                message: `Invalid file type. Expected: ${allowedTypes.join(', ')}. Got: ${uploadedExt || 'unknown'}.`
            });
        }
        // ─────────────────────────────────────────────────────────────────

        // Check if an upload already exists for this team+setting
        let upload = await FinalReport.findOne({ team: team._id, materialSetting: settingId });

        if (upload) {
            if (upload.status === 'approved') {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
                return res.status(400).json({ message: 'Cannot replace an approved material.' });
            }
            // Replace the existing upload
            upload.filePath = req.file.path.replace(/\\/g, '/');
            upload.fileName = req.file.originalname;
            upload.uploadedBy = userId;
            upload.status = 'uploaded';
            upload.remarks = '';
            await upload.save();
        } else {
            upload = new FinalReport({
                team: team._id,
                materialSetting: settingId,
                filePath: req.file.path.replace(/\\/g, '/'),
                fileName: req.file.originalname,
                uploadedBy: userId,
                status: 'uploaded'
            });
            await upload.save();
        }

        // Return upload with materialSetting populated for immediate frontend use
        await upload.populate('materialSetting', '_id name fileType isRequired');
        res.status(201).json({ message: 'File uploaded successfully.', upload });
    } catch (error) {
        console.error('Error uploading material:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// GET /api/materials/review/teams
// Coordinator & Guide — returns teams, settings, and uploads scoped to their role
//
// Coordinator → sees teams in the panels they coordinate in the given programme
// Guide       → sees teams where they are the approved guide in the given programme
// ---------------------------------------------------------------------------
exports.getTeamsMaterials = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        
        // ── READ ROLE FROM HEADER WITH REQ.USER FALLBACK ───────────────────
        const role = req.headers['role'] || (req.user && req.user.role);

        const rawProgramme = req.headers['programme'] || req.user?.programme;
        const targetProgramme = normalizeProgramme(rawProgramme);
        const progRegex = programmeRegex(targetProgramme);

        let teams = [];
        let settings = [];
        
        console.log("Resolved Role:", role);

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: No User ID found' });
        }

        // ── 1. Resolve teams based on role ─────────────────────────────────
        if (role === 'coordinator' )
        {
            // Coordinator: teams under any panel they coordinate in this programme
            const panels = await Panel.find({ coordinator: userId, programme: progRegex });

            if (panels.length > 0) {
                const panelIds = panels.map(p => p._id);
                teams = await Team.find({
                    panel: { $in: panelIds },
                    programme: progRegex
                }).populate('panel', 'name coordinator');
            }

            // Settings: settings created by the logged-in coordinator for this programme
            settings = await MaterialSetting.find({
                createdBy: userId,
                programme: progRegex
            });

        } else if (role === 'guide' ) 
        {
            // Guide logic remains unchanged
            teams = await Team.find({
                guidePreference: userId,
                status: 'approved',
                programme: progRegex
            }).populate('panel', 'name coordinator');

            if (teams.length > 0) {
                const coordinatorIds = [];
                teams.forEach(t => {
                    if (t.panel && t.panel.coordinator) {
                        const cid = t.panel.coordinator.toString();
                        if (!coordinatorIds.includes(cid)) coordinatorIds.push(cid);
                    }
                });

                if (coordinatorIds.length > 0) {
                    settings = await MaterialSetting.find({
                        createdBy: { $in: coordinatorIds },
                        programme: progRegex
                    });
                } else {
                    settings = await MaterialSetting.find({ programme: progRegex });
                }
            }
        }

        if (!teams || teams.length === 0) {
            return res.json({ settings, uploads: [], teams: [] });
        }

        // ── 2. Fetch all uploads for these teams ───────────────────────────
        const teamIds = teams.map(t => t._id);
        const uploads = await FinalReport.find({ team: { $in: teamIds } })
            .populate('team', 'teamName _id programme')
            .populate('materialSetting', '_id name fileType isRequired');

        return res.json({ settings, uploads, teams });
    } catch (error) {
        console.error('Error fetching teams materials:', error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// PUT /api/materials/review/:uploadId/status
// Coordinator & Guide — approve or reject a student's upload
// ---------------------------------------------------------------------------
exports.updateUploadStatus = async (req, res) => {
    try {
        const { uploadId } = req.params;
        const { status, remarks } = req.body;
        const userId = req.user.id;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be "approved" or "rejected".' });
        }

        const upload = await FinalReport.findById(uploadId);
        if (!upload) {
            return res.status(404).json({ message: 'Upload not found.' });
        }

        upload.status = status;
        if (status === 'approved') {
            upload.approvedBy = userId;
            upload.remarks = '';
        } else if (status === 'rejected') {
            upload.remarks = remarks || '';
            upload.rejectedAt = new Date();
            upload.rejections.push({
                fileName: upload.fileName,
                filePath: upload.filePath,
                remarks: remarks || ''
            });
        }

        await upload.save();

        // Return with materialSetting populated
        await upload.populate('materialSetting', '_id name fileType isRequired');
        await upload.populate('team', 'teamName _id programme');
        res.json(upload);
    } catch (error) {
        console.error('Error updating upload status:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// GET /api/materials/download/:uploadId
// Coordinator, Guide, Student — download a file
// ---------------------------------------------------------------------------
exports.downloadMaterial = async (req, res) => {
    try {
        const { uploadId } = req.params;
        const upload = await FinalReport.findById(uploadId);
        if (!upload) {
            return res.status(404).json({ message: 'File not found.' });
        }

        const filePath = path.resolve(upload.filePath);

        if (fs.existsSync(filePath)) {
            res.download(filePath, upload.fileName);
        } else {
            res.status(404).json({ message: 'File no longer exists on server.' });
        }
    } catch (error) {
        console.error('Error downloading material:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};