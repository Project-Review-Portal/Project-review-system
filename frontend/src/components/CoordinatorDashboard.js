import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import CoordinatorReviewSchedule from './CoordinatorReviewSchedule';
import CoordinatorVivaSchedule from './coordinator/CoordinatorVivaSchedule';
import CoordinatorAssignedTeams from './coordinator/CoordinatorAssignedTeams';
// Replaces old LetterGeneration page with the live editor
import GuideMe from './GuideMe';
import CoordinatorLetterLiveEditorCK from './CoordinatorLetterLiveEditorCK';

const CoordinatorRulesDashboard = () => {
    const [teamFormationOpen, setTeamFormationOpen] = useState(true);
    const navigate = useNavigate();
    const [guideSelectionStart, setGuideSelectionStart] = useState(null);
    const [guideSelectionEnd, setGuideSelectionEnd] = useState(null);
    const [loadingRules, setLoadingRules] = useState(true);
    const [rulesError, setRulesError] = useState('');
    const [panelStatus, setPanelStatus] = useState(null);
    const [loadingPanel, setLoadingPanel] = useState(false);
    const [authStatus, setAuthStatus] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(false);

    useEffect(() => {
        const fetchRules = async () => {
            try {
                const token = localStorage.getItem('token');
                const configRes = await fetch('http://localhost:5000/api/teams/config/public');
                const configData = await configRes.json();
                setTeamFormationOpen(configData.teamFormationOpen);
                if (token) {
                    const guideDatesRes = await fetch('http://localhost:5000/api/guide/selection-dates', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (guideDatesRes.ok) {
                        const guideDates = await guideDatesRes.json();
                        setGuideSelectionStart(guideDates.startDate);
                        setGuideSelectionEnd(guideDates.endDate);
                    }
                }
            } catch (err) {
                setRulesError('Could not load rules info.');
            } finally {
                setLoadingRules(false);
            }
        };
        fetchRules();
    }, []);

    const checkPanelStatus = async () => {
        setLoadingPanel(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/panels/coordinator/panel-status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setPanelStatus(data);
        } catch (err) {
            console.error('Error checking panel status:', err);
            setPanelStatus({ error: 'Failed to check panel status' });
        } finally {
            setLoadingPanel(false);
        }
    };

    const checkAuthStatus = async () => {
        setLoadingAuth(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/panels/coordinator/debug-auth', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setAuthStatus(data);
        } catch (err) {
            console.error('Error checking auth status:', err);
            setAuthStatus({ error: 'Failed to check auth status', details: err.message });
        } finally {
            setLoadingAuth(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Coordinator Dashboard Rules & Info</h2>
            {loadingRules ? (
                <div className="mb-4 text-blue-700">Loading rules...</div>
            ) : rulesError ? (
                <div className="mb-4 text-red-700">{rulesError}</div>
            ) : (
                <>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                        <li>You can view all teams, guides, and panels.</li>
                        <li>You can manage schedules and view project information.</li>
                        <li>You cannot change team compositions or guide assignments.</li>
                        <li>You are responsible for scheduling reviews and vivas.</li>
                    </ul>
                    <div className="p-4 bg-blue-50 rounded-md space-y-2">
                        <div className="text-blue-700">
                            <strong>Team Formation:</strong> {teamFormationOpen ? 'Open' : 'Closed'}
                        </div>
                        <div className="text-blue-700">
                            <strong>Guide Selection:</strong> {guideSelectionStart ? (
                                <>
                                    Starts on <span className="font-semibold">{new Date(guideSelectionStart).toLocaleString()}</span>
                                    {guideSelectionEnd && (
                                        <> &ndash; Ends on <span className="font-semibold">{new Date(guideSelectionEnd).toLocaleString()}</span></>
                                    )}
                                </>
                            ) : 'Dates not set'}
                        </div>
                    </div>
                    
                    {/* Panel Status Check */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-md">
                        <h3 className="text-lg font-medium mb-3">Panel Status Check</h3>
                        <div className="space-x-2">
                            <button
                                onClick={checkPanelStatus}
                                disabled={loadingPanel}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {loadingPanel ? 'Checking...' : 'Check My Panel Status'}
                            </button>
                            <button
                                onClick={checkAuthStatus}
                                disabled={loadingAuth}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                            >
                                {loadingAuth ? 'Checking...' : 'Check Auth Status'}
                            </button>
                        </div>
                        
                        {panelStatus && (
                            <div className="mt-4 p-3 bg-white rounded border">
                                {panelStatus.error ? (
                                    <div className="text-red-600">{panelStatus.error}</div>
                                ) : panelStatus.hasPanel ? (
                                    <div>
                                        <div className="text-green-600 font-medium mb-2">✅ Panel Assigned</div>
                                        <div className="text-sm space-y-1">
                                            <div><strong>Panel:</strong> {panelStatus.panel.name}</div>
                                            <div><strong>Teams:</strong> {panelStatus.teams.length}</div>
                                            <div><strong>Members:</strong> {panelStatus.panel.members.map(m => m.name).join(', ')}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-red-600">
                                        ❌ No panel assigned. Please contact admin to assign you as a coordinator to a panel.
                                    </div>
                                )}
                            </div>
                        )}

                        {authStatus && (
                            <div className="mt-4 p-3 bg-white rounded border">
                                {authStatus.error ? (
                                    <div className="text-red-600">
                                        <div>❌ Auth Error: {authStatus.error}</div>
                                        {authStatus.details && <div className="text-xs mt-1">Details: {authStatus.details}</div>}
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-green-600 font-medium mb-2">✅ Authorization Working</div>
                                        <div className="text-sm space-y-1">
                                            <div><strong>User ID:</strong> {authStatus.user.id}</div>
                                            <div><strong>Username:</strong> {authStatus.user.username}</div>
                                            <div><strong>Primary Role:</strong> {authStatus.user.role}</div>
                                            <div><strong>All Roles:</strong> {Array.isArray(authStatus.user.roles) ? authStatus.user.roles.map(r => `${r.role}${r.team ? ` (Team ${r.team})` : ''}`).join(', ') : ''}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const CoordinatorDashboard = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.pathname === '/coordinator-dashboard') {
            navigate('/coordinator-dashboard/dashboard', { replace: true });
        }
    }, [location.pathname, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    // Guard: Only allow users with coordinator role to view this dashboard
    const hasCoordinatorRole = Array.isArray(user?.roles) && user.roles.some(r => r.role === 'coordinator');
    if (!hasCoordinatorRole) {
        return (
            <div className="p-6">
                <Navbar user={{ ...user, role: user?.role || 'guide' }} onLogout={handleLogout} />
                <div className="max-w-3xl mx-auto mt-6 bg-white p-6 rounded-lg shadow">
                    <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
                    <p className="text-red-600">You are not a coordinator for any team.</p>
                    <div className="mt-4">
                        <button
                            onClick={() => window.location.href = '/faculty-dashboard'}
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                            Go to Faculty Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar user={{ ...user, role: 'coordinator' }} onLogout={handleLogout} />
            
         
            
            <div className="p-4">
                <Routes>
                    <Route path="dashboard" element={<CoordinatorRulesDashboard />} />
                    {/* Show the new live editor on the existing letter-generation route */}
                    <Route path="letter-generation" element={<CoordinatorLetterLiveEditorCK />} />
                    <Route path="guide-me" element={<GuideMe userRole="coordinator" />} />
                    <Route path="assigned-teams" element={<CoordinatorAssignedTeams />} />
                    <Route path="review-schedule" element={<CoordinatorReviewSchedule />} />
                    <Route path="viva-schedule" element={<CoordinatorVivaSchedule />} />
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
            </div>
        </div>
    );
};

export default CoordinatorDashboard;