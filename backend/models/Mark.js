const mongoose = require('mongoose');

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
        enum: ['review1', 'review2', 'review3', 'viva'],
        required: true,
    },
    mark1: {
        type: Number,
        min: 0,
        max: 10,
        required: true,
    },
    mark2: {
        type: Number,
        min: 0,
        max: 10,
        required: true,
    },
    mark3: {
        type: Number,
        min: 0,
        max: 10,
        required: true,
    },
    mark4: {
        type: Number,
        min: 0,
        max: 10,
        required: true,
    },
    totalMarks: {
        type: Number,
        min: 0,
        max: 40,
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

// Pre-save hook to calculate totalMarks and percentage
markSchema.pre('save', function (next) {
    this.totalMarks = this.mark1 + this.mark2 + this.mark3 + this.mark4;
    this.percentage = (this.totalMarks / 40) * 100;
    this.updatedAt = Date.now();
    next();
});

// Ensure uniqueness for a student by a specific marker for a given team and slotType
markSchema.index({ student: 1, team: 1, markedBy: 1, slotType: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema); 