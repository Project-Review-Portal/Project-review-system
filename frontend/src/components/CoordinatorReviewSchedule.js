import React, { useState, useEffect } from 'react';
import axios from 'axios';
const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";
const DURATION_OPTIONS = [10, 15, 20, 25, 30];

const CoordinatorReviewSchedule = () => {
  const [user, setUser] = useState(null);
  const [reviewTypes, setReviewTypes] = useState([
    { value: 'review1', label: 'Review 1' },
    { value: 'review2', label: 'Review 2' },
    { value: 'review3', label: 'Review 3' },
  ]);
  const [slotTypes, setSlotTypes] = useState(['review1', 'review2', 'review3', 'viva']);
  const [form, setForm] = useState({
    reviewType: 'review1',
    date: '',
    startTime: '',
    endTime: '',
    duration: 20,
  });
  const [slots, setSlots] = useState([]);
  const [extraMinutesMessage, setExtraMinutesMessage] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: form, 2: preview
  const [allottedSchedules, setAllottedSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
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
      
      const generatedTypes = validSlots.map(slot => ({
        value: slot,
        label: slot === 'viva' ? 'VIVA' : `Review ${slot.replace('review', '')}`
      }));
      setReviewTypes(generatedTypes);
      if (generatedTypes.length > 0) {
        setForm(prev => ({ ...prev, reviewType: generatedTypes[0].value }));
      }
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
    const isCoordinator = Array.isArray(user?.roles) && user.roles.some(r => r.role === 'coordinator');
    if (!isCoordinator) {
      setError('You are not a coordinator for any team.');
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${SERVER_API_KEY}/api/panels/coordinator/generate-slots`,
        {
          slotType: form.reviewType,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          duration: Number(form.duration),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSlots(res.data.slots || []);
      setExtraMinutesMessage(res.data.extraMinutesMessage || '');
      setStep(2);
    } catch (err) {
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.join('\n');
        setError(`Validation failed:\n${errorMessages}`);
      } else {
        setError(err.response?.data?.message || 'Failed to generate slots.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFreeSlots = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    
    const isCoordinator = Array.isArray(user?.roles) && user.roles.some(r => r.role === 'coordinator');
    if (!isCoordinator) {
      setError('You are not a coordinator for any team.');
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${SERVER_API_KEY}/api/panels/coordinator/save-free-slots`,
        {
          slotType: form.reviewType,
          date: form.date,
          slots: slots,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Free slots saved successfully!');
      setStep(1);
      setSlots([]);
      setExtraMinutesMessage('');
      
      // Refresh the allotted schedules
      const fetchRes = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/allotted-schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const selectedProgramme = storedUser.programme;
      let fetchedSchedules = fetchRes.data || [];
      if (selectedProgramme) {
          fetchedSchedules = fetchedSchedules.filter(sch => sch.team?.programme?.toLowerCase() === selectedProgramme?.toLowerCase());
      }
      setAllottedSchedules(fetchedSchedules);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save slots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAllottedSchedules = async () => {
      setLoadingSchedules(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/allotted-schedules`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const selectedProgramme = storedUser.programme;
        let fetchedSchedules = res.data || [];
        if (selectedProgramme) {
            fetchedSchedules = fetchedSchedules.filter(sch => sch.team?.programme?.toLowerCase() === selectedProgramme?.toLowerCase());
        }
        setAllottedSchedules(fetchedSchedules);
      } catch (err) {
        // silently ignore when unauthorized
      } finally {
        setLoadingSchedules(false);
      }
    };
    const hasCoordinatorRole = Array.isArray(user?.roles) && user.roles.some(r => r.role === 'coordinator');
    if (hasCoordinatorRole) {
      fetchAllottedSchedules();
    }
  }, [user]);

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule? This will remove it everywhere.')) return;
    setLoadingSchedules(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${SERVER_API_KEY}/api/panels/coordinator/allotted-schedules/${scheduleId}`, { headers: { Authorization: `Bearer ${token}` } });
      
      const res = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/allotted-schedules`, { headers: { Authorization: `Bearer ${token}` } });
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const selectedProgramme = storedUser.programme;
      let fetchedSchedules = res.data || [];
      if (selectedProgramme) {
          fetchedSchedules = fetchedSchedules.filter(sch => sch.team?.programme?.toLowerCase() === selectedProgramme?.toLowerCase());
      }
      setAllottedSchedules(fetchedSchedules);
      setMessage('Schedule deleted successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete schedule');
    } finally {
      setLoadingSchedules(false);
    }
  };

  // Check if user has coordinator role in roles array
  const isCoordinator = Array.isArray(user?.roles) && user.roles.some(r => r.role === 'coordinator');
  if (user && !isCoordinator) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
        <p className="text-red-600">You are not a coordinator for any team.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Review Schedule</h2>
      {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      
      {step === 1 && (
        <form onSubmit={handleGenerateSlots} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Review Type</label>
              <select name="reviewType" value={form.reviewType} onChange={handleChange} className="w-full border rounded px-2 py-1">
                {reviewTypes.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slot Duration (minutes)</label>
              <select name="duration" value={form.duration} onChange={handleChange} className="w-full border rounded px-2 py-1">
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
          <button type="submit" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 font-semibold" disabled={loading || formInvalid}>
            {loading ? 'Generating...' : 'Generate Slots'}
          </button>
        </form>
      )}
      
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Review Generated Slots</h3>
          {extraMinutesMessage && (
            <div className="p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded text-sm">
              ⚠️ {extraMinutesMessage}
            </div>
          )}
          <div className="border rounded divide-y max-h-60 overflow-y-auto">
            {slots.map((slot, sidx) => {
              const start = new Date(slot.start);
              const end = new Date(slot.end);
              const slotStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              return (
                <div key={sidx} className="p-3 flex justify-between items-center bg-gray-50">
                  <span className="font-medium text-sm text-gray-700">Slot {sidx + 1}</span>
                  <span className="text-sm text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-semibold">{slotStr}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold disabled:bg-indigo-300"
              onClick={handleSaveFreeSlots}
              disabled={loading || slots.length === 0}
            >
              {loading ? 'Saving...' : 'Save Slots'}
            </button>
            <button
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 font-semibold"
              onClick={() => { setStep(1); setSlots([]); setExtraMinutesMessage(''); setError(''); }}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Allotted Schedules Section */}
      <div className="bg-gray-50 mt-8 p-4 rounded-lg shadow-inner">
        <h3 className="text-xl font-semibold mb-4">Allotted Review Schedules</h3>
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <input
            type="text"
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            placeholder="Filter by team"
            className="border rounded px-2 py-1 w-full md:w-1/2"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded px-2 py-1 w-full md:w-1/3"
          >
            <option value="all">All Types</option>
            {slotTypes.map(st => (
              <option key={st} value={st}>{st === 'viva' ? 'VIVA' : `Review ${st.replace('review', '')}`}</option>
            ))}
          </select>
        </div>
        {loadingSchedules ? (
          <div>Loading schedules...</div>
        ) : allottedSchedules.length === 0 ? (
          <div className="text-gray-500">No review schedules allotted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Review</th>
                  <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Team</th>
                  <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Panel</th>
                  <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Start</th>
                  <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">End</th>
                  <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Duration</th>
                  <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {allottedSchedules
                  .filter((s) => {
                    const teamName = (s.team?.teamName || 'Free Slot').toString().toLowerCase();
                    const teamOk = !filterTeam || teamName.includes(filterTeam.toLowerCase());
                    const rawType = (s.slotType || s.type || '').toString().toLowerCase();
                    const typeOk = filterType === 'all' || rawType === filterType;
                    return teamOk && typeOk;
                  })
                  .map((schedule) => {
                    const displayName = schedule.name || (schedule.slotType ? `${schedule.slotType}` : 'Review');
                    const rawType = (schedule.slotType || schedule.type || '').toString().toLowerCase();
                    const typeLabel = rawType === 'viva' ? 'VIVA' : `Review ${rawType.replace('review', '')}`;
                    let duration = schedule.duration;
                    try {
                      if ((!duration || duration === 0) && schedule.startTime && schedule.endTime) {
                        duration = Math.round((new Date(schedule.endTime) - new Date(schedule.startTime)) / 60000);
                      }
                    } catch (e) {
                      duration = schedule.duration || 0;
                    }
                    return (
                      <tr key={schedule._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 border text-sm">{displayName}</td>
                        <td className="px-3 py-2 border text-sm">{typeLabel}</td>
                        <td className="px-3 py-2 border text-sm font-semibold text-gray-600">{schedule.team?.teamName || 'Free Slot'}</td>
                        <td className="px-3 py-2 border text-sm">{schedule.panel?.name || 'N/A'}</td>
                        <td className="px-3 py-2 border text-sm">{schedule.startTime ? new Date(schedule.startTime).toLocaleString() : 'N/A'}</td>
                        <td className="px-3 py-2 border text-sm">{schedule.endTime ? new Date(schedule.endTime).toLocaleString() : 'N/A'}</td>
                        <td className="px-3 py-2 border text-sm">{duration ? `${duration} min` : 'N/A'}</td>
                        <td className="px-3 py-2 border text-sm">
                          <button
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            onClick={() => handleDeleteSchedule(schedule._id)}
                            disabled={loadingSchedules}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default CoordinatorReviewSchedule; 