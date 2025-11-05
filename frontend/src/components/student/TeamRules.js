import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TeamRules = () => {
    const [maxTeamSize, setMaxTeamSize] = useState(4); // Default, will be updated
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [teamFormationOpen, setTeamFormationOpen] = useState(true);
    const [guideSelectionStart, setGuideSelectionStart] = useState(null);
    const [guideSelectionEnd, setGuideSelectionEnd] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Authentication token not found');
                    setLoading(false);
                    return;
                }
                // Fetch max team size and team formation open status
                const configRes = await axios.get('http://localhost:5000/api/teams/config/public');
                if (configRes.data && configRes.data.maxTeamSize) {
                    setMaxTeamSize(configRes.data.maxTeamSize);
                }
                if (configRes.data && typeof configRes.data.teamFormationOpen !== 'undefined') {
                    setTeamFormationOpen(configRes.data.teamFormationOpen);
                }
                // Fetch guide selection dates
                const guideDatesRes = await axios.get('http://localhost:5000/api/guide/selection-dates', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (guideDatesRes.data) {
                    setGuideSelectionStart(guideDatesRes.data.startDate);
                    setGuideSelectionEnd(guideDatesRes.data.endDate);
                }
            } catch (err) {
                console.error('Error fetching rules/config:', err);
                setError(err.response?.data?.message || 'Error fetching team rules');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div>Loading rules...</div>;
    }

    if (error) {
        return <div className="text-red-600">{error}</div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Team Formation Rules</h2>
            <div className="space-y-4">
                <p className="text-gray-700">
                    Welcome to the Team Formation section! Here are the current team formation rules:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Maximum number of students per team is set by the admin. (Current: {maxTeamSize})</li>
                    <li>You can only form a team once. Team members cannot be changed after creation.</li>
                    <li>Each team must have a team leader who submits guide preferences.</li>
                    <li>Team formation requires guide and admin approval.</li>
                    <li>Each student can only be in one team.</li>
                    <li>Team formation and guide selection are only allowed during their respective periods.</li>
                    <li>Team changes are not allowed after final approval.</li>
                    <li>Submit final reports and attend all reviews as required.</li>
                </ul>
                <div className="mt-6 p-4 bg-blue-50 rounded-md space-y-2">
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
                    <p className="text-blue-700 mt-2">
                        Please ensure you have read and understood all the rules before proceeding with team formation and guide selection.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TeamRules; 