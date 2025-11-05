import React, { useState, useEffect } from 'react';

const GuideDashboardHome = () => {
    const [teamFormationOpen, setTeamFormationOpen] = useState(true);
    const [guideSelectionStart, setGuideSelectionStart] = useState(null);
    const [guideSelectionEnd, setGuideSelectionEnd] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
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
                setError('Could not load info.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Guide Dashboard</h2>
            <div className="space-y-4 mb-6">
                <p className="text-gray-700">
                    Welcome to the Guide Dashboard! Here you can manage your assigned teams, handle guide requests, and oversee review schedules.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Manage Guide Requests</li>
                    <li>View My Teams</li>
                    <li>View Review Schedules</li>
                    <li>Upload Daily Attendance</li>
                    <li>Mark Teams</li>
                </ul>
            </div>
            {loading ? (
                <div className="mb-4 text-blue-700">Loading info...</div>
            ) : error ? (
                <div className="mb-4 text-red-700">{error}</div>
            ) : (
                <div className="p-4 bg-blue-50 rounded-md space-y-2 mb-6">
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
            )}
        </div>
    );
};

export default GuideDashboardHome; 