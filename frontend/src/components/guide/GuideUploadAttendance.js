import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

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
        setNotification({
            isOpen: true,
            title,
            message,
            type
        });
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setNotification(prev => ({ ...prev, isOpen: false }));
        }, 4000);
    };

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(storedUser.role);
        fetchData();
    }, []);

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
            showNotification('Success', `Attendance for ${team.teamName} submitted successfully!`, 'success');
            fetchData();
        } catch (err) {
            console.error('Error uploading attendance:', err);
            showNotification('Error', err.response?.data?.message || 'Failed to upload attendance', 'error');
        }
    };

    const calculateAttendancePercentage = (studentId) => {
        let presentCount = 0;
        const studentAttendance = attendanceData[studentId];
        if (studentAttendance) {
            presentCount = reviewEvents.filter(event => studentAttendance[event]).length;
        }
        const percentage = (presentCount / reviewEvents.length) * 100;
        return `${percentage.toFixed(0)}%`;
    };

    if (loading) return <div className="text-center p-8 text-slate-500 font-medium">Loading attendance data...</div>;
    if (error) return <div className="text-rose-500 p-8 font-medium">{error}</div>;

    return (
        <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-8 relative">
            
            {/* Custom Notification Toast */}
            {notification.isOpen && (
                <div className="fixed top-6 right-6 z-50 transform transition-all duration-300 animate-in slide-in-from-top-4 sm:slide-in-from-right-4 max-w-sm w-full">
                    <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 bg-white ${notification.type === 'success' ? 'border-emerald-100 bg-emerald-50/10' : 'border-rose-100 bg-rose-50/10'}`}>
                        <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {notification.type === 'success' ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm">{notification.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{notification.message}</p>
                        </div>
                        <button 
                            onClick={() => setNotification(prev => ({ ...prev, isOpen: false }))}
                            className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Review Attendance Management</h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Mark and submit review attendance records.</p>
                </div>
            </div>

            {assignedTeams.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    <p className="text-slate-600 font-semibold text-lg">No teams found to mark attendance for.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {assignedTeams.map(team => (
                        <div key={team._id} className="border p-6 rounded-2xl transition-all duration-300 shadow-sm bg-white border-slate-100 hover:shadow-md">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-bold text-slate-800">{team.teamName}</h3>
                                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                                        {team.programme || 'UG'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm mb-6">
                                <table className="min-w-full divide-y divide-slate-100 bg-white">
                                    <thead className="bg-slate-50/75">
                                        <tr>
                                            <th className="py-3.5 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                                            {reviewEvents.map(event => (
                                                <th key={event} className="py-2.5 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-150">
                                                    <div className="mb-1.5">{event.toUpperCase().replace('REVIEW', 'REVIEW ')}</div>
                                                    <input
                                                        type="datetime-local"
                                                        value={reviewDates[team._id]?.[event] || ''}
                                                        onChange={(e) => handleReviewDateChange(team._id, event, e.target.value)}
                                                        disabled={userRole === 'admin'}
                                                        className="block mx-auto p-1 text-[11px] font-normal border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[140px] text-slate-800 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                    />
                                                </th>
                                            ))}
                                            <th className="py-3.5 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {/* Team Leader */}
                                        {team.teamLeader && (
                                            <tr key={team.teamLeader._id} className="hover:bg-slate-50/50 bg-indigo-50/30">
                                                <td className="py-4 px-4 text-left text-sm text-slate-900 font-semibold">{team.teamLeader.name}{/*  <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Leader</span> */}</td>
                                                {reviewEvents.map(event => {
                                                    const isPresent = attendanceData[team.teamLeader._id]?.[event] || false;
                                                    return (
                                                        <td key={event} className="py-4 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isPresent}
                                                                onChange={(e) => handleAttendanceChange(team.teamLeader._id, event, e.target.checked)}
                                                                disabled={userRole === 'admin'}
                                                                className="form-checkbox h-5 w-5 rounded border-slate-300 focus:ring-indigo-500 transition duration-200 text-indigo-600 disabled:opacity-60"
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-4 px-4 text-center text-sm text-slate-900 font-bold">
                                                    {calculateAttendancePercentage(team.teamLeader._id)}
                                                </td>
                                            </tr>
                                        )}
                                        {/* Team Members */}
                                        {team.members && team.members.map(member => (
                                            <tr key={member._id} className="hover:bg-slate-50/50">
                                                <td className="py-4 px-4 text-left text-sm text-slate-800">{member.name}</td>
                                                {reviewEvents.map(event => {
                                                    const isPresent = attendanceData[member._id]?.[event] || false;
                                                    return (
                                                        <td key={event} className="py-4 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isPresent}
                                                                onChange={(e) => handleAttendanceChange(member._id, event, e.target.checked)}
                                                                disabled={userRole === 'admin'}
                                                                className="form-checkbox h-5 w-5 rounded border-slate-300 focus:ring-indigo-500 transition duration-200 text-indigo-600 disabled:opacity-60"
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-4 px-4 text-center text-sm text-slate-800 font-bold">
                                                    {calculateAttendancePercentage(member._id)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {userRole !== 'admin' && (
                                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => handleSubmitAttendance(team._id)}
                                        className="w-full px-5 py-3.5 rounded-xl font-bold tracking-wide transition-all duration-300 shadow-md bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg hover:scale-[1.01]"
                                    >
                                        {`Submit Attendance for ${team.teamName}`}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GuideUploadAttendance;