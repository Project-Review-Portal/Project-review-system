const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        unique: true
    },
    studentAttendances: [{
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        review1: { type: Boolean, default: false },
        review2: { type: Boolean, default: false },
        review3: { type: Boolean, default: false },
        viva: { type: Boolean, default: false }
    }],
    guide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

attendanceSchema.pre('save', function(next) {
    this.lastUpdated = Date.now();
    next();
});

module.exports = mongoose.model('Attendance', attendanceSchema); 