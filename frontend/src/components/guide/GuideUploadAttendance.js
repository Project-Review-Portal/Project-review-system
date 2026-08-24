import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const GuideUploadAttendance = ({ programme }) => {
    const [assignedTeams, setAssignedTeams] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [attendanceData, setAttendanceData] = useState({}); // { studentId: { review1: bool, ... } }
    const [reviewDates, setReviewDates] = useState({}); // { teamId: { review0: "YYYY-MM-DDTHH:mm", ... } }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reviewEvents, setReviewEvents] = useState(['review1', 'review2', 'review3', 'viva']);

    const [notification, setNotification] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'success'
    });

    const showNotification = (title, message, type = 'success') => {
        setNotification({ isOpen: true, title, message, type });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, isOpen: false }));
        }, 4000);
    };

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(storedUser.role);
        fetchData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const settingsRes = await axios.get(`${SERVER_API_KEY}/api/auth/review-settings`, { headers });
            const validSlots = settingsRes.data.validSlotTypes || ['review1', 'review2', 'review3', 'viva'];
            setReviewEvents(validSlots);

            const teamsRes = await axios.get(`${SERVER_API_KEY}/api/guide/assigned-teams`, { headers });
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const selectedProgramme = programme || storedUser.programme;
            let fetchedTeams = teamsRes.data;
            if (selectedProgramme) {
                fetchedTeams = fetchedTeams.filter(t => t.programme?.toLowerCase() === selectedProgramme?.toLowerCase());
            }
            setAssignedTeams(fetchedTeams);

            const existingAttendanceRes = await axios.get(`${SERVER_API_KEY}/api/guide/daily-attendance`, { headers });
            if (existingAttendanceRes.data && existingAttendanceRes.data.attendanceData) {
                setAttendanceData(existingAttendanceRes.data.attendanceData);
                setReviewDates(existingAttendanceRes.data.reviewDates || {});
            } else {
                setAttendanceData(existingAttendanceRes.data || {});
                setReviewDates({});
            }

            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch data');
            setLoading(false);
        }
    };

    const handleAttendanceChange = (studentId, reviewEvent, isPresent) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [reviewEvent]: isPresent,
            },
        }));
    };

    const handleReviewDateChange = (teamId, reviewEvent, dateValue) => {
        setReviewDates(prev => ({
            ...prev,
            [teamId]: {
                ...(prev[teamId] || {}),
                [reviewEvent]: dateValue
            }
        }));
    };

    const handleSubmitAttendance = async (teamId) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const team = assignedTeams.find(t => t._id === teamId);
            const studentAttendances = [];

            // Helper function to map flat UI state to the dynamic assessments array schema
            const formatAssessments = (studentId) => {
                return reviewEvents.map(event => ({
                    name: event,
                    isPresent: !!attendanceData[studentId]?.[event]
                }));
            };

            // Add team leader if exists
            if (team.teamLeader) {
                studentAttendances.push({
                    student: team.teamLeader._id,
                    assessments: formatAssessments(team.teamLeader._id)
                });
            }

            // Add team members
            team.members.forEach(member => {
                studentAttendances.push({
                    student: member._id,
                    assessments: formatAssessments(member._id)
                });
            });

            // Map frontend dates to schema format
            const formattedDates = Object.entries(reviewDates[teamId] || {}).map(([name, date]) => ({
                name,
                date: date || null
            }));

            // Sends the restructured array matching Mongoose schema
            await axios.post(`${SERVER_API_KEY}/api/guide/upload-attendance`, {
                teamId,
                studentAttendances,
                reviewDates: formattedDates
            }, { headers });
            showNotification('Success', `Attendance for ${team.teamName} saved successfully!`, 'success');
            fetchData();
        } catch (err) {
            console.error('Error uploading attendance:', err);
            showNotification('Error', err.response?.data?.message || 'Failed to save attendance', 'error');
        }
    };

    if (loading) return <div className="text-center p-8 text-slate-500 font-medium">Loading attendance data...</div>;
    if (error) return <div className="text-rose-500 p-8 font-medium">{error}</div>;

    const isReadOnly = userRole === 'admin' || userRole === 'assistant coordinator';

    return (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 relative">

            {/* Read-only banner */}
            {userRole === 'assistant coordinator' && (
                <div className="p-3 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded font-medium text-center text-sm">
                    ℹ️ You are viewing this page in Read-Only Mode as an Assistant Coordinator.
                </div>
            )}

            {/* Toast Notification */}
            {notification.isOpen && (
                <div className="fixed top-6 right-6 z-50 max-w-sm w-full">
                    <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 bg-white ${notification.type === 'success' ? 'border-emerald-100' : 'border-rose-100'}`}>
                        <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {notification.type === 'success'
                                ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            }
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm">{notification.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{notification.message}</p>
                        </div>
                        <button onClick={() => setNotification(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-slate-600 p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="border-b border-slate-200 pb-3">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Review Attendance Management</h2>
                <p className="text-sm text-slate-500 mt-1">Mark and save review attendance for all assigned teams.</p>
            </div>

            {assignedTeams.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <p className="text-slate-600 font-semibold text-lg">No teams found to mark attendance for.</p>
                </div>
            ) : (
                <>
                    {/* Single unified attendance table */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                        <table className="min-w-full bg-white">
                            {/* Sticky dark header */}
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="py-2.5 px-3 text-left text-xs font-bold uppercase tracking-wider">#</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">Roll No</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">Student Name</th>
                                    {reviewEvents.map(event => (
                                        <th key={event} className="py-2.5 px-4 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                                            {event === 'viva' ? 'Viva' : event.replace('review', 'Review ')}
                                        </th>
                                    ))}
                                    {!isReadOnly && (
                                        <th className="py-2.5 px-3 text-center text-xs font-bold uppercase tracking-wider">Action</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {assignedTeams.map(team => {
                                    const allStudents = [];
                                    if (team.teamLeader) allStudents.push({ ...team.teamLeader, isLeader: true });
                                    (team.members || []).forEach(m => allStudents.push({ ...m, isLeader: false }));
                                    const colSpan = 3 + reviewEvents.length + (!isReadOnly ? 1 : 0);

                                    return (
                                        <React.Fragment key={team._id}>
                                            {/* Team separator row — team name left, date inputs per review column right */}
                                            <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                                                {/* Team name spans the first 3 fixed columns */}
                                                <td colSpan={3} className="py-2 px-3">
                                                    <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-widest">{team.teamName}</span>
                                                </td>
                                                {/* One date input per review column, aligned with the column */}
                                                {reviewEvents.map(event => (
                                                    <td key={event} className="py-2 px-2 text-center">
                                                        {!isReadOnly ? (
                                                            <input
                                                                type="datetime-local"
                                                                value={reviewDates[team._id]?.[event] || ''}
                                                                onChange={(e) => handleReviewDateChange(team._id, event, e.target.value)}
                                                                className="w-full max-w-[145px] p-0.5 text-[10px] border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 text-slate-700 bg-white"
                                                            />
                                                        ) : (
                                                            <span className="text-[10px] text-indigo-400 italic">
                                                                {reviewDates[team._id]?.[event]
                                                                    ? new Date(reviewDates[team._id][event]).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                                                                    : '—'}
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}
                                                {/* Empty action cell to keep columns aligned */}
                                                {!isReadOnly && <td />}
                                            </tr>

                                            {/* Student rows */}
                                            {allStudents.map((student, idx) => (
                                                <tr key={student._id}
                                                    className={student.isLeader ? 'bg-indigo-50/20 hover:bg-indigo-50/50' : 'hover:bg-slate-50/70'}>
                                                    <td className="py-1.5 px-3 text-xs text-slate-400 text-center">{idx + 1}</td>
                                                    <td className="py-1.5 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap">
                                                        {student.username || 'N/A'}
                                                    </td>
                                                    <td className="py-1.5 px-3 text-xs text-slate-800 whitespace-nowrap">
                                                        {student.name}
                                                    </td>
                                                    {reviewEvents.map(event => {
                                                        const isPresent = attendanceData[student._id]?.[event] || false;
                                                        return (
                                                            <td key={event} className="py-1.5 px-4 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isPresent}
                                                                    onChange={(e) => handleAttendanceChange(student._id, event, e.target.checked)}
                                                                    disabled={isReadOnly}
                                                                    className="form-checkbox h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                    {/* Save button — shown only in last student row of each team, spans all rows */}
                                                    {!isReadOnly && idx === 0 && (
                                                        <td rowSpan={allStudents.length} className="py-1.5 px-3 text-center align-middle">
                                                            <button
                                                                onClick={() => handleSubmitAttendance(team._id)}
                                                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm whitespace-nowrap"
                                                            >
                                                                Save
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default GuideUploadAttendance;