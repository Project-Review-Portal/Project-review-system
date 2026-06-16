const Team = require('../models/Team');
const DesignationTeamLimit = require('../models/DesignationTeamLimit');

async function buildDesignationLimitMap() {
    const limits = await DesignationTeamLimit.find({});
    const map = new Map();
    for (const entry of limits) {
        map.set(entry.designation.trim().toLowerCase(), entry.teamLimit);
    }
    return map;
}

async function getTeamCountsByGuideIds(guideIds) {
    if (!guideIds.length) {
        return new Map();
    }

    const counts = await Team.aggregate([
        {
            $match: {
                guidePreference: { $in: guideIds },
                status: { $in: ['approved', 'pending'] }
            }
        },
        {
            $group: {
                _id: '$guidePreference',
                count: { $sum: 1 }
            }
        }
    ]);

    const map = new Map();
    for (const row of counts) {
        map.set(row._id.toString(), row.count);
    }
    return map;
}

function resolveGuideLimitStatus(guide, currentCount, limitMap) {
    const designationKey = (guide.designation || '').trim().toLowerCase();

    if (!designationKey || !limitMap.has(designationKey)) {
        return {
            canRequest: true,
            teamLimit: null,
            currentTeamCount: currentCount
        };
    }

    const teamLimit = limitMap.get(designationKey);
    const canRequest = currentCount < teamLimit;

    return {
        canRequest,
        teamLimit,
        currentTeamCount: currentCount
    };
}

module.exports = {
    buildDesignationLimitMap,
    getTeamCountsByGuideIds,
    resolveGuideLimitStatus
};
