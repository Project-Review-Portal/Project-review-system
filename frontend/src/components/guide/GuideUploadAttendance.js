import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuideUploadAttendance = () => {
    const [assignedTeams, setAssignedTeams] = useState([]);
    const [attendanceData, setAttendanceData] = useState({}); // { studentId: { review1: bool, ... } }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reviewEvents, setReviewEvents] = useState(['review1', 'review2', 'review3', 'viva']);
    const [userRole, setUserRole] = useState('');
    const [userRoles, setUserRoles] = useState([]);

    // Custom Modal & Notification States
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        confirmText: '',
        confirmBg: ''
    });

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
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUserRole(parsed.role || '');
            if (Array.isArray(parsed.roles)) {
                setUserRoles(parsed.roles.map(r => r.role));
            }
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const settingsRes = await axios.get('/api/auth/review-settings', { headers });
            const validSlots = settingsRes.data.validSlotTypes || ['review1', 'review2', 'review3', 'viva'];
            setReviewEvents(validSlots);

            const teamsRes = await axios.get('/api/guide/assigned-teams', { headers });
            setAssignedTeams(teamsRes.data);

            const existingAttendanceRes = await axios.get('/api/guide/daily-attendance', { headers });
            setAttendanceData(existingAttendanceRes.data);

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
            
            // Sends the restructured array matching Mongoose schema
            await axios.post('/api/guide/upload-attendance', { teamId, studentAttendances }, { headers });
            showNotification('Success', `Attendance for ${team.teamName} submitted successfully!`, 'success');
            fetchData();
        } catch (err) {
            console.error('Error uploading attendance:', err);
            showNotification('Error', err.response?.data?.message || 'Failed to upload attendance', 'error');
        }
    };

    const handleLockAttendance = (teamId) => {
        const team = assignedTeams.find(t => t._id === teamId);
        setConfirmModal({
            isOpen: true,
            title: 'Lock Attendance',
            message: `Are you sure you want to lock the attendance for ${team ? team.teamName : 'this team'}? Once locked, attendance cannot be modified unless an administrator unlocks it.`,
            confirmText: 'Lock Attendance',
            confirmBg: 'from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 focus:ring-red-500',
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('token');
                    const headers = { Authorization: `Bearer ${token}` };
                    await axios.post('/api/guide/lock-attendance', { teamId }, { headers });
                    showNotification('Success', 'Attendance locked successfully!', 'success');
                    fetchData();
                } catch (err) {
                    console.error('Error locking attendance:', err);
                    showNotification('Error', err.response?.data?.message || 'Failed to lock attendance', 'error');
                }
            }
        });
    };

    const handleUnlockAttendance = (teamId) => {
        const team = assignedTeams.find(t => t._id === teamId);
        setConfirmModal({
            isOpen: true,
            title: 'Unlock Attendance',
            message: `Are you sure you want to unlock the attendance for ${team ? team.teamName : 'this team'}?`,
            confirmText: 'Unlock Attendance',
            confirmBg: 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:ring-emerald-500',
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('token');
                    const headers = { Authorization: `Bearer ${token}` };
                    await axios.post('/api/guide/unlock-attendance', { teamId }, { headers });
                    showNotification('Success', 'Attendance unlocked successfully!', 'success');
                    fetchData();
                } catch (err) {
                    console.error('Error unlocking attendance:', err);
                    showNotification('Error', err.response?.data?.message || 'Failed to unlock attendance', 'error');
                }
            }
        });
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

    const isCoordinator = userRole === 'coordinator' || userRoles.includes('coordinator');
    const isAdmin = userRole === 'admin' || userRoles.includes('admin');

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

            {/* Custom Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}></div>
                    
                    {/* Modal Content */}
                    <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-full ${confirmModal.title.includes('Lock') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {confirmModal.title.includes('Lock') ? (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmModal.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{confirmModal.message}</p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2.5 text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    confirmModal.onConfirm();
                                }}
                                className={`px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-gradient-to-r ${confirmModal.confirmBg} transition-all duration-300 shadow-md hover:shadow-lg`}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Review Attendance Management</h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Mark review attendance, lock records, or unlock as administrator.</p>
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
                        <div key={team._id} className={`border p-6 rounded-2xl transition-all duration-300 shadow-sm bg-white border-slate-100 hover:shadow-md ${team.isAttendanceLocked ? 'bg-slate-50/50 border-slate-200' : ''}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-bold text-slate-800">{team.teamName}</h3>
                                    {team.isAttendanceLocked ? (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/50 shadow-sm">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                                            Locked
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 shadow-sm">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H9V7a1 1 0 012 0v2h2V7a5 5 0 00-5-5z" clipRule="evenodd"/></svg>
                                            Active
                                        </span>
                                    )}
                                </div>
                                
                                {/* Lock/Unlock Controls */}
                                <div className="flex items-center gap-2">
                                    {!team.isAttendanceLocked && (isCoordinator || isAdmin) && (
                                        <button
                                            onClick={() => handleLockAttendance(team._id)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-sm hover:shadow transition-all duration-300 hover:scale-[1.02]"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                            Lock Attendance
                                        </button>
                                    )}
                                    {team.isAttendanceLocked && isAdmin && (
                                        <button
                                            onClick={() => handleUnlockAttendance(team._id)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm hover:shadow transition-all duration-300 hover:scale-[1.02]"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                                            Unlock Attendance
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm mb-6">
                                <table className="min-w-full divide-y divide-slate-100 bg-white">
                                    <thead className="bg-slate-50/75">
                                        <tr>
                                            <th className="py-3.5 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                                            {reviewEvents.map(event => (
                                                <th key={event} className="py-3.5 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    {event.toUpperCase()} 
                                                </th>
                                            ))}
                                            <th className="py-3.5 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {/* Team Leader */}
                                        {team.teamLeader && (
                                            <tr key={team.teamLeader._id} className="hover:bg-slate-50/50 bg-indigo-50/30">
                                                <td className="py-4 px-4 text-left text-sm text-slate-900 font-semibold">{team.teamLeader.name} <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Leader</span></td>
                                                {reviewEvents.map(event => {
                                                    const isPresent = attendanceData[team.teamLeader._id]?.[event] || false;
                                                    return (
                                                        <td key={event} className="py-4 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isPresent}
                                                                disabled={team.isAttendanceLocked}
                                                                onChange={(e) => handleAttendanceChange(team.teamLeader._id, event, e.target.checked)}
                                                                className="form-checkbox h-5 w-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
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
                                                                disabled={team.isAttendanceLocked}
                                                                onChange={(e) => handleAttendanceChange(member._id, event, e.target.checked)}
                                                                className="form-checkbox h-5 w-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
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
                            
                            <div className="mt-4">
                                <button
                                    onClick={() => handleSubmitAttendance(team._id)}
                                    disabled={team.isAttendanceLocked}
                                    className={`w-full px-5 py-3.5 rounded-xl font-bold tracking-wide transition-all duration-300 shadow-md ${
                                        team.isAttendanceLocked
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg hover:scale-[1.01]'
                                    }`}
                                >
                                    {team.isAttendanceLocked ? 'Attendance Locked' : `Submit Attendance for ${team.teamName}`}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GuideUploadAttendance;