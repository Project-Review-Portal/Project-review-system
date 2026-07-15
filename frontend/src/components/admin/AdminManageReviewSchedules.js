import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

const AdminManageReviewSchedules = ({ programme }) => {
    const [panels, setPanels] = useState([]);
    const [teams, setTeams] = useState([]);
    const [reviewPeriodStart, setReviewPeriodStart] = useState('');
    const [reviewPeriodEnd, setReviewPeriodEnd] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [schedules, setSchedules] = useState([]);
    const [typeFilter, setTypeFilter] = useState('all'); // all | review1 | review2 | review3 | viva
    const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
    const [currentReviewPeriodStart, setCurrentReviewPeriodStart] = useState('');
    const [currentReviewPeriodEnd, setCurrentReviewPeriodEnd] = useState('');
    const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
    const [selectedTeamForSlot, setSelectedTeamForSlot] = useState(null);
    const [selectedPanelForSlot, setSelectedPanelForSlot] = useState(null);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [slotTypes, setSlotTypes] = useState(['review1', 'review2', 'review3', 'viva']);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const progParam = programme ? `?programme=${encodeURIComponent(programme)}` : '';
            const [panelsRes, teamsRes, schedulesRes, reviewPeriodRes, settingsRes] = await Promise.all([
                axios.get(`${SERVER_API_KEY}/api/admin/panels-with-members${progParam}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${SERVER_API_KEY}/api/admin/teams${progParam}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${SERVER_API_KEY}/api/admin/review-schedules${progParam}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${SERVER_API_KEY}/api/admin/review-period-dates`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${SERVER_API_KEY}/api/auth/review-settings`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            console.log('Raw Teams Data:', teamsRes.data);
            console.log('Raw Panels Data:', panelsRes.data);

            setPanels(panelsRes.data);
            setTeams(teamsRes.data);
            setCurrentReviewPeriodStart(reviewPeriodRes.data.startDate || '');
            setCurrentReviewPeriodEnd(reviewPeriodRes.data.endDate || '');
            setSlotTypes(settingsRes.data.validSlotTypes || ['review1', 'review2', 'review3', 'viva']);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch data');
            setLoading(false);
        }
    };

    const handleSetReviewPeriod = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${SERVER_API_KEY}/api/admin/review-period-dates`, {
                startDate: reviewPeriodStart,
                endDate: reviewPeriodEnd
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMessage('Review period set successfully!');
            fetchData();
            setReviewPeriodStart('');
            setReviewPeriodEnd('');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error setting review period:', err);
            setError('Failed to set review period');
        }
    };

    const handleCreateSchedule = async () => {
        setIsGeneratingSchedule(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${SERVER_API_KEY}/api/admin/generate-schedules`, { programme: programme || 'UG' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMessage(response.data.message);
            fetchData();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error generating schedules:', err);
            setError(err.response?.data?.message || 'Failed to generate schedules');
        } finally {
            setIsGeneratingSchedule(false);
        }
    };

    const handleSendNotification = async (scheduleId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${SERVER_API_KEY}/api/admin/send-schedule-notification`, { scheduleId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotificationMessage(response.data.message);
            fetchData(); // Refresh data to show updated notification status
            setTimeout(() => setNotificationMessage(''), 3000);
        } catch (err) {
            console.error('Error sending notification:', err);
            setNotificationMessage(err.response?.data?.message || 'Failed to send notification.');
        }
    };

    if (loading) return <div className="text-center p-4">Loading data...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Manage Review Schedules</h2>

          
            {/* Generated Schedules Section */}
            <div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <h3 className="text-xl font-semibold">Generated Schedules</h3>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-700">Filter by type:</label>
                        <select
                            className="border rounded px-2 py-1"
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            {slotTypes.map(st => (
                                <option key={st} value={st}>{st === 'viva' ? 'VIVA' : `Review ${st.replace('review', '')}`}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {schedules.length === 0 ? (
                    <p>No schedules generated yet. </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 bg-white">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Review</th>
                                    <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Type</th>
                                    <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Team</th>
                                    <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Panel</th>
                                    <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Start Time</th>
                                    <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">End Time</th>
                                    <th className="px-3 py-2 border text-left text-sm font-semibold text-gray-700">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedules
                                    .filter((schedule) => {
                                        const rawType = (schedule.slotType || schedule.type || '').toString().toLowerCase();
                                        if (typeFilter === 'all') return true;
                                        return rawType === typeFilter;
                                    })
                                    .map((schedule) => {
                                    const displayName = schedule.name || (schedule.type ? schedule.type : 'Review');
                                    const rawType = (schedule.slotType || schedule.type || '').toString().toLowerCase();
                                    const typeLabel = rawType === 'viva' ? 'VIVA' : `Review ${rawType.replace('review', '')}`;
                                    let duration = schedule.duration;
                                    try {
                                        if ((!duration || duration === 0) && schedule.startTime && schedule.endTime) {
                                            duration = Math.round((new Date(schedule.endTime) - new Date(schedule.startTime)) / 60000);
                                        }
                                    } catch (e) {
                                        duration = schedule.duration || 0;
                                    }
                                    return (
                                        <tr key={schedule._id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 border text-sm">{displayName}</td>
                                            <td className="px-3 py-2 border text-sm">{typeLabel}</td>
                                            <td className="px-3 py-2 border text-sm">{schedule.team?.teamName || 'N/A'}</td>
                                            <td className="px-3 py-2 border text-sm">{schedule.panel?.name || 'N/A'}</td>
                                            <td className="px-3 py-2 border text-sm">{schedule.startTime ? new Date(schedule.startTime).toLocaleString() : 'N/A'}</td>
                                            <td className="px-3 py-2 border text-sm">{schedule.endTime ? new Date(schedule.endTime).toLocaleString() : 'N/A'}</td>
                                            <td className="px-3 py-2 border text-sm">{duration ? `${duration} min` : 'N/A'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminManageReviewSchedules; 