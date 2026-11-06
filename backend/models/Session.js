const mongoose = require('mongoose');

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const sessionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    startMonth: {
        type: Number, // 1 - 12
        required: true,
        min: 1,
        max: 12
    },
    startYear: {
        type: Number,
        required: true,
        min: 2000,
        max: 2100
    },
    endMonth: {
        type: Number, // 1 - 12
        required: true,
        min: 1,
        max: 12
    },
    endYear: {
        type: Number,
        required: true,
        min: 2000,
        max: 2100
    },
    semesterType: {
        type: String,
        enum: ['odd', 'even'],
        default: 'odd'
    },
    academicYear: {
        type: String, // e.g. "2024-2025"
        default: ''
    },
    status: {
        type: String,
        enum: ['paused', 'active', 'archived'],
        default: 'paused' // Default value: pause as requested by admin
    },
    isManualCurrent: {
        type: Boolean,
        default: false
    },
    isManualAdvanced: {
        type: Boolean,
        default: false
    },
    programmes: [{
        type: String,
        trim: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Helper static method to generate formatted name
sessionSchema.statics.formatSessionName = function(startMonth, startYear, endMonth, endYear) {
    const sName = MONTH_NAMES[startMonth - 1] || 'Start';
    const eName = MONTH_NAMES[endMonth - 1] || 'End';
    return `${sName} ${startYear} - ${eName} ${endYear}`;
};

module.exports = mongoose.model('Session', sessionSchema);
