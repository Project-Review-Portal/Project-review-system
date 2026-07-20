import React, { useState, useEffect } from 'react';
import ReviewRail from './ReviewRail';
import { useReviewCycle } from '../hooks/useReviewCycle';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";
const GuideDashboardHome = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const { current, scores, stageNames } = useReviewCycle(user?.programme);
    const [teamFormationOpen, setTeamFormationOpen] = useState(true);
    const [guideSelectionStart, setGuideSelectionStart] = useState(null);
    const [guideSelectionEnd, setGuideSelectionEnd] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const configRes = await fetch(`${SERVER_API_KEY}/api/teams/config/public`);
                const configData = await configRes.json();
                setTeamFormationOpen(configData.teamFormationOpen);
                if (token) {
                    const guideDatesRes = await fetch(`${SERVER_API_KEY}/api/guide/selection-dates`, {
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
            <div className="dashboard-title-row"><div><p className="page-kicker">Guide desk</p><h2 className="text-2xl font-bold mb-1">Review ledger</h2><p className="text-gray-600">A clear view of the teams and milestones in your care.</p></div><span className="status-chip status-open">Active term</span></div>
            <ReviewRail current={current} scores={scores} stages={stageNames} label="Current review cycle" />
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
                <div className="institution-note p-4 rounded-md space-y-2 mb-6">
                    <div>
                        <strong>Team Formation:</strong> {teamFormationOpen ? 'Open' : 'Closed'}
                    </div>
                    <div>
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
