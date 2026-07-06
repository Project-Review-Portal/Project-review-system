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
        default: 'UG'
    }
});

// Compound unique index: name must be unique within each panelType and programme
panelSchema.index({ name: 1, panelType: 1, programme: 1 }, { unique: true });

// Cascade deletion logic for Panel
panelSchema.pre('findOneAndDelete', async function(next) {
    const panelId = this.getQuery()._id;
    await mongoose.model('Team').updateMany({ panel: panelId }, { $set: { panel: null, coordinator: null } });
    await mongoose.model('Team').updateMany({ vivaPanel: panelId }, { $set: { vivaPanel: null } });
    await mongoose.model('TeamPanelAssignment').deleteMany({ panel: panelId });
    next();
});

panelSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    await mongoose.model('Team').updateMany({ panel: this._id }, { $set: { panel: null, coordinator: null } });
    await mongoose.model('Team').updateMany({ vivaPanel: this._id }, { $set: { vivaPanel: null } });
    await mongoose.model('TeamPanelAssignment').deleteMany({ panel: this._id });
    next();
});

panelSchema.pre('deleteOne', { document: false, query: true }, async function(next) {
    const panelId = this.getQuery()._id;
    if (panelId) {
        await mongoose.model('Team').updateMany({ panel: panelId }, { $set: { panel: null, coordinator: null } });
        await mongoose.model('Team').updateMany({ vivaPanel: panelId }, { $set: { vivaPanel: null } });
        await mongoose.model('TeamPanelAssignment').deleteMany({ panel: panelId });
    }
    next();
});

module.exports = mongoose.model('Panel', panelSchema); 