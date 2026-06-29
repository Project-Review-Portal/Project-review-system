const mongoose = require('mongoose');

const panelSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: true,
        unique: true
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
    }
});
// Cascade deletion logic for Panel
panelSchema.pre('findOneAndDelete', async function(next) {
    const panelId = this.getQuery()._id;
    await mongoose.model('Team').updateMany({ panel: panelId }, { $set: { panel: null, coordinator: null } });
    await mongoose.model('TeamPanelAssignment').deleteMany({ panel: panelId });
    next();
});

panelSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    await mongoose.model('Team').updateMany({ panel: this._id }, { $set: { panel: null, coordinator: null } });
    await mongoose.model('TeamPanelAssignment').deleteMany({ panel: this._id });
    next();
});

panelSchema.pre('deleteOne', { document: false, query: true }, async function(next) {
    const panelId = this.getQuery()._id;
    if (panelId) {
        await mongoose.model('Team').updateMany({ panel: panelId }, { $set: { panel: null, coordinator: null } });
        await mongoose.model('TeamPanelAssignment').deleteMany({ panel: panelId });
    }
    next();
});

module.exports = mongoose.model('Panel', panelSchema); 