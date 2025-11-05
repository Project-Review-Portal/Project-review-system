const mongoose = require('mongoose');

const teamPanelAssignmentSchema = new mongoose.Schema({
    panel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Panel',
        required: true
    },
    teams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('TeamPanelAssignment', teamPanelAssignmentSchema); 