import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuideRequestManagement = () => {
    const [user, setUser] = useState(null);
    const [guideSelectionDates, setGuideSelectionDates] = useState({ startDate: null, endDate: null });
    const [isRequestPeriodActive, setIsRequestPeriodActive] = useState(false);
    const [guides, setGuides] = useState([]);
    const [myTeam, setMyTeam] = useState(null);
    const [currentRequest, setCurrentRequest] = useState(null); // To store the pending/accepted/rejected request
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchData(parsedUser); // Pass the full user object to fetchData
        } else {
            fetchData(null); // Call fetchData even if no user, to handle unauthenticated state if necessary
        }
    }, []);

    const fetchData = async (currentUser) => {
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

            // Fetch user's team and existing request
            const teamRes = await axios.get('http://localhost:5000/api/teams/my-team', { headers });
            setMyTeam(teamRes.data);
            console.log('--- fetchData Debug ---'); // Added debug separator
            console.log('fetchData: myTeam after fetch:', teamRes.data); // Debug log

            // Set currentRequest to the guidePreference object if it exists
            if (teamRes.data && teamRes.data.guidePreference) {
                setCurrentRequest(teamRes.data.guidePreference); 
                console.log('fetchData: currentRequest set to:', teamRes.data.guidePreference); // Debug log
            } else {
                setCurrentRequest(null); // Clear previous request if no guide preference
                console.log('fetchData: currentRequest set to null.'); // Debug log
            }
            console.log('--- End fetchData Debug ---'); // Added debug separator
            
            // Fetch available guides only if current user is a team leader and request period is active
            // Ensure currentUser and its id are available before comparison
            if (teamRes.data && teamRes.data.teamLeader && teamRes.data.teamLeader._id && currentUser?.id && teamRes.data.teamLeader._id === currentUser.id && activePeriod) { 
                // Only fetch guides if there's no current accepted/pending request, or if it's rejected
                if (!teamRes.data.guidePreference || teamRes.data.status === 'rejected') {
                    const guidesRes = await axios.get('http://localhost:5000/api/teams/guides', { headers });
                    setGuides(guidesRes.data);
                } else {
                    setGuides([]); // Clear guides if there's an active request
                }
            }

        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.message || 'Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (guideId) => {
        console.log('Attempting to send guide request...'); // Debug log
        console.log('Guide ID to request:', guideId); // Debug log
        console.log('Current user ID:', user?.id); // Debug log
        console.log('My team object:', myTeam); // Debug log

        if (!myTeam || myTeam.teamLeader._id !== user?.id) {
            setError('Only team leaders can send guide requests.');
            console.log('Error: Not team leader or no team.'); // Debug log
            return;
        }
        if (myTeam.guidePreference && (myTeam.status === 'pending' || myTeam.status === 'approved')) {
            setError('You already have an active guide request or an assigned guide.');
            console.log('Error: Already has active request.'); // Debug log
            return;
        }

        setMessage('');
        setError('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found');
                return;
            }
            const headers = { Authorization: `Bearer ${token}` };
            
            console.log('Sending POST request to /api/teams/request-guide with guideId:', guideId); // Debug log
            await axios.post('http://localhost:5000/api/teams/request-guide', { guideId }, { headers });
            setMessage('Guide request sent successfully!');
            console.log('Request sent successfully, re-fetching data.'); // Debug log
            fetchData(user); // Re-fetch data to update request status
        } catch (err) {
            console.error('Error sending request:', err);
            setError(err.response?.data?.message || 'Failed to send request.');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    if (!user || user.role !== 'student') {
        return <div className="bg-white p-6 rounded-lg shadow text-red-600">Access Denied: Only students can view this page.</div>;
    }

    if (!myTeam) {
        return <div className="bg-white p-6 rounded-lg shadow text-gray-700">You must be part of a team to request a guide.</div>;
    }

    const isTeamLeader = myTeam.teamLeader._id === user?.id; // Use optional chaining for user.id

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Guide Request Management</h2>

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

            {myTeam && myTeam.status === 'rejected' && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    <h3 className="font-semibold">Guide Request Rejected!</h3>
                    <p>
                        {myTeam.guidePreference ? 
                            `Your request to ${myTeam.guidePreference.name} was rejected.` : 
                            myTeam.rejectedGuides && myTeam.rejectedGuides.length > 0 ? 
                            `Guide ${myTeam.rejectedGuides[myTeam.rejectedGuides.length - 1].name} has rejected your request.` : 
                            `Your last guide request was rejected.`
                        }
                        {isTeamLeader && isRequestPeriodActive && (
                            <span> You can now request another guide from the list below.</span>
                        )}
                    </p>
                </div>
            )}

            {!isRequestPeriodActive && (
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded">
                    {guideSelectionDates.startDate && new Date() < new Date(guideSelectionDates.startDate) ? (
                        <span>Guide selection process has not yet started. It will begin on {new Date(guideSelectionDates.startDate).toLocaleString()}.</span>
                    ) : guideSelectionDates.endDate && new Date() > new Date(guideSelectionDates.endDate) ? (
                        <span>Guide selection process has ended. It concluded on {new Date(guideSelectionDates.endDate).toLocaleString()}.</span>
                    ) : (
                        <span>Guide selection request period is not currently active.</span>
                    )}
                </div>
            )}

            {myTeam.guidePreference && (
                <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded">
                    <h3 className="font-semibold text-lg mb-2">Your Current Guide Request:</h3>
                    <div className="space-y-2">
                        <p className="flex items-center">
                            <span className="font-medium mr-2">Guide:</span>
                            {myTeam.guidePreference?.name}
                        </p>
                        <p className="flex items-center">
                            <span className="font-medium mr-2">Status:</span>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                                myTeam.status === 'approved' ? 'bg-green-100 text-green-800' :
                                myTeam.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                                {myTeam.status === 'pending' ? 'Waiting for response' : 
                                 myTeam.status === 'approved' ? 'Request Accepted ✓' :
                                 myTeam.status === 'rejected' ? 'Request Rejected ✗' : 
                                 myTeam.status}
                            </span>
                        </p>
                        {myTeam.status === 'rejected' && isTeamLeader && isRequestPeriodActive && (
                            <button
                                onClick={() => {
                                    setCurrentRequest(null);
                                    setMyTeam(prevTeam => ({ ...prevTeam, guidePreference: null, status: 'rejected' }));
                                }}
                                className="mt-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Request Another Guide
                            </button>
                        )}
                    </div>
                </div>
            )}

            {!isTeamLeader && myTeam && (
                <div className="mb-4 p-3 bg-gray-100 text-gray-700 rounded">
                    Only the team leader can send guide requests.
                </div>
            )}

            {isTeamLeader && isRequestPeriodActive && (!myTeam.guidePreference || myTeam.status === 'rejected') && (
                <div className="border p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">Available Guides</h3>
                    {guides.length === 0 ? (
                        <p className="text-gray-500">No guides available at this time.</p>
                    ) : (
                        <ul className="space-y-3">
                            {guides.map(guide => (
                                <li key={guide._id} className="flex justify-between items-center p-2 border rounded-md bg-gray-50">
                                    <span className="font-medium">{guide.name}</span>
                                    <button
                                        onClick={() => handleSendRequest(guide._id)}
                                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        Send Request
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default GuideRequestManagement; 