const Attendance = require('../models/Attendance');
const TimeTable = require('../models/TimeTable');

// POST /api/attendance/check
// Body: { teamIds: [teamId1, teamId2, ...], reviewType: 'review1' | 'review2' | 'review3' }
exports.checkAttendanceForTeams = async (req, res) => {
  try {
    const { teamIds, reviewType } = req.body;
    if (!Array.isArray(teamIds) || !reviewType) {
      return res.status(400).json({ message: 'teamIds (array) and reviewType are required.' });
    }
    const attendanceRecords = await Attendance.find({ team: { $in: teamIds } });
    const result = {};
    for (const teamId of teamIds) {
      const record = attendanceRecords.find(r => r.team.toString() === teamId);
      let marked = false;
      if (record && Array.isArray(record.studentAttendances) && record.studentAttendances.length > 0) {
        // If at least one student has attendance marked for this review, consider it marked
        marked = record.studentAttendances.some(sa => sa[reviewType] === true);
      }
      result[teamId] = marked;
    }
    res.json(result);
  } catch (error) {
    console.error('Error in checkAttendanceForTeams:', error);
    res.status(500).json({ message: 'Server error checking attendance.' });
  }
};

// POST /api/panels/check-schedule-exists
// Body: { teamIds: [teamId1, teamId2, ...], reviewType: 'review1' | 'review2' | 'review3' | 'viva' }
exports.checkPreviousScheduleExists = async (req, res) => {
  try {
    const { teamIds, reviewType } = req.body;
    if (!Array.isArray(teamIds) || !reviewType) {
      return res.status(400).json({ message: 'teamIds (array) and reviewType are required.' });
    }
    const result = {};
    for (const teamId of teamIds) {
      let requiredTypes = [];
      if (reviewType === 'review2') requiredTypes = ['review1'];
      else if (reviewType === 'review3') requiredTypes = ['review2'];
      else if (reviewType === 'viva') requiredTypes = ['review1', 'review2', 'review3'];
      else requiredTypes = [];
      if (requiredTypes.length === 0) {
        result[teamId] = true;
        continue;
      }
      // Check if all required previous reviews have a schedule for this team
      const schedules = await TimeTable.find({ team: teamId, slotType: { $in: requiredTypes } });
      result[teamId] = requiredTypes.every(type => schedules.some(s => s.slotType === type));
    }
    res.json(result);
  } catch (error) {
    console.error('Error in checkPreviousScheduleExists:', error);
    res.status(500).json({ message: 'Server error checking previous schedules.' });
  }
}; 