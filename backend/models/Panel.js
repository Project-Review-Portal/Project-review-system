const mongoose = require('mongoose');

const panelSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    panelType: {
        type: String,
        enum: ['review', 'viva'],
        default: 'review'
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    coordinator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assistantCoordinators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    programme: {
        type: String,
        default: 'B.E. CSE'
    }
});

// Compound unique index: name must be unique within each panelType and programme
panelSchema.index({ name: 1, panelType: 1, programme: 1 }, { unique: true });

// Cascade deletion logic for Panel
panelSchema.pre('findOneAndDelete', async function(next) {
    const panelId = this.getQuery()._id;
    if (panelId) {
        await mongoose.model('Team').updateMany({ panel: panelId }, { $set: { panel: null, coordinator: null } });
        await mongoose.model('Team').updateMany({ vivaPanel: panelId }, { $set: { vivaPanel: null } });
        await mongoose.model('TeamPanelAssignment').deleteMany({ panel: panelId });
        try { await mongoose.model('TimeTable').deleteMany({ panel: panelId }); } catch(e) {}
    }
    next();
});

panelSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    const panelId = this._id;
    await mongoose.model('Team').updateMany({ panel: panelId }, { $set: { panel: null, coordinator: null } });
    await mongoose.model('Team').updateMany({ vivaPanel: panelId }, { $set: { vivaPanel: null } });
    await mongoose.model('TeamPanelAssignment').deleteMany({ panel: panelId });
    try { await mongoose.model('TimeTable').deleteMany({ panel: panelId }); } catch(e) {}
    next();
});

panelSchema.pre('deleteOne', { document: false, query: true }, async function(next) {
    const panelId = this.getQuery()._id;
    if (panelId) {
        await mongoose.model('Team').updateMany({ panel: panelId }, { $set: { panel: null, coordinator: null } });
        await mongoose.model('Team').updateMany({ vivaPanel: panelId }, { $set: { vivaPanel: null } });
        await mongoose.model('TeamPanelAssignment').deleteMany({ panel: panelId });
        try { await mongoose.model('TimeTable').deleteMany({ panel: panelId }); } catch(e) {}
    }
    next();
});

panelSchema.pre('deleteMany', async function(next) {
    const conditions = this.getQuery();
    if (conditions._id && conditions._id.$in) {
        const panelIds = conditions._id.$in;
        await mongoose.model('Team').updateMany({ panel: { $in: panelIds } }, { $set: { panel: null, coordinator: null } });
        await mongoose.model('Team').updateMany({ vivaPanel: { $in: panelIds } }, { $set: { vivaPanel: null } });
        await mongoose.model('TeamPanelAssignment').deleteMany({ panel: { $in: panelIds } });
        try { await mongoose.model('TimeTable').deleteMany({ panel: { $in: panelIds } }); } catch(e) {}
    }
    next();
});

module.exports = mongoose.model('Panel', panelSchema); 