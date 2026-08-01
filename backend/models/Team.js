const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    teamName: {
        type: String,
        required: true
    },
    teamLeader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    memberStatus: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['accepted', 'pending', 'rejected'],
            default: 'pending'
        },
        lockApproved: {
            type: Boolean,
            default: false
        }
    }],
    isTeamComplete: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    guidePreference: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedGuides: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    panel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Panel'
    },
    vivaPanel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Panel'
    },
    coordinator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    programme: {
        type: String,
        default: 'B.E. CSE'   // 'B.E. CSE', 'M.E. Big Data', etc.
    }
});

// Ensure team names are unique per programme
teamSchema.index({ teamName: 1, programme: 1 }, { unique: true });

// Cascade deletion logic for Team
teamSchema.pre('findOneAndDelete', async function(next) {
    const teamId = this.getQuery()._id;
    if (teamId) {
        await mongoose.model('TeamPanelAssignment').updateMany({}, { $pull: { teams: teamId } });
        try { await mongoose.model('Mark').deleteMany({ team: teamId }); } catch(e) {}
        try { await mongoose.model('Attendance').deleteMany({ team: teamId }); } catch(e) {}
        try { await mongoose.model('TimeTable').deleteMany({ team: teamId }); } catch(e) {}
        try { await mongoose.model('FinalReport').deleteMany({ team: teamId }); } catch(e) {}
    }
    next();
});

teamSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
    const teamId = this._id;
    await mongoose.model('TeamPanelAssignment').updateMany({}, { $pull: { teams: teamId } });
    try { await mongoose.model('Mark').deleteMany({ team: teamId }); } catch(e) {}
    try { await mongoose.model('Attendance').deleteMany({ team: teamId }); } catch(e) {}
    try { await mongoose.model('TimeTable').deleteMany({ team: teamId }); } catch(e) {}
    try { await mongoose.model('FinalReport').deleteMany({ team: teamId }); } catch(e) {}
    next();
});

teamSchema.pre('deleteOne', { document: false, query: true }, async function(next) {
    const teamId = this.getQuery()._id;
    if (teamId) {
        await mongoose.model('TeamPanelAssignment').updateMany({}, { $pull: { teams: teamId } });
        try { await mongoose.model('Mark').deleteMany({ team: teamId }); } catch(e) {}
        try { await mongoose.model('Attendance').deleteMany({ team: teamId }); } catch(e) {}
        try { await mongoose.model('TimeTable').deleteMany({ team: teamId }); } catch(e) {}
        try { await mongoose.model('FinalReport').deleteMany({ team: teamId }); } catch(e) {}
    }
    next();
});

teamSchema.pre('deleteMany', async function(next) {
    const conditions = this.getQuery();
    // For deleteMany, it's safer to not run complex hooks or only handle known patterns.
    // If the query is simple { _id: { $in: [...] } }:
    if (conditions._id && conditions._id.$in) {
        const teamIds = conditions._id.$in;
        await mongoose.model('TeamPanelAssignment').updateMany({}, { $pull: { teams: { $in: teamIds } } });
        try { await mongoose.model('Mark').deleteMany({ team: { $in: teamIds } }); } catch(e) {}
        try { await mongoose.model('Attendance').deleteMany({ team: { $in: teamIds } }); } catch(e) {}
        try { await mongoose.model('TimeTable').deleteMany({ team: { $in: teamIds } }); } catch(e) {}
        try { await mongoose.model('FinalReport').deleteMany({ team: { $in: teamIds } }); } catch(e) {}
    }
    next();
});

module.exports = mongoose.model('Team', teamSchema); 