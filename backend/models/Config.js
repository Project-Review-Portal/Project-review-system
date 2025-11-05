const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    maxTeamSize: {
        type: Number,
        default: 4,
        required: true,
        min: 1
    },
    guideSelectionStartDate: {
        type: Date,
        default: null,
    },
    guideSelectionEndDate: {
        type: Date,
        default: null,
    },
    reviewPeriodStartDate: {
        type: Date,
        default: null
    },
    reviewPeriodEndDate: {
        type: Date,
        default: null
    },
    teamFormationOpen: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Config', configSchema); 