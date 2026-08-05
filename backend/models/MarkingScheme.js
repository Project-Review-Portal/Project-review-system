const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    maxMarks: {
        type: Number,
        required: true,
        min: 1
    }
}, { _id: false });

const markingSchemeSchema = new mongoose.Schema({
    panel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Panel',
        required: true
    },
    slotType: {
        type: String,
        required: true,
        trim: true
    },
    programme: {
        type: String,
        trim: true
    },
    components: {
        type: [componentSchema],
        default: []
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Unique scheme per panel + slotType
markingSchemeSchema.index({ panel: 1, slotType: 1 }, { unique: true });

markingSchemeSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('MarkingScheme', markingSchemeSchema);
