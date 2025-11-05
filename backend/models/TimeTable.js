const mongoose = require('mongoose');

const timeTableSchema = new mongoose.Schema({
    panel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Panel',
        required: true
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    period: {
        type: String,
        required: true
    },
    startTime: {
        type: Date,
        required: false
    },
    endTime: {
        type: Date,
        required: false
    },
    slotAssignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // The coordinator who assigned the slot
    },
    // Human-friendly title for the schedule (e.g., 'Review 1 for Team 1')
    name: {
        type: String,
        required: false,
    },
    // Optional longer description
    description: {
        type: String,
        required: false,
    },
    // The logical slot type: 'review1' | 'review2' | 'review3' | 'viva'
    slotType: {
        type: String,
        enum: ['review1', 'review2', 'review3', 'viva'],
        required: false,
    },
    // Type field for backward compatibility (e.g., 'Team Review')
    type: {
        type: String,
        required: false,
    },
    // Duration in minutes
    duration: {
        type: Number,
        required: false,
    },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    isNotified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('TimeTable', timeTableSchema); 