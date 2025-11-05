const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userRole: {
        type: String,
        enum: ['guide', 'panel'],
        required: true
    },
    reviewPeriodStart: {
        type: Date,
        required: false
    },
    reviewPeriodEnd: {
        type: Date,
        required: false
    },
    availableSlots: [{
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

availabilitySchema.index({ user: 1, reviewPeriodStart: 1, reviewPeriodEnd: 1 }, { unique: false });

module.exports = mongoose.model('Availability', availabilitySchema); 