const mongoose = require('mongoose');

const programmeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

programmeSchema.index({ name: 1, session: 1 }, { unique: true });

module.exports = mongoose.model('Programme', programmeSchema);

