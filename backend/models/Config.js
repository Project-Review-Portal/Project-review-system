const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    programme: {
        type: String,
        required: true,
        trim: true,
    },
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
    numReviews: {
        type: Number,
        default: 3,
        min: 1,
        max: 10
    },
    vivaRequired: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// One config document per programme — no duplicates allowed
configSchema.index({ programme: 1 }, { unique: true });

module.exports = mongoose.model('Config', configSchema);