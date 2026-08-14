const mongoose = require('mongoose');

const slotAssignmentQueueSchema = new mongoose.Schema({
    panel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Panel',
        required: true
    },
    slotType: {
        type: String,
        required: true  // 'review1', 'review2', 'viva', etc.
    },
    // Ordered array of guide groups, where each inner array contains guides at the same seniority level.
    // e.g. [ [guideA_id], [guideB_id, guideC_id], [guideD_id] ]
    guideOrder: {
        type: [[{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]],
        default: []
    },
    // The current seniority level index (pointer into guideOrder)
    currentLevel: {
        type: Number,
        default: 0
    },
    // Guides at currentLevel who have already confirmed their allocations
    confirmedAtCurrentLevel: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // All guides who ever confirmed (across all levels), for history/audit
    allConfirmedGuides: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Timestamp when coordinator last reset this queue (saved new free slots)
    resetAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// One queue per panel+slotType combination
slotAssignmentQueueSchema.index({ panel: 1, slotType: 1 }, { unique: true });

module.exports = mongoose.model('SlotAssignmentQueue', slotAssignmentQueueSchema);
