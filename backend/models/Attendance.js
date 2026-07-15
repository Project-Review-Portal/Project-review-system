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
        // Changed from static booleans to a dynamic array of components
        assessments: [{
            name: { 
                type: String, 
                required: true 
            }, // e.g., 'Review 1', 'Review 2', 'Viva', 'Midterm'
            isPresent: { 
                type: Boolean, 
                default: false 
            }
        }]
    }],
    guide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewDates: [{
        name: {
            type: String,
            required: true
        },
        date: {
            type: Date
        }
    }],
    isLocked: {
        type: Boolean,
        default: false
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to update the timestamp
attendanceSchema.pre('save', function(next) {
    this.lastUpdated = Date.now();
    next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);