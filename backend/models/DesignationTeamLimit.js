const mongoose = require('mongoose');

const designationTeamLimitSchema = new mongoose.Schema({
    designation: {
        type: String,
        required: true,
        trim: true
    },
    ugLimit: {
        type: Number,
        required: true,
        min: 1
    },
    pgLimit: {
        type: Number,
        required: true,
        min: 1
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        index: true
    }
}, {
    timestamps: true
});

designationTeamLimitSchema.index({ designation: 1, session: 1 }, { unique: true });

module.exports = mongoose.model('DesignationTeamLimit', designationTeamLimitSchema);

