const Team = require('../models/Team');
const DesignationTeamLimit = require('../models/DesignationTeamLimit');

async function buildDesignationLimitMap(programmeType) {
    const progType = programmeType || 'UG';
    const limits = await DesignationTeamLimit.find({});
    const map = new Map();
    for (const entry of limits) {
        const limitVal = progType === 'PG' ? entry.pgLimit : entry.ugLimit;
        map.set(entry.designation.trim().toLowerCase(), limitVal);
    }
    return map;
}

async function getTeamCountsByGuideIds(guideIds, programmeType) {
    if (!guideIds.length) {
        return new Map();
    }

    const progType = programmeType || 'UG';
    const programmeQuery = progType === 'UG' 
        ? { programme: 'UG' } 
        : { programme: { $ne: 'UG' } };

    const counts = await Team.aggregate([
        {
            $match: {
                guidePreference: { $in: guideIds },
                status: 'approved', // Only accepted teams count toward the limit
                ...programmeQuery
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
