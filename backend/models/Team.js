const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    teamName: {
        type: String,
        required: true,
        unique: true
    },
    teamLeader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    guidePreference: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedGuides: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    panel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Panel'
    },
    coordinator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Team', teamSchema); 