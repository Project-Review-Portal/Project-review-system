const Attendance = require('../models/Attendance');
const TimeTable = require('../models/TimeTable');
const { getReviewSettings } = require('../utils/reviewSettings');

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
        // If at least one student has attendance marked for this reviewType, consider it marked
        marked = record.studentAttendances.some(sa => {
          if (!sa.assessments || !Array.isArray(sa.assessments)) return false;
          
          // Find the assessment object that matches the requested reviewType
          const targetAssessment = sa.assessments.find(asm => asm.name === reviewType);
          
          // Check if it exists and if the student was marked present
          return targetAssessment ? targetAssessment.isPresent === true : false;
        });
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

    // Get dynamic settings to determine prerequisite chain
    const programme = req.headers['x-selected-programme'];
    const { numReviews } = await getReviewSettings(programme);

    // 1. Determine what prerequisite slotTypes are required globally for this reviewType
    let requiredTypes = [];
    const reviewMatch = reviewType.match(/^review(\d+)$/);
    
    if (reviewMatch) {
      const n = parseInt(reviewMatch[1], 10);
      // reviewN requires all review1..review(N-1) to have a schedule
      for (let i = 1; i < n; i++) requiredTypes.push(`review${i}`);
    } else if (reviewType === 'viva') {
      // viva requires all reviews to have a schedule
      for (let i = 1; i <= numReviews; i++) requiredTypes.push(`review${i}`);
    }

    const result = {};

    // If there are no prerequisites needed (like for review1), everything is automatically true
    if (requiredTypes.length === 0) {
      teamIds.forEach(teamId => { result[teamId] = true; });
      return res.json(result);
    }

    // 2. Fetch active schedules for ALL requested teams in a single database query
    // Added a status filter to ensure we don't count 'cancelled' slots as valid prerequisites
    const allSchedules = await TimeTable.find({ 
      team: { $in: teamIds }, 
      slotType: { $in: requiredTypes },
      status: { $in: ['scheduled', 'completed'] } 
    });

    // 3. Evaluate prerequisites for each team in memory
    for (const teamId of teamIds) {
      // Filter the global schedules list down to just this specific team
      const teamSchedules = allSchedules.filter(s => s.team.toString() === teamId.toString());
      
      // Ensure EVERY required prerequisite type exists in this team's active schedules
      result[teamId] = requiredTypes.every(type => 
        teamSchedules.some(s => s.slotType === type)
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Error in checkPreviousScheduleExists:', error);
    res.status(500).json({ message: 'Server error checking previous schedules.' });
  }
};