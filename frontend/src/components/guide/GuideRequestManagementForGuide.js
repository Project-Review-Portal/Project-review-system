import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuideRequestManagementForGuide = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [guideSelectionDates, setGuideSelectionDates] = useState({ startDate: null, endDate: null });
    const [isRequestPeriodActive, setIsRequestPeriodActive] = useState(false);

    useEffect(() => {
        fetchGuideData(); // Renamed to fetch all guide-related data
    }, []);

    const fetchGuideData = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found.');
                setLoading(false);
                return;
            }
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch guide selection dates from the new public endpoint
            const datesRes = await axios.get('http://localhost:5000/api/guide/selection-dates', { headers });
            const { startDate, endDate } = datesRes.data;
            setGuideSelectionDates({ startDate, endDate });
            const now = new Date();
            const start = new Date(startDate);
            const end = new Date(endDate);
            const activePeriod = now >= start && now <= end;
            setIsRequestPeriodActive(activePeriod);

            // Fetch pending guide requests only if the period is active
            if (activePeriod) {
                const res = await axios.get('http://localhost:5000/api/guide/team-requests', { headers });
                setRequests(res.data.filter(req => req.status === 'pending'));
            } else {
                setRequests([]); // Clear requests if period is not active
            }
        } catch (err) {
            console.error('Error fetching guide data:', err);
            setError(err.response?.data?.message || 'Failed to fetch guide data.');
        } finally {
            setLoading(false);
        }
    };

    const handleRespondToRequest = async (teamId, action) => {
        setMessage('');
        setError('');
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            await axios.post(`http://localhost:5000/api/guide/team-requests/${action}`, { teamId }, { headers });
            setMessage(`Request ${action === 'accept' ? 'accepted' : 'rejected'} successfully!`);
            fetchGuideData(); // Re-fetch all data to update UI
        } catch (err) {
            console.error(`Error ${action}ing request:`, err);
            setError(err.response?.data?.message || `Failed to ${action} request.`);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    const hasNotStarted = guideSelectionDates.startDate && new Date() < new Date(guideSelectionDates.startDate);
    const hasEnded = guideSelectionDates.endDate && new Date() > new Date(guideSelectionDates.endDate);

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Team Requests</h2>

            {message && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                    {message}
                </div>
            )}
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            {!isRequestPeriodActive && (
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded">
                    {hasNotStarted ? (
                        <span>Guide selection process has not yet started. It will begin on {new Date(guideSelectionDates.startDate).toLocaleString()}.</span>
                    ) : hasEnded ? (
                        <span>Guide selection process has ended. It concluded on {new Date(guideSelectionDates.endDate).toLocaleString()}.</span>
                    ) : (
                        <span>Guide selection period is not active.</span>
                    )}
                </div>
            )}

            {isRequestPeriodActive && (
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Pending Requests</h3>
                    {requests.length === 0 ? (
                        <p className="text-gray-500">No pending requests at this time.</p>
                    ) : (
                        <ul className="space-y-4">
                            {requests.map(request => (
                                <li key={request._id} className="border p-4 rounded-md bg-gray-50">
                                    <div className="font-medium text-lg mb-2">Team: {request.teamName}</div>
                                    
                                    <div className="mb-4">
                                        <h4 className="font-medium mb-2">Team Leader:</h4>
                                        <p className="text-gray-700">{request.teamLeader.name} ({request.teamLeader.username})</p>
                                    </div>

                                    <div className="mb-4">
                                        <h4 className="font-medium mb-2">Team Members:</h4>
                                        <ul className="space-y-1">
                                            {request.members.map(member => (
                                                <li key={member._id} className="text-gray-700">
                                                    {member.name} ({member.username})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleRespondToRequest(request._id, 'accept')}
                                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleRespondToRequest(request._id, 'reject')}
                                            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default GuideRequestManagementForGuide; 