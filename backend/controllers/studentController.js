const Team = require('../models/Team');
const TimeTable = require('../models/TimeTable');

exports.getReviewSchedule = async (req, res) => {
    try {
        const studentId = req.user.id;

        const team = await Team.findOne({ $or: [{ members: studentId }, { teamLeader: studentId }] });

        if (!team) {
            return res.json([]);
        }

        const schedules = await TimeTable.find({ team: team._id, isNotified: true })
            .populate({
                path: 'team',
                select: 'teamName guidePreference',
                populate: { path: 'guidePreference', select: 'name username' }
            })
            .populate({
                path: 'panel',
                select: 'name members coordinator',
                populate: [
                    { path: 'members', select: 'name username memberType' },
                    { path: 'coordinator', select: 'name username' }
                ]
            })
            .sort({ startTime: 1 });

        res.json(schedules);
    } catch (error) {
        console.error('Error fetching student review schedule:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 