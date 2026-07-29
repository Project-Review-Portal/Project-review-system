import React, { useState } from 'react';
import axios from 'axios';
const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626"; 
const DURATION_OPTIONS = [15, 20, 30, 45, 60];

const CoordinatorVivaSchedule = () => {
  const [user, setUser] = useState(null);
  const [slotTypes, setSlotTypes] = useState(['review1', 'review2', 'review3', 'viva']);
  const [vivaRequired, setVivaRequired] = useState(true);
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    duration: 30,
  });
  const [slots, setSlots] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [allottedSchedules, setAllottedSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState({});

  React.useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const settingsRes = await axios.get(`${SERVER_API_KEY}/api/auth/review-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const validSlots = settingsRes.data.validSlotTypes || ['review1', 'review2', 'review3', 'viva'];
      setSlotTypes(validSlots);
      setVivaRequired(settingsRes.data.vivaRequired !== false);
    } catch (err) {
      console.error('Failed to fetch review settings:', err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Derived validation state for immediate feedback
  const computeValidation = () => {
    const errs = [];
    try {
      if (form.startTime && form.endTime) {
        const [sh, sm] = form.startTime.split(':').map(Number);
        const [eh, em] = form.endTime.split(':').map(Number);
        const start = sh * 60 + sm;
        const end = eh * 60 + em;
        if (end <= start) errs.push('End time must be after start time.');
        const windowMinutes = end - start;
        const durationNum = Number(form.duration) || 0;
        if (durationNum <= 0) errs.push('Duration must be greater than 0.');
        if (windowMinutes > 0 && durationNum > windowMinutes) errs.push('Duration cannot exceed the time window between start and end.');
      }
    } catch (_) {}
    return errs;
  };
  const validationErrors = computeValidation();
  const formInvalid = validationErrors.length > 0;

  const handleGenerateSlots = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    // Check if user is coordinator before making API call
    const isCoordinator = Array.isArray(user?.roles) && user.roles.some(r => ['coordinator', 'assistant coordinator'].includes(r.role));
    if (!isCoordinator) {
      setError('You are not a coordinator for any team.');
      setLoading(false);
      return;
    }
    const isReadOnly = user?.role === 'assistant coordinator';
    if (isReadOnly) {
      setError('Action forbidden in Read-Only Mode.');
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      // Fetch teams and slots as before
      const res = await axios.post(
        `${SERVER_API_KEY}/api/panels/coordinator/generate-slots`,
        {
          slotType: 'viva',
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          duration: Number(form.duration),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSlots(res.data.slots);
      setTeams(res.data.teams);
      setAssignments(res.data.teams.map((team) => ({ teamId: team._id, slot: null })));
      
      // Fetch attendance status for all configured reviews (exclude viva itself)
      const reviews = slotTypes.filter(s => s !== 'viva');
      const attendanceRequests = reviews.map(reviewType => {
        return axios.post(
          `${SERVER_API_KEY}/api/panels/attendance/check`,
          {
            teamIds: res.data.teams.map(t => t._id),
            reviewType: reviewType,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      });
      const attendanceResults = await Promise.all(attendanceRequests);

      // Only allow teams with all reviews marked
      const status = {};
      res.data.teams.forEach(team => {
        status[team._id] = attendanceResults.every(resObj => resObj.data[team._id]);
      });
      setAttendanceStatus(status);
      // Also check previous review schedules for viva
      // Do not enforce previous schedule checks; allow selecting viva slots for any team
      setScheduleStatus({});
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate slots.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentChange = (teamId, slotIdx) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.teamId === teamId ? { ...a, slot: slots[slotIdx] } : a
      )
    );
  };

  const handleSubmitAssignments = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    
    // Check if user is coordinator before making API call
    const isCoordinator = Array.isArray(user?.roles) && user.roles.some(r => ['coordinator', 'assistant coordinator'].includes(r.role));
    if (!isCoordinator) {
      setError('You are not a coordinator for any team.');
      setLoading(false);
      return;
    }
    const isReadOnly = user?.role === 'assistant coordinator';
    if (isReadOnly) {
      setError('Action forbidden in Read-Only Mode.');
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      // Only include assignments for teams that have a selected slot and are eligible
      const eligibleAssigned = assignments.filter(a => attendanceStatus[a.teamId] && a.slot);
      if (eligibleAssigned.length === 0) {
        throw new Error('No eligible teams selected to assign slots.');
      }
      const usedSlots = new Set();
      for (const a of eligibleAssigned) {
        const slotKey = `${a.slot.start}-${a.slot.end}`;
        if (usedSlots.has(slotKey)) throw new Error('Each slot can only be assigned to one team.');
        usedSlots.add(slotKey);
      }
      await axios.post(
        `${SERVER_API_KEY}/api/panels/coordinator/assign-slots`,
        {
          slotType: 'viva',
          date: form.date,
          assignments: eligibleAssigned.map((a) => ({
            teamId: a.teamId,
            slot: a.slot,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Viva slots assigned successfully!');
      setStep(1);
      setSlots([]);
      setTeams([]);
      setAssignments([]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign slots.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const fetchAllottedSchedules = async () => {
      setLoadingSchedules(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/allotted-schedules`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAllottedSchedules(res.data.filter(s => s.slotType === 'viva'));
      } catch (err) {
        // silently ignore when unauthorized
      } finally {
        setLoadingSchedules(false);
      }
    };
    const hasCoordinatorRole = Array.isArray(user?.roles) && user.roles.some(r => ['coordinator', 'assistant coordinator'].includes(r.role));
    if (hasCoordinatorRole) {
      fetchAllottedSchedules();
    }
  }, [user]);

  // Check if user has coordinator role in roles array
  const isCoordinator = Array.isArray(user?.roles) && user.roles.some(r => ['coordinator', 'assistant coordinator'].includes(r.role));
  if (user && !isCoordinator) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
        <p className="text-red-600">You are not a coordinator for any team.</p>
      </div>
    );
  }

  const isReadOnly = user?.role === 'assistant coordinator';

  if (!vivaRequired) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <h2 className="text-2xl font-bold mb-2 text-red-600">Viva is not required</h2>
        <p className="text-red-500 font-semibold">The administrator has configured the system such that Viva is not required.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Viva Schedule</h2>
      {isReadOnly && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded font-medium text-center">
          ℹ️ You are viewing this page in Read-Only Mode as an Assistant Coordinator.
        </div>
      )}
      {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      {step === 1 && (
        <form onSubmit={handleGenerateSlots} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full border rounded px-2 py-1" required disabled={isReadOnly} />
            </div>
            <div>
              
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className="w-full border rounded px-2 py-1" required disabled={isReadOnly} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="w-full border rounded px-2 py-1" required disabled={isReadOnly} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slot Duration (minutes)</label>
              <select name="duration" value={form.duration} onChange={handleChange} className="w-full border rounded px-2 py-1" disabled={isReadOnly}>
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          {validationErrors.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-sm">
              {validationErrors.map((e, i) => (<div key={i}>{e}</div>))}
            </div>
          )}
          <button type="submit" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400" disabled={loading || formInvalid || isReadOnly}>
            {loading ? 'Generating...' : 'Generate Slots'}
          </button>
        </form>
      )}
      {step === 2 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Assign Viva Slots to Teams</h3>
          <table className="w-full border mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Team</th>
                <th className="p-2 border">Assign Slot</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, idx) => {
                const attendanceMarked = attendanceStatus[team._id];
                const scheduleExists = true; // allow selecting slots regardless of prior schedules
                return (
                  <tr key={team._id}>
                    <td className="p-2 border">{team.teamName}</td>
                    <td className="p-2 border">
                      {scheduleExists ? (
                        attendanceMarked ? (
                          <select
                            value={assignments[idx]?.slot ? slots.findIndex(s => s.start === assignments[idx].slot.start && s.end === assignments[idx].slot.end) : ''}
                            onChange={e => handleAssignmentChange(team._id, e.target.value)}
                            className="border rounded px-2 py-1"
                            disabled={isReadOnly}
                          >
                            <option value="">Select Slot</option>
                            {slots.map((slot, sidx) => {
                              const start = new Date(slot.start);
                              const end = new Date(slot.end);
                              const slotStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                              const assignedToOther = assignments.some((a, aidx) => aidx !== idx && a.slot && a.slot.start === slot.start && a.slot.end === slot.end);
                              return (
                                <option key={sidx} value={sidx} disabled={assignedToOther}>{slotStr}</option>
                              );
                            })}
                          </select>
                        ) : (
                          <span className="text-red-600">Attendance not marked for all reviews</span>
                        )
                      ) : (
                        <span className="text-red-600">Cannot schedule viva before scheduling all reviews</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSubmitAssignments}
            disabled={loading || isReadOnly}
          >
            {loading ? 'Assigning...' : 'Assign Viva Slots'}
          </button>
          <button
            className="ml-4 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            onClick={() => { setStep(1); setSlots([]); setTeams([]); setAssignments([]); setMessage(''); setError(''); }}
            disabled={loading}
          >
            Back
          </button>
        </div>
      )}
      {/* Allotted Viva Schedules Section */}
      <div className="bg-gray-50 mt-8 p-4 rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold mb-4">Allotted Viva Schedules</h3>
        {loadingSchedules ? (
          <div>Loading schedules...</div>
        ) : allottedSchedules.length === 0 ? (
          <div className="text-gray-500">No viva schedules allotted yet.</div>
        ) : (
          <div className="space-y-4">
            {allottedSchedules.map(schedule => {
              const displayName = schedule.name || (schedule.slotType ? schedule.slotType : 'Viva');
              let duration = schedule.duration;
              try {
                if ((!duration || duration === 0) && schedule.startTime && schedule.endTime) {
                  duration = Math.round((new Date(schedule.endTime) - new Date(schedule.startTime)) / 60000);
                }
              } catch (e) {
                duration = schedule.duration || 0;
              }
              return (
                <div key={schedule._id} className="border rounded-lg p-4 bg-white">
                  <h4 className="text-lg font-semibold mb-2">{displayName}</h4>
                  <p className="text-sm text-gray-700"><span className="font-semibold">Team:</span> {schedule.team?.teamName || 'N/A'}</p>
                  <p className="text-sm text-gray-700"><span className="font-semibold">Panel:</span> {schedule.panel?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-700"><span className="font-semibold">Time:</span> {schedule.startTime ? new Date(schedule.startTime).toLocaleString() : 'N/A'} - {schedule.endTime ? new Date(schedule.endTime).toLocaleString() : 'N/A'}</p>
                  <p className="text-sm text-gray-700"><span className="font-semibold">Duration:</span> {duration ? `${duration} minutes` : 'N/A'}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinatorVivaSchedule; 