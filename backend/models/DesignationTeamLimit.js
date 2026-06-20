const mongoose = require('mongoose');

const designationTeamLimitSchema = new mongoose.Schema({
    designation: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    teamLimit: {
        type: Number,
        required: true,
        min: 1
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DesignationTeamLimit', designationTeamLimitSchema);
