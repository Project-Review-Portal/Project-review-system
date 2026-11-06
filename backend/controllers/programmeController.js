const Programme = require('../models/Programme');
const Config = require('../models/Config');

// Helper to ensure Config doc exists for a programme in a specific session
const ensureConfigForProgramme = async (programmeName, sessionId = null) => {
    const query = { programme: programmeName };
    if (sessionId) query.session = sessionId;

    await Config.findOneAndUpdate(
        query,
        {
            $setOnInsert: {
                programme: programmeName,
                session: sessionId || null,
                maxTeamSize: 4,
                numReviews: 3,
                vivaRequired: true,
                teamFormationOpen: true
            }
        },
        { upsert: true, new: true }
    );
};

// Get all programmes for current session
exports.getAllProgrammes = async (req, res) => {
    try {
        const query = req.sessionId ? { session: req.sessionId } : {};
        const programmes = await Programme.find(query).sort({ name: 1 });
        res.json(programmes);
    } catch (error) {
        console.error('Error fetching programmes:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add a single programme in current session
exports.addProgramme = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Programme name is required' });
        }
        const trimmedName = name.trim();
        const query = {
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
            ...(req.sessionId ? { session: req.sessionId } : {})
        };
        const existing = await Programme.findOne(query);
        if (existing) {
            return res.status(409).json({ message: `Programme "${trimmedName}" already exists in this session` });
        }
        const programme = new Programme({
            name: trimmedName,
            session: req.sessionId || null,
            status: 'active'
        });
        await programme.save();
        await ensureConfigForProgramme(trimmedName, req.sessionId);

        res.status(201).json({ message: 'Programme added successfully', programme });
    } catch (error) {
        console.error('Error adding programme:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Bulk add programmes (from CSV array) in current session
exports.bulkAddProgrammes = async (req, res) => {
    try {
        const { names } = req.body; // array of strings
        if (!Array.isArray(names) || names.length === 0) {
            return res.status(400).json({ message: 'names must be a non-empty array' });
        }

        let added = 0;
        let skipped = [];

        for (const rawName of names) {
            const name = (rawName || '').trim();
            if (!name) { skipped.push('(empty)'); continue; }
            const query = {
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                ...(req.sessionId ? { session: req.sessionId } : {})
            };
            const existing = await Programme.findOne(query);
            if (existing) { skipped.push(name); continue; }
            await new Programme({
                name,
                session: req.sessionId || null,
                status: 'active'
            }).save();
            await ensureConfigForProgramme(name, req.sessionId);
            added++;
        }

        res.json({ message: `Added ${added} programmes. Skipped: ${skipped.join(', ') || 'none'}`, added, skipped });
    } catch (error) {
        console.error('Error bulk adding programmes:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update a programme (rename) in current session
exports.updateProgramme = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Programme name is required' });
        }
        const trimmedName = name.trim();

        const oldProgramme = await Programme.findById(id);
        if (!oldProgramme) return res.status(404).json({ message: 'Programme not found' });

        // Check no collision with another doc in the same session
        const conflictQuery = {
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
            _id: { $ne: id },
            ...(oldProgramme.session ? { session: oldProgramme.session } : {})
        };
        const conflict = await Programme.findOne(conflictQuery);
        if (conflict) {
            return res.status(409).json({ message: `Programme "${trimmedName}" already exists in this session` });
        }

        const oldName = oldProgramme.name;
        oldProgramme.name = trimmedName;
        await oldProgramme.save();

        // Update Config programme field if old Config existed
        const configQuery = {
            programme: oldName,
            ...(oldProgramme.session ? { session: oldProgramme.session } : {})
        };
        await Config.findOneAndUpdate(configQuery, { programme: trimmedName });
        await ensureConfigForProgramme(trimmedName, oldProgramme.session);

        res.json({ message: 'Programme updated', programme: oldProgramme });
    } catch (error) {
        console.error('Error updating programme:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a programme
exports.deleteProgramme = async (req, res) => {
    try {
        const { id } = req.params;
        const programme = await Programme.findByIdAndDelete(id);
        if (!programme) return res.status(404).json({ message: 'Programme not found' });

        const configQuery = {
            programme: programme.name,
            ...(programme.session ? { session: programme.session } : {})
        };
        await Config.deleteOne(configQuery);

        res.json({ message: `Programme "${programme.name}" deleted` });
    } catch (error) {
        console.error('Error deleting programme:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Toggle single programme status (active <-> paused)
exports.toggleProgrammeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const programme = await Programme.findById(id);
        if (!programme) return res.status(404).json({ message: 'Programme not found' });

        programme.status = programme.status === 'paused' ? 'active' : 'paused';
        await programme.save();

        res.json({
            message: `Programme "${programme.name}" is now ${programme.status}.`,
            programme
        });
    } catch (error) {
        console.error('Error toggling programme status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Bulk set programme status for a session (activate all / pause all)
exports.bulkSetProgrammeStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const sessionId = req.sessionId || req.body.sessionId;
        if (!['active', 'paused'].includes(status)) {
            return res.status(400).json({ message: 'Status must be active or paused' });
        }
        const query = sessionId ? { session: sessionId } : {};
        const result = await Programme.updateMany(query, { $set: { status } });

        res.json({
            message: `All programmes have been ${status === 'active' ? 'activated' : 'paused'} (${result.modifiedCount} updated).`,
            status
        });
    } catch (error) {
        console.error('Error bulk updating programme status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


