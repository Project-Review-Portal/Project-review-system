import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../utils/toast';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

// Sub-component to render a role row (separated by programme)
const RoleRow = ({ roleObj, loading, getRoleDisplayName, handleRoleSelect }) => {
    const onClick = () => {
        handleRoleSelect(roleObj);
    };

    return (
        <div className={`w-full p-4 rounded-xl border-2 transition-all ${loading ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200 hover:border-indigo-400 shadow-sm'}`}>
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-semibold text-gray-900">
                        {getRoleDisplayName(roleObj.role)}
                    </h3>
                    <span className="text-xs text-indigo-600 font-medium">Programme: {roleObj.programme}</span>
                </div>
                <div>
                    <button
                        onClick={onClick}
                        disabled={loading}
                        className={`text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-100 transition'}`}
                    >
                        Enter →
                    </button>
                </div>
            </div>
        </div>
    );
};

const RoleSelection = () => {
    const [step, setStep] = useState('session'); // 'session' | 'role' | 'panel'
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [loadingSessions, setLoadingSessions] = useState(true);

    const [loading, setLoading] = useState(false);
    const [panelsToSelect, setPanelsToSelect] = useState([]);
    const [pendingRoleObj, setPendingRoleObj] = useState(null);
    const navigate = useNavigate();

    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoadingSessions(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${SERVER_API_KEY}/api/sessions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const allSessions = res.data.sessions || [];
            setSessions(allSessions);

            // Check if already selected a session
            const storedSessionId = localStorage.getItem('selectedSessionId');
            if (storedSessionId) {
                const found = allSessions.find(s => s._id === storedSessionId);
                if (found && found.status !== 'paused') {
                    setSelectedSession(found);
                    setStep('role');
                }
            }
        } catch (err) {
            console.error('Error fetching sessions:', err);
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleSessionSelect = (session) => {
        if (session.status === 'paused') {
            toast.error('This session is currently paused by the administrator. Access is blocked.');
            return;
        }

        setSelectedSession(session);
        localStorage.setItem('selectedSessionId', session._id);
        localStorage.setItem('selectedSessionName', session.name);
        localStorage.setItem('isSessionReadOnly', session.isReadOnly ? 'true' : 'false');
        setStep('role');
    };

    const availableRoles = user.roles || [];
    
    // Group by unique (role, programme) pairs
    const seenKeys = new Set();
    const uniqueRoles = [];
    (availableRoles || []).forEach(roleObj => {
        if (!['guide', 'panel', 'coordinator', 'assistant coordinator'].includes(roleObj.role)) return;
        const role = roleObj.role;
        const programme = roleObj.programme || 'B.E. CSE';
        const key = `${role}-${programme}`;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueRoles.push({ role, programme });
        }
    });

    const handleRoleSelect = async (roleObj) => {
        setLoading(true);
        try {
            // If the role is coordinator or assistant coordinator, check if they have multiple panels
            if (roleObj.role === 'coordinator' || roleObj.role === 'assistant coordinator') {
                const token = localStorage.getItem('token');
                const panelsRes = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/panel-status`, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'x-selected-programme': roleObj.programme,
                        'x-selected-session': selectedSession?._id
                    }
                });
                const panels = panelsRes.data.panels || [];
                if (panels.length > 1) {
                    setPanelsToSelect(panels);
                    setPendingRoleObj(roleObj);
                    setStep('panel');
                    setLoading(false);
                    return; // Halt and show panel selection menu
                } else if (panels.length === 1) {
                    // Auto-select the single panel
                    localStorage.setItem('selectedPanelId', panels[0]._id);
                    localStorage.setItem('selectedPanelName', panels[0].name);
                    localStorage.setItem('coordinatorPanels', JSON.stringify(panels));
                } else {
                    localStorage.removeItem('selectedPanelId');
                    localStorage.removeItem('selectedPanelName');
                    localStorage.removeItem('coordinatorPanels');
                }
            } else {
                localStorage.removeItem('selectedPanelId');
                localStorage.removeItem('selectedPanelName');
                localStorage.removeItem('coordinatorPanels');
            }

            // Update the user's current role, programme, and session in localStorage
            const updatedUser = {
                ...user,
                role: roleObj.role,
                programme: roleObj.programme,
                session: selectedSession?._id
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            localStorage.setItem('selectedRole', JSON.stringify({ role: roleObj.role, programme: roleObj.programme }));

            // Navigate based on the selected role
            if (roleObj.role === 'coordinator' || roleObj.role === 'assistant coordinator') {
                navigate('/coordinator-dashboard/review-schedule');
            } else if (roleObj.role === 'guide') {
                navigate('/guide-dashboard');
            } else if (roleObj.role === 'panel') {
                navigate('/panel-dashboard');
            } else {
                navigate('/faculty-dashboard');
            }
        } catch (error) {
            console.error('Error selecting role:', error);
            toast.error(error.response?.data?.message || 'Error navigating to selected role');
        } finally {
            setLoading(false);
        }
    };

    const handlePanelSelect = (panel) => {
        if (!pendingRoleObj) return;
        
        // Update user storage
        const updatedUser = {
            ...user,
            role: pendingRoleObj.role,
            programme: pendingRoleObj.programme,
            session: selectedSession?._id
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('selectedRole', JSON.stringify({ role: pendingRoleObj.role, programme: pendingRoleObj.programme }));
        localStorage.setItem('selectedPanelId', panel._id);
        localStorage.setItem('selectedPanelName', panel.name);
        localStorage.setItem('coordinatorPanels', JSON.stringify(panelsToSelect));

        navigate('/coordinator-dashboard/review-schedule');
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'guide':
                return 'Guide';
            case 'panel':
                return 'Panel Member';
            case 'coordinator':
                return 'Coordinator';
            case 'assistant coordinator':
                return 'Assistant Coordinator';
            default:
                return role.charAt(0).toUpperCase() + role.slice(1);
        }
    };

    // Step 1: Session Selection View
    if (step === 'session') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-lg w-full space-y-6 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
                    <div className="text-center">
                        <div className="text-4xl mb-2">📅</div>
                        <h2 className="text-2xl font-extrabold text-gray-900">Select Academic Session</h2>
                        <p className="text-gray-500 text-sm mt-1">Please select the session you want to access:</p>
                    </div>

                    {loadingSessions ? (
                        <div className="text-center py-6 text-gray-400 text-sm animate-pulse">Loading sessions…</div>
                    ) : sessions.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 border border-dashed rounded-xl">
                            No academic sessions available. Contact administrator.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map(s => {
                                const isPaused = s.status === 'paused';
                                return (
                                    <div
                                        key={s._id}
                                        onClick={() => !isPaused && handleSessionSelect(s)}
                                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                                            isPaused
                                                ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                                                : 'bg-white border-gray-200 hover:border-indigo-500 hover:shadow-md cursor-pointer'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 text-base">{s.name}</span>
                                                {s.isCurrent && (
                                                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                                                        ⭐ Current
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {s.semesterType === 'odd' ? 'Odd Semester' : 'Even Semester'}
                                                {s.academicYear ? ` · ${s.academicYear}` : ''}
                                            </div>
                                        </div>

                                        <div>
                                            {isPaused ? (
                                                <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                                                    ⏸️ Paused by Admin
                                                </span>
                                            ) : (
                                                <span className="text-indigo-600 font-bold text-sm">
                                                    Select →
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="text-center pt-4 border-t">
                        <button
                            onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                navigate('/login');
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 3: Panel Selection (Coordinator with multiple panels)
    if (step === 'panel' && panelsToSelect.length > 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Panel</h2>
                        <p className="text-gray-600 text-sm mb-6">You coordinate multiple panels for this programme in <strong>{selectedSession?.name}</strong>. Choose one to monitor:</p>
                    </div>

                    <div className="space-y-3">
                        {panelsToSelect.map((panel) => (
                            <div key={panel._id} className="w-full p-4 rounded-xl border-2 bg-white border-gray-200 hover:border-indigo-500 transition shadow-sm">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{panel.name}</h3>
                                        <p className="text-xs text-gray-500">Programme: {panel.programme}</p>
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => handlePanelSelect(panel)}
                                            className="text-indigo-600 font-semibold hover:underline text-sm"
                                        >
                                            Select
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center pt-4 border-t">
                        <button
                            onClick={() => {
                                setPanelsToSelect([]);
                                setPendingRoleObj(null);
                                setStep('role');
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                            Back to Roles
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Role Selection View
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
                <div className="flex items-center justify-between border-b pb-3">
                    <div>
                        <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Active Session</div>
                        <div className="text-sm font-bold text-gray-800">{selectedSession?.name}</div>
                    </div>
                    <button
                        onClick={() => setStep('session')}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100"
                    >
                        🔄 Switch Session
                    </button>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome</h2>
                    <p className="text-gray-600 text-sm">Please select the role and programme you want to enter:</p>
                </div>

                <div className="space-y-3">
                    {uniqueRoles.map((roleObj, index) => (
                        <RoleRow
                            key={index}
                            roleObj={roleObj}
                            loading={loading}
                            getRoleDisplayName={getRoleDisplayName}
                            handleRoleSelect={handleRoleSelect}
                        />
                    ))}
                </div>

                {loading && (
                    <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-sm text-gray-600">Loading...</p>
                    </div>
                )}

                <div className="text-center pt-4 border-t">
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            navigate('/login');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        Sign out
                    </button>
                </div>

                <div className="bg-amber-50 border border-amber-300 text-amber-800 px-3 py-2 rounded-lg text-center text-xs font-semibold">
                    EXTERNAL MEMBERS! Choose <strong>Panel Member</strong> as your role.
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;