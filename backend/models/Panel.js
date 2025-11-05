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
        required: true, // Each panel must have a coordinator
        // Coordinator must not be in members array (enforced in controller)
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Panel', panelSchema); 