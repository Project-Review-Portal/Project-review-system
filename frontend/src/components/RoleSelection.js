import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from '../utils/toast';
import { 
  CalendarIcon, 
  SparklesIcon, 
  LockIcon, 
  RefreshIcon, 
  ArrowRightIcon, 
  ShieldCheckIcon, 
  UserIcon,
  AlertTriangleIcon
} from './ui/Icons';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

// Sub-component to render a role card with taste-calibrated styling
const RoleRow = ({ roleObj, loading, getRoleDisplayName, handleRoleSelect }) => {
    const onClick = () => {
        handleRoleSelect(roleObj);
    };

    return (
        <div 
            onClick={loading ? undefined : onClick}
            className={`w-full p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                loading 
                    ? 'bg-slate-100/60 border-slate-200 cursor-not-allowed opacity-50' 
                    : 'liquid-glass-interactive border-slate-200/80 hover:border-slate-300 active:scale-[0.99]'
            }`}
        >
            <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {roleObj.role.slice(0, 2).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                        {getRoleDisplayName(roleObj.role)}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                            Programme: <span className="font-bold text-slate-700">{roleObj.programme}</span>
                        </span>
                    </div>
                </div>
            </div>
            <div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                    }}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 bg-slate-100/80 hover:bg-slate-900 hover:text-white px-3.5 py-2 rounded-xl transition-all border border-slate-200 shadow-xs active:scale-95"
                >
                    <span>Enter</span>
                    <ArrowRightIcon className="w-3 h-3" />
                </button>
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
    const [dynamicRoles, setDynamicRoles] = useState(user.roles || []);
    const [loadingRoles, setLoadingRoles] = useState(false);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchUserRolesForSession = async (session) => {
        if (!session || !session._id) return;
        try {
            setLoadingRoles(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${SERVER_API_KEY}/api/auth/roles`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'x-selected-session': session._id
                }
            });
            const fetchedRoles = res.data.roles || [];
            setDynamicRoles(fetchedRoles);
            
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            storedUser.roles = fetchedRoles;
            localStorage.setItem('user', JSON.stringify(storedUser));
        } catch (err) {
            console.error('Error fetching session active roles:', err);
        } finally {
            setLoadingRoles(false);
        }
    };

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
                if (found) {
                    setSelectedSession(found);
                    setStep('role');
                    fetchUserRolesForSession(found);
                }
            }
        } catch (err) {
            console.error('Error fetching sessions:', err);
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleSessionSelect = (session) => {
        setSelectedSession(session);
        localStorage.setItem('selectedSessionId', session._id);
        localStorage.setItem('selectedSessionName', session.name);
        localStorage.setItem('isSessionReadOnly', session.isReadOnly ? 'true' : 'false');
        setStep('role');
        fetchUserRolesForSession(session);
    };

    const availableRoles = dynamicRoles.length > 0 ? dynamicRoles : (user.roles || []);
    
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
            <div className="min-h-[100dvh] flex items-center justify-center bg-mesh-pattern relative overflow-hidden p-4 py-16">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

                <div className="liquid-glass max-w-lg w-full rounded-3xl p-8 sm:p-10 relative z-10 space-y-6">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-sm ring-4 ring-white/60">
                            <CalendarIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Academic Session</h2>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">Select the active academic term to access allocations:</p>
                    </div>

                    {loadingSessions ? (
                        <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center gap-2">
                            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                            <span>Loading academic sessions...</span>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-xs font-medium">
                            No academic sessions available. Please contact your portal administrator.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map(s => (
                                <div
                                    key={s._id}
                                    onClick={() => handleSessionSelect(s)}
                                    className={`w-full p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                                        s.isCurrent
                                            ? 'bg-amber-50/60 border-amber-200 hover:border-amber-400 hover:shadow-md'
                                            : s.isAdvanced
                                            ? 'bg-blue-50/60 border-blue-200 hover:border-blue-400 hover:shadow-md'
                                            : 'liquid-glass-interactive border-slate-200 hover:border-slate-400 hover:shadow-md'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">{s.name}</span>
                                            {s.isCurrent && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                                                    <SparklesIcon className="w-3 h-3 text-amber-600" />
                                                    <span>Current</span>
                                                </span>
                                            )}
                                            {s.isAdvanced && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                                                    <ShieldCheckIcon className="w-3 h-3 text-blue-600" />
                                                    <span>Advanced</span>
                                                </span>
                                            )}
                                            {s.isReadOnly && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                                                    <LockIcon className="w-3 h-3 text-slate-500" />
                                                    <span>Read-Only</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 font-medium">
                                            {s.semesterType === 'odd' ? 'Odd Semester' : 'Even Semester'}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                                            {s.isReadOnly ? 'Inspect' : 'Select'}
                                            <ArrowRightIcon className="w-3 h-3 text-slate-400" />
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="text-center pt-4 border-t border-slate-200/80">
                        <button
                            onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                navigate('/login');
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 3: Panel Selection
    if (step === 'panel' && panelsToSelect.length > 0) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-mesh-pattern relative overflow-hidden p-4 py-16">
                <div className="liquid-glass max-w-md w-full rounded-3xl p-8 sm:p-10 relative z-10 space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Select Panel</h2>
                        <p className="text-slate-500 text-xs">
                            You coordinate multiple panels for this programme in <strong className="text-slate-800">{selectedSession?.name}</strong>. Choose one to monitor:
                        </p>
                    </div>

                    <div className="space-y-3">
                        {panelsToSelect.map((panel) => (
                            <div 
                                key={panel._id} 
                                onClick={() => handlePanelSelect(panel)}
                                className="w-full p-4 rounded-2xl border liquid-glass-interactive border-slate-200 hover:border-slate-400 transition cursor-pointer flex justify-between items-center shadow-xs hover:shadow-md"
                            >
                                <div>
                                    <h3 className="font-extrabold text-slate-900 text-sm">{panel.name}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Programme: {panel.programme}</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePanelSelect(panel);
                                    }}
                                    className="text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-900 hover:text-white transition"
                                >
                                    Select →
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="text-center pt-4 border-t border-slate-200/80">
                        <button
                            onClick={() => {
                                setPanelsToSelect([]);
                                setPendingRoleObj(null);
                                setStep('role');
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                        >
                            ← Back to Roles
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Role Selection View
    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-mesh-pattern relative overflow-hidden p-4 py-16">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="liquid-glass max-w-md w-full rounded-3xl p-8 sm:p-10 relative z-10 space-y-6">
                {/* Active Session Ribbon */}
                <div className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Academic Session</div>
                        <div className="text-sm font-extrabold text-slate-900 tracking-tight">{selectedSession?.name}</div>
                    </div>
                    <button
                        onClick={() => setStep('session')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 transition shadow-xs active:scale-95"
                    >
                        <RefreshIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Switch</span>
                    </button>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Select Role & Programme</h2>
                    <p className="text-slate-500 text-xs mt-1">Choose the designated faculty profile for this academic term:</p>
                </div>

                <div className="space-y-3">
                    {loadingRoles ? (
                        <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center gap-2">
                            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                            <span>Synchronizing role authorizations...</span>
                        </div>
                    ) : (
                        uniqueRoles.map((roleObj, index) => (
                            <RoleRow
                                key={index}
                                roleObj={roleObj}
                                loading={loading}
                                getRoleDisplayName={getRoleDisplayName}
                                handleRoleSelect={handleRoleSelect}
                            />
                        ))
                    )}
                </div>

                {loading && (
                    <div className="text-center py-2 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600">
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        <span>Initializing role dashboard...</span>
                    </div>
                )}

                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <strong className="font-bold">EXTERNAL EXAMINERS:</strong> Select <strong>Panel Member</strong> as your entry role to access external evaluation marks sheets.
                    </div>
                </div>

                <div className="text-center pt-2 border-t border-slate-200/80">
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            navigate('/login');
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
