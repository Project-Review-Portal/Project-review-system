const mongoose = require('mongoose');

const markComponentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    value: { type: Number, required: true, min: 0 }
}, { _id: false });

const markSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    role: {
        type: String,
        enum: ['guide', 'panel'],
        required: true,
    },
    slotType: {
        type: String,
        required: true,
    },
    // Dynamic components — primary storage (replaces mark1–4)
    components: {
        type: [markComponentSchema],
        default: []
    },
    totalMarks: {
        type: Number,
        min: 0,
    },
    percentage: {
        type: Number,
        min: 0,
        max: 100,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Pre-save hook to calculate totalMarks from components
markSchema.pre('save', function (next) {
    if (this.components && this.components.length > 0) {
        this.totalMarks = this.components.reduce((sum, c) => sum + (c.value || 0), 0);
        // percentage relative to sum of all maxMarks from scheme — set at controller level
    }
    this.updatedAt = Date.now();
    next();
});

// Ensure uniqueness for a student by a specific marker for a given team and slotType
markSchema.index({ student: 1, team: 1, markedBy: 1, slotType: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);