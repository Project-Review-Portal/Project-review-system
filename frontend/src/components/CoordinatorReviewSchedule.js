import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../utils/toast';
const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";
const DURATION_OPTIONS = [10, 15, 20, 25, 30];

const CoordinatorReviewSchedule = () => {
  const [user, setUser] = useState(null);
  const [reviewTypes, setReviewTypes] = useState([
    { value: 'review0', label: 'Review 0' },
    { value: 'review1', label: 'Review 1' },
    { value: 'review2', label: 'Review 2' },
    { value: 'review3', label: 'Review 3' },
  ]);
  const [slotTypes, setSlotTypes] = useState(['review0', 'review1', 'review2', 'review3', 'viva']);
  const [form, setForm] = useState({
    reviewType: 'review0',
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
  const [selectedSlotType, setSelectedSlotType] = useState('review0');

  useEffect(() => {
    if (error) {
      toast.error(error);
      setError('');
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      toast.success(message);
      setMessage('');
    }
  }, [message]);

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
      const validSlots = settingsRes.data.validSlotTypes || ['review0', 'review1', 'review2', 'review3', 'viva'];
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
          fetchedSchedules = fetchedSchedules.filter(sch => 
              (sch.team?.programme?.toLowerCase() === selectedProgramme?.toLowerCase()) ||
              (sch.panel?.programme?.toLowerCase() === selectedProgramme?.toLowerCase())
          );
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
            fetchedSchedules = fetchedSchedules.filter(sch => 
                (sch.team?.programme?.toLowerCase() === selectedProgramme?.toLowerCase()) ||
                (sch.panel?.programme?.toLowerCase() === selectedProgramme?.toLowerCase())
            );
        }
        setAllottedSchedules(fetchedSchedules);
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

  const handleDeleteSchedule = async (scheduleId, hasAssignedTeam, teamName) => {
    const isReadOnly = user?.role === 'assistant coordinator';
    if (isReadOnly) {
      setError('Action forbidden in Read-Only Mode.');
      return;
    }
    
    let confirmMsg = 'Are you sure you want to delete this slot?';
    if (hasAssignedTeam) {
      confirmMsg = `Warning: Team "${teamName}" is already assigned to this slot. Are you sure you want to delete the slot? This will cancel the schedule for this team and keep data consistent across guide logins.`;
    }
    
    if (!window.confirm(confirmMsg)) return;
    
    setLoadingSchedules(true);
    setError('');
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${SERVER_API_KEY}/api/panels/coordinator/allotted-schedules/${scheduleId}`, { headers: { Authorization: `Bearer ${token}` } });
      
      const res = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/allotted-schedules`, { headers: { Authorization: `Bearer ${token}` } });
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const selectedProgramme = storedUser.programme;
      let fetchedSchedules = res.data || [];
      if (selectedProgramme) {
          fetchedSchedules = fetchedSchedules.filter(sch => 
              (sch.team?.programme?.toLowerCase() === selectedProgramme?.toLowerCase()) ||
              (sch.panel?.programme?.toLowerCase() === selectedProgramme?.toLowerCase())
          );
      }
      setAllottedSchedules(fetchedSchedules);
      setMessage('Slot deleted successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete slot');
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleExportAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const prog = storedUser.programme || 'B.E. CSE';
      const selectedType = form.reviewType;
      
      const response = await axios.get(
        `${SERVER_API_KEY}/api/panels/coordinator/export-zeroth-attendance?programme=${encodeURIComponent(prog)}&reviewType=${selectedType}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Determine filename dynamically
      const type = selectedType || 'review0';
      let reviewLabel = 'Zeroth Review';
      if (type === 'viva') {
        reviewLabel = 'VIVA';
      } else if (type.startsWith('review')) {
        const num = type.replace('review', '');
        if (num === '0') reviewLabel = 'Zeroth Review';
        else if (num === '1') reviewLabel = 'First Review';
        else if (num === '2') reviewLabel = 'Second Review';
        else if (num === '3') reviewLabel = 'Third Review';
        else reviewLabel = `Review ${num}`;
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reviewLabel.replace(/\s+/g, '_')}_Attendance_${prog.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage(`${reviewLabel} attendance sheet exported successfully!`);
      setError('');
    } catch (err) {
      console.error('Error exporting attendance:', err);
      setError('Failed to export attendance sheet.');
      setMessage('');
    }
  };

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

  // Format start/end times into e.g. "09.30 am to 09.50 am"
  const formatPeriodLabel = (startStr, endStr) => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const pad = (n) => String(n).padStart(2, '0');
    
    const formatTime = (dateObj) => {
      let hours = dateObj.getHours();
      const minutes = pad(dateObj.getMinutes());
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12; // '0' becomes '12'
      return `${pad(hours)}.${minutes} ${ampm}`;
    };
    
    return `${formatTime(s)} to ${formatTime(e)}`;
  };

  // Filter slots by selected slotType (review1, review2, review3, viva)
  const filteredSlots = allottedSchedules.filter(s => s.slotType === selectedSlotType);

  // Group slots by Date only (normalized string)
  const dateGroupsMap = new Map();
  filteredSlots.forEach(s => {
    const d = new Date(s.date);
    const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!dateGroupsMap.has(dateKey)) {
      dateGroupsMap.set(dateKey, {
        dateKey,
        dateVal: d,
        slots: []
      });
    }
    dateGroupsMap.get(dateKey).slots.push(s);
  });

  // Sort dates chronologically
  const sortedDates = Array.from(dateGroupsMap.values()).sort((a, b) => a.dateVal - b.dateVal);

  // Selected review type display label
  const selectedReviewTypeObj = reviewTypes.find(rt => rt.value === form.reviewType);
  const selectedLabel = selectedReviewTypeObj ? selectedReviewTypeObj.label : 'Review';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800">Review Schedule</h2>
        <button
          type="button"
          onClick={handleExportAttendance}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition-colors flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export {selectedLabel} Attendance (Excel)
        </button>
      </div>
      {isReadOnly && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded font-medium text-center">
          ℹ️ You are viewing this page in Read-Only Mode as an Assistant Coordinator.
        </div>
      )}

      
      {step === 1 && (
        <form onSubmit={handleGenerateSlots} className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Review Type</label>
              <select name="reviewType" value={form.reviewType} onChange={handleChange} className="w-full border rounded px-2 py-1" disabled={isReadOnly}>
                {reviewTypes.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full border rounded px-2 py-1" required disabled={isReadOnly} />
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
          <button type="submit" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 font-semibold" disabled={loading || formInvalid || isReadOnly}>
            {loading ? 'Generating...' : 'Generate Slots'}
          </button>
        </form>
      )}
      
      {step === 2 && (
        <div className="space-y-4 max-w-3xl">
          <h3 className="text-lg font-semibold text-gray-800">Review Generated Slots</h3>
          {extraMinutesMessage && (
            <div className="p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded text-sm">
              ⚠️ {extraMinutesMessage}
            </div>
          )}
          
          {/* Conflict warning */}
          {slots.some(s => s.hasConflict) && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded text-sm font-semibold">
              ⚠️ already slots are present in that time duration
            </div>
          )}

          <div className="border rounded divide-y max-h-60 overflow-y-auto bg-white">
            {slots.map((slot, sidx) => {
              const start = new Date(slot.start);
              const end = new Date(slot.end);
              const slotStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              return (
                <div key={sidx} className={`p-3 flex justify-between items-center ${slot.hasConflict ? 'bg-red-50/50 border-l-4 border-red-500' : 'bg-gray-50'}`}>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-gray-700">Slot {sidx + 1}</span>
                    {slot.hasConflict && (
                      <span className="text-[10px] text-red-600 font-bold uppercase mt-0.5">Time Conflict</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-semibold">{slotStr}</span>
                    <button
                      type="button"
                      onClick={() => setSlots(prev => prev.filter((_, i) => i !== sidx))}
                      className="text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 border border-transparent hover:border-red-200 rounded transition"
                      title="Remove Slot from generation"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold disabled:bg-indigo-300 disabled:cursor-not-allowed"
              onClick={handleSaveFreeSlots}
              disabled={loading || slots.length === 0 || slots.some(s => s.hasConflict)}
              title={slots.some(s => s.hasConflict) ? 'remove slots that has conflicts with exisiting ones' : 'Save generated slots'}
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

      {/* Slots Timetable Section */}
      <div className="bg-gray-50 mt-8 p-6 rounded-lg shadow-inner w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Allotted Slots Timetable</h3>
            <p className="text-xs text-gray-500 mt-1">Review the free and assigned slots for your coordinated panels.</p>
          </div>
          
          {/* Slot Type Selector */}
          <div className="flex bg-white p-1 rounded-md border shadow-sm">
            {['review0', 'review1', 'review2', 'review3', 'viva'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => { setSelectedSlotType(type); setError(''); setMessage(''); }}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition tracking-wider ${selectedSlotType === type ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {type === 'viva' ? 'Viva' : type === 'review0' ? 'Review 0' : `Review ${type.replace('review', '')}`}
              </button>
            ))}
          </div>
        </div>

        {loadingSchedules ? (
          <div className="text-center py-8 font-bold text-gray-500">Loading timetable slots...</div>
        ) : filteredSlots.length === 0 ? (
          <div className="text-center py-8 bg-white border rounded-lg text-gray-500 font-semibold shadow-sm">
            No slots have been set for this review type yet.
          </div>
        ) : (
          <div className="space-y-5">
            {sortedDates.map(group => {
              const slotsForDate = [...group.slots].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
              const hasFN = slotsForDate.some(s => new Date(s.startTime).getHours() < 12);
              const hasAN = slotsForDate.some(s => new Date(s.startTime).getHours() >= 12);

              const chunkArray = (arr, size) => {
                const chunks = [];
                for (let i = 0; i < arr.length; i += size) {
                  chunks.push(arr.slice(i, i + size));
                }
                return chunks;
              };
              const chunks = chunkArray(slotsForDate, 5);

              const dateObj = group.dateVal;
              const formattedDateLabel = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

              return (
                <div key={group.dateKey} className="flex flex-col md:flex-row gap-4 bg-white p-5 border rounded-lg shadow-sm">
                  {/* Left Column: Date Box */}
                  <div className="md:w-48 flex-shrink-0 bg-gray-50 p-4 border rounded-md flex flex-col justify-center items-center text-center">
                    <div className="font-bold text-gray-800 text-sm">{formattedDateLabel}</div>
                    <div className="text-xs text-gray-500 font-semibold mt-1">{dayName}</div>
                    
                    {/* Session Badges */}
                    <div className="mt-3 flex gap-1.5 justify-center">
                      {hasFN && (
                        <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700" title="Forenoon">FN</span>
                      )}
                      {hasAN && (
                        <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700" title="Afternoon">AN</span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Chunks of Slots */}
                  <div className="flex-1 space-y-4">
                    {chunks.map((chunk, chunkIdx) => (
                      <div key={chunkIdx} className="space-y-1">
                        {/* Header Row (Periods) */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                          {chunk.map((slot, sIdx) => (
                            <div key={sIdx} className="bg-indigo-600 text-white font-bold text-[10px] text-center py-1.5 px-2 rounded-t uppercase tracking-wider animate-pulse-subtle">
                              {formatPeriodLabel(slot.startTime, slot.endTime)}
                            </div>
                          ))}
                          {/* Fill remaining empty columns */}
                          {chunk.length < 5 && Array.from({ length: 5 - chunk.length }).map((_, i) => (
                            <div key={`empty-hdr-${i}`} className="hidden sm:block"></div>
                          ))}
                        </div>

                        {/* Slots Row (Cards) */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                          {chunk.map((slot, sIdx) => {
                            const hasTeam = !!slot.team;
                            const teamName = slot.team?.teamName || 'Free Slot';
                            const supervisorName = slot.team?.guidePreference?.name || '—';

                            if (!hasTeam) {
                              return (
                                <div key={sIdx} className="border p-3 bg-green-50/30 border-green-200 rounded-b text-center flex flex-col justify-between items-center transition-colors hover:bg-green-50/50 min-h-[105px]">
                                  <div className="text-[9px] uppercase font-extrabold text-green-700 tracking-wider">Free Slot</div>
                                  <div className="text-[10px] text-gray-400 my-1">Supervisor: —</div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSchedule(slot._id, false)}
                                    className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 rounded text-[9px] font-bold uppercase transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                    disabled={isReadOnly}
                                  >
                                    Delete Slot
                                  </button>
                                </div>
                              );
                            } else {
                              return (
                                <div key={sIdx} className="border p-3 bg-indigo-50 border-indigo-200 rounded-b text-center flex flex-col justify-between items-center transition-colors hover:bg-indigo-100/30 min-h-[105px]">
                                  <div>
                                    <div className="text-[9px] uppercase font-extrabold text-indigo-700 tracking-wider">Assigned Team</div>
                                    <div className="font-bold text-gray-800 text-xs mt-0.5 truncate max-w-full" title={teamName}>{teamName}</div>
                                    <div className="text-[9px] text-indigo-600 font-semibold truncate max-w-full" title={`Supervisor: ${supervisorName}`}>Supervisor: {supervisorName}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSchedule(slot._id, true, teamName)}
                                    className="mt-2 px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 rounded text-[9px] font-bold uppercase transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full"
                                    disabled={isReadOnly}
                                  >
                                    Delete Slot
                                  </button>
                                </div>
                              );
                            }
                          })}
                          {/* Fill remaining empty columns */}
                          {chunk.length < 5 && Array.from({ length: 5 - chunk.length }).map((_, i) => (
                            <div key={`empty-card-${i}`} className="hidden sm:block"></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinatorReviewSchedule; 