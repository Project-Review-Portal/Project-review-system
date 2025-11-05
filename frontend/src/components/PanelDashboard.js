import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import PanelAssignedTeams from './panel/PanelAssignedTeams';
import PanelReviewSchedules from './panel/PanelReviewSchedules';
import PanelMarking from './panel/PanelMarking';

const PanelDashboard = () => {
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [teamFormationOpen, setTeamFormationOpen] = useState(true);
    const [guideSelectionStart, setGuideSelectionStart] = useState(null);
    const [guideSelectionEnd, setGuideSelectionEnd] = useState(null);
    const [loadingRules, setLoadingRules] = useState(true);
    const [rulesError, setRulesError] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        const fetchRules = async () => {
            try {
                // No auth required for config/public, but guide selection needs token
                const token = localStorage.getItem('token');
                const configRes = await fetch('http://localhost:5000/api/teams/config/public');
                const configData = await configRes.json();
                setTeamFormationOpen(configData.teamFormationOpen);
                // Guide selection dates
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (!user) {
        return null; // or a loading spinner/redirect
    }

    // Check if we are at the base /panel-dashboard path
    const isBasePanelDashboard = location.pathname === '/panel-dashboard' || location.pathname === '/panel-dashboard/';

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar user={user} onLogout={handleLogout} />
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {isBasePanelDashboard && (
                        <div className="bg-white p-6 rounded-lg shadow mb-6">
                            <h2 className="text-xl font-semibold mb-4">Panel Member Dashboard</h2>
                            {loadingRules ? (
                                <div className="mb-4 text-blue-700">Loading rules...</div>
                            ) : rulesError ? (
                                <div className="mb-4 text-red-700">{rulesError}</div>
                            ) : (
                                <>
                                    <div className="space-y-4 mb-4">
                                        <p className="text-gray-700">
                                            Welcome to the Panel Member Dashboard! This is where you'll be able to:
                                        </p>
                                        <ul className="list-disc list-inside space-y-2 text-gray-700">
                                            <li>View assigned teams</li>
                                            <li>Review project submissions</li>
                                            <li>Evaluate team presentations</li>
                                            <li>Provide feedback and scores</li>
                                        </ul>
                                    </div>
                                    <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                                        <li>You can only review and mark your assigned teams.</li>
                                        <li>You cannot change team compositions or guide assignments.</li>
                                        <li>Provide feedback and scores for each review.</li>
                                        <li>Review and marking are only available during the review period.</li>
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
                                    <div className="mt-6 p-4 bg-blue-50 rounded-md">
                                        <p className="text-blue-700">
                                            Evaluation functionality will be available soon. Please check back later.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {/* Main dashboard content */}
                    {!isBasePanelDashboard && <Outlet />}
                </div>
            </div>
        </div>
    );
};

export default PanelDashboard; 