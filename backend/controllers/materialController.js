const path = require('path');
const fs = require('fs');
const MaterialSetting = require('../models/MaterialSetting');
const FinalReport = require('../models/FinalReport');
const Panel = require('../models/Panel');
const Team = require('../models/Team');
const TeamPanelAssignment = require('../models/TeamPanelAssignment')
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
// Optional query param: ?panelId=<id> to filter by specific panel
// ---------------------------------------------------------------------------
exports.getMaterialSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const programme = req.headers['programme'] || req.user.programme || 'UG';
        // console.log(req.user.programme , req.headers['programme'] , 'UG');
        const settings = await MaterialSetting.find({
            createdBy: userId,
            programme: programmeRegex(programme)
        };

        if (panelId) {
            query.panel = panelId;
        }

        const settings = await MaterialSetting.find(query).populate('panel', 'name');
        res.json(settings);
    } catch (error) {
        console.error('Error fetching material settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// POST /api/materials/settings
// Coordinator only — create a new material requirement setting
// Body: { name, fileType: string[], isRequired, panelId? }
// ---------------------------------------------------------------------------
exports.createMaterialSetting = async (req, res) => {
    try {
        const { name, fileType, isRequired, panelId } = req.body;
        const userId = req.user.id;
        const programme =  req.headers['programme'] || req.user.programme ||'UG';
        console.log(req.headers['programme'] , req.user.programme ,'UG')
        // Try to find the coordinator's panel for this programme — optional
        const panel = await Panel.findOne({
            coordinator: userId,
            programme: programmeRegex(programme)
        });

        const setting = new MaterialSetting({
            panel: resolvedPanelId,
            programme,
            name,
            fileType: normalisedFileType,
            isRequired,
            createdBy: userId
        });

        await setting.save();
        await setting.populate('panel', 'name');
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

        // Normalise fileType to array
        const normalisedFileType = Array.isArray(fileType)
            ? fileType.map(t => t.trim().toLowerCase()).filter(Boolean)
            : typeof fileType === 'string'
                ? fileType.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
                : setting.fileType;

        setting.name = name;
        setting.fileType = normalisedFileType;
        setting.isRequired = isRequired;

        await setting.save();
        await setting.populate('panel', 'name');
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
// Only shows settings for the student's specific panel
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
            // Strict path: find settings specifically for this team's panel
            settings = await MaterialSetting.find({
                createdBy: team.panel.coordinator,
                programme: programmeRegex(team.programme || 'UG')
            });

            // Fallback: if no panel-specific settings, get all settings by coordinator for programme
            if (settings.length === 0) {
                settings = await MaterialSetting.find({
                    createdBy: team.panel.coordinator,
                    programme: programmeRegex(team.programme || 'UG')
                });
            }
        } else {
            // No panel assigned yet — try to find settings by programme only
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
// Student only — upload a material file for a specific setting (saves as draft)
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
        // setting.fileType is now an array of lowercase extensions
        const allowedTypes = Array.isArray(setting.fileType)
            ? setting.fileType.map(t => t.trim().toLowerCase().replace(/^\./, ''))
            : [];

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
            // Replace the existing upload — reset to draft
            upload.filePath = req.file.path.replace(/\\/g, '/');
            upload.fileName = req.file.originalname;
            upload.uploadedBy = userId;
            upload.status = 'draft';
            upload.remarks = '';
            await upload.save();
        } else {
            upload = new FinalReport({
                team: team._id,
                materialSetting: settingId,
                filePath: req.file.path.replace(/\\/g, '/'),
                fileName: req.file.originalname,
                uploadedBy: userId,
                status: 'draft'
            });
            await upload.save();
        }

        // Return upload with materialSetting populated for immediate frontend use
        await upload.populate('materialSetting', '_id name fileType isRequired');
        res.status(201).json({ message: 'File saved as draft successfully.', upload });
    } catch (error) {
        console.error('Error uploading material:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// PUT /api/materials/student/submit
// Student only — promotes all draft uploads for their team to 'uploaded'
// This makes them visible to the coordinator/guide for review
// ---------------------------------------------------------------------------
exports.submitMaterials = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Resolve the student's team
        const team = await Team.findOne({
            $or: [
                { members: userId },
                { teamLeader: userId }
            ]
        }).populate('panel');

        if (!team) {
            return res.status(404).json({ message: 'Team not found.' });
        }

        if (!team.isLocked) {
            return res.status(400).json({ message: 'Your team must be locked before submitting materials.' });
        }

        // 2. Fetch the material settings expected for this team
        let settings = [];
        if (team.panel && team.panel.coordinator) {
            settings = await MaterialSetting.find({
                createdBy: team.panel.coordinator,
                panel: team.panel._id,
                programme: programmeRegex(team.programme || 'UG')
            });
            if (settings.length === 0) {
                settings = await MaterialSetting.find({
                    createdBy: team.panel.coordinator,
                    programme: programmeRegex(team.programme || 'UG')
                });
            }
        } else {
            settings = await MaterialSetting.find({
                programme: programmeRegex(team.programme || 'UG')
            });
        }

        // 3. Fetch existing uploads for this team
        const uploads = await FinalReport.find({ team: team._id });

        // 4. Map settings that have a VALID upload (we explicitly ignore 'rejected' ones)
        const validUploadedSettingIds = uploads
            .filter(u => u.status !== 'rejected')
            .map(u => (u.materialSetting ? u.materialSetting.toString() : null))
            .filter(Boolean);

        // 5. Verify if any required file is missing or remains uncorrected/rejected
        const missingRequiredSettings = settings.filter(setting => 
            setting.isRequired && !validUploadedSettingIds.includes(setting._id.toString())
        );

        if (missingRequiredSettings.length > 0) {
            const missingNames = missingRequiredSettings.map(s => s.name).join(', ');
            return res.status(400).json({ 
                message: `Cannot submit. The following required material(s) must be re-uploaded or are missing: ${missingNames}` 
            });
        }

        // 6. Promote all drafts to 'pending'
        const result = await FinalReport.updateMany(
            { team: team._id, status: 'draft' },
            { $set: { status: 'pending' } }
        );

        // Fetch fresh list to return back to UI state
        const updatedUploads = await FinalReport.find({ team: team._id })
            .populate('materialSetting', '_id name fileType isRequired');

        res.json({
            message: `${result.modifiedCount} file(s) submitted successfully.`,
            uploads: updatedUploads
        });
    } catch (error) {
        console.error('Error submitting materials:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// GET /api/materials/review/teams
// Coordinator & Guide — returns teams, settings, and uploads scoped to their role
// Filters out 'draft' uploads — coordinator/guide only see uploaded/approved/rejected
// ---------------------------------------------------------------------------
exports.getTeamsMaterials = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const role = req.headers['role'] || (req.user && req.user.role);

        const targetProgramme = req.headers['programme'] || req.user?.programme || 'UG';
        const progRegex = programmeRegex(targetProgramme);

        let teams = [];
        let settings = [];
        let targetPanelIds = [];

        console.log("Resolved Role:", role);

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: No User ID found' });
        }

        // ── 1. Resolve Panels & Teams based on role ─────────────────────────
        if (role === 'coordinator') {
            // Coordinator: Find all panels they manage within the target programme
            const panels = await Panel.find({ coordinator: userId, programme: progRegex });
            
            if (panels.length > 0) {
                targetPanelIds = panels.map(p => p._id);

                // Option A: If panel assignments are mapped in TeamPanelAssignment schema
                const assignments = await TeamPanelAssignment.find({ panel: { $in: targetPanelIds } });
                const assignedTeamIds = assignments.flatMap(a => a.teams);

                // Fetch full team profiles
                teams = await Team.find({
                    _id: { $in: assignedTeamIds },
                    programme: progRegex
                }).populate('panel', 'name coordinator');

                /* 
                  NOTE: If team documents directly store their panel reference (e.g., team.panel), 
                  you can fall back to the original method if the assignment collection is empty:
                  if (teams.length === 0) {
                      teams = await Team.find({ panel: { $in: targetPanelIds }, programme: progRegex }).populate('panel', 'name coordinator');
                  }
                */
            }

            // Settings: Get settings specifically assigned to these panels OR global program settings (panel: null)
            settings = await MaterialSetting.find({
                programme: progRegex,
                $or: [
                    { panel: { $in: targetPanelIds } },
                    { panel: null, createdBy: userId } // Fallback for settings created before a panel was assigned
                ]
            });

        } else if (role === 'guide') {
            // Guide: Find teams where this user is the approved guide
            teams = await Team.find({
                guidePreference: userId,
                status: 'approved',
                programme: progRegex
            }).populate('panel', 'name coordinator');

            if (teams.length > 0) {
                const teamIds = teams.map(t => t._id);

                // Find panels assigned to these guide's teams via TeamPanelAssignment
                const assignments = await TeamPanelAssignment.find({ teams: { $in: teamIds } });
                targetPanelIds = assignments.map(a => a.panel);

                // Also collect direct panel IDs from populated team documents if available
                teams.forEach(t => {
                    if (t.panel && !targetPanelIds.some(pid => pid.toString() === t.panel._id.toString())) {
                        targetPanelIds.push(t.panel._id);
                    }
                });

                // Settings: Fetch settings belonging to the guide's panels, or fall back to program defaults
                settings = await MaterialSetting.find({
                    programme: progRegex,
                    $or: [
                        { panel: { $in: targetPanelIds } },
                        { panel: null } 
                    ]
                });
            }
        }

        if (!teams || teams.length === 0) {
            return res.json({ settings, uploads: [], teams: [] });
        }

        // ── 2. Fetch uploads for these teams — EXCLUDING drafts ────────────
        const teamIds = teams.map(t => t._id);
        const uploads = await FinalReport.find({
            team: { $in: teamIds },
            status: { $ne: 'draft' }   // coordinator/guide never see draft uploads
        })
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