import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuideRequestManagementForGuide = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [guideSelectionDates, setGuideSelectionDates] = useState({ startDate: null, endDate: null });
    const [isRequestPeriodActive, setIsRequestPeriodActive] = useState(false);

    // Track state values directly from your capacity endpoint
    const [capacity, setCapacity] = useState({
        designation: '',
        approvedCount: 0,
        maxTeams: 0
    });

    useEffect(() => {
        fetchGuideData();
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

            // 1. Fetch live metadata allocations from capacity route
            try {
                const capacityRes = await axios.get('http://localhost:5000/api/guide/capacity', { headers });
                setCapacity({
                    designation: capacityRes.data.designation,
                    approvedCount: capacityRes.data.approvedCount,
                    maxTeams: capacityRes.data.maxTeams
                });
            } catch (capErr) {
                console.error('Error fetching backend capacity configuration:', capErr);
            }

            // Fetch guide selection dates
            const datesRes = await axios.get('http://localhost:5000/api/guide/selection-dates', { headers });
            const { startDate, endDate } = datesRes.data;
            setGuideSelectionDates({ startDate, endDate });
            const now = new Date();
            const start = new Date(startDate);
            const end = new Date(endDate);
            const activePeriod = now >= start && now <= end;
            setIsRequestPeriodActive(activePeriod);

            // Fetch guide requests 
            if (activePeriod) {
                const res = await axios.get('http://localhost:5000/api/guide/team-requests', { headers });
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                const selectedProgramme = storedUser.programme;
                let filtered = res.data.filter(req => req.status === 'pending');
                if (selectedProgramme) {
                    filtered = filtered.filter(req => req.programme?.toLowerCase() === selectedProgramme?.toLowerCase());
                }
                setRequests(filtered);
            } else {
                setRequests([]); 
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
            fetchGuideData(); 
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

    // Derive remaining quota slots locally
    const teamsLeft = Math.max(0, capacity.maxTeams - capacity.approvedCount);

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Team Requests</h2>

            {/* CAPACITY CONTAINER & WARNING STATUS */}
            <div className="space-y-3">
                {/* 1. Main Professional Info Bar */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Allocation Status</h3>
                        <p className="text-base font-medium text-gray-700 mt-1">
                            As a <span className="font-semibold text-blue-700">{capacity.designation || 'Unassigned Role'}</span>, 
                            you can approve <span className="font-bold text-indigo-700">{teamsLeft}</span> more {teamsLeft === 1 ? 'team' : 'teams'} (Quota: {capacity.approvedCount}/{capacity.maxTeams}).
                        </p>
                    </div>
                    <div className={`${capacity.maxTeams === 0 ? 'bg-amber-600' : 'bg-blue-600'} text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-sm whitespace-nowrap`}>
                        {teamsLeft} Slots Available
                    </div>
                </div>

                {/* 2. Error Message: Triggered when designation exists but quota returns 0 */}
                {capacity.maxTeams === 0 && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-md font-medium flex items-start gap-2">
                        <span className="text-base leading-none">⚠️</span> 
                        <div>
                            <span className="font-bold block mb-0.5">Quota Limit Configuration Missing</span>
                            The designation <span className="font-semibold text-amber-700">"{capacity.designation || 'Unassigned'}"</span> has not been mapped to an approved allocation rule in the backend utility map. Please match the user profile spelling with system rules or notify your administrator.
                        </div>
                    </div>
                )}

                {/* 3. Soft Designation System Warning Callout (Fallback if string is completely empty) */}
                {!capacity.designation && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md font-medium flex items-center">
                        <span className="font-bold mr-1">⚠️ System Warning:</span> 
                        No official academic designation detected on your profile. Quota defaults may be unapplied or restricted. Please contact your system admin.
                    </div>
                )}
            </div>

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
                                    <div className="font-medium text-lg mb-2 flex items-center gap-2">
                                        Team: {request.teamName}
                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                                            {request.programme || 'UG'}
                                        </span>
                                    </div>

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