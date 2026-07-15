const Programme = require('../models/Programme');

// Get all programmes
exports.getAllProgrammes = async (req, res) => {
    try {
        const programmes = await Programme.find().sort({ name: 1 });
        res.json(programmes);
    } catch (error) {
        console.error('Error fetching programmes:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add a single programme
exports.addProgramme = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Programme name is required' });
        }
        const trimmedName = name.trim();
        const existing = await Programme.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
        if (existing) {
            return res.status(409).json({ message: `Programme "${trimmedName}" already exists` });
        }
        const programme = new Programme({ name: trimmedName });
        await programme.save();
        res.status(201).json({ message: 'Programme added successfully', programme });
    } catch (error) {
        console.error('Error adding programme:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Bulk add programmes (from CSV array)
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
            const existing = await Programme.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
            if (existing) { skipped.push(name); continue; }
            await new Programme({ name }).save();
            added++;
        }

        res.json({ message: `Added ${added} programmes. Skipped: ${skipped.join(', ') || 'none'}`, added, skipped });
    } catch (error) {
        console.error('Error bulk adding programmes:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update a programme (rename)
exports.updateProgramme = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Programme name is required' });
        }
        const trimmedName = name.trim();

        // Check no collision with another doc
        const conflict = await Programme.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }, _id: { $ne: id } });
        if (conflict) {
            return res.status(409).json({ message: `Programme "${trimmedName}" already exists` });
        }

        const programme = await Programme.findByIdAndUpdate(id, { name: trimmedName }, { new: true });
        if (!programme) return res.status(404).json({ message: 'Programme not found' });

        res.json({ message: 'Programme updated', programme });
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
        res.json({ message: `Programme "${programme.name}" deleted` });
    } catch (error) {
        console.error('Error deleting programme:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
