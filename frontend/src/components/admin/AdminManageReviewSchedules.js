import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminManageReviewSchedules = () => {
    const [panels, setPanels] = useState([]);
    const [teams, setTeams] = useState([]);
    const [availabilities, setAvailabilities] = useState([]);
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [panelsRes, teamsRes, availabilitiesRes, schedulesRes, reviewPeriodRes] = await Promise.all([
                axios.get('/api/admin/panels-with-members', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/teams', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/availabilities', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/review-schedules', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/review-period-dates', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            console.log('Raw Availabilities Data:', availabilitiesRes.data);
            console.log('Raw Teams Data:', teamsRes.data);
            console.log('Raw Panels Data:', panelsRes.data);

            setPanels(panelsRes.data);
            setTeams(teamsRes.data);
            setAvailabilities(availabilitiesRes.data);
            setSchedules(schedulesRes.data);
            setCurrentReviewPeriodStart(reviewPeriodRes.data.startDate || '');
            setCurrentReviewPeriodEnd(reviewPeriodRes.data.endDate || '');
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
            await axios.post('/api/admin/review-period-dates', {
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
            const response = await axios.post('/api/admin/generate-schedules', {}, {
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
            const response = await axios.post('/api/admin/send-schedule-notification', { scheduleId }, {
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

    // Group availabilities by team
    const groupAvailabilitiesByTeam = () => {
        const teamGroups = {};

        // First, create entries for all teams and populate assigned guide and panel members
        teams.forEach(team => {
            console.log('Processing team:', team.teamName, 'Panel:', team.panel);
            teamGroups[team._id] = {
                teamName: team.teamName,
                teamId: team._id,
                panelId: team.panel?._id,
                guide: team.guidePreference ? { user: team.guidePreference, availableSlots: [] } : null,
                panelMembers: (() => {
                    const uniquePanelMembersMap = new Map();
                    if (team.panel && team.panel.members) {
                        team.panel.members
                            .forEach(member => {
                                if (!uniquePanelMembersMap.has(member._id.toString())) {
                                    uniquePanelMembersMap.set(member._id.toString(), {
                                        user: member,
                                        availableSlots: [],
                                        isInternal: member.memberType === 'internal'
                                    });
                                }
                            });
                    }
                    return Array.from(uniquePanelMembersMap.values());
                })()
            };
        });

        // Then, populate with submitted availabilities where available
        availabilities.forEach(availability => {
            console.log('Processing availability:', availability);
            if (!availability.user || !availability.user._id) {
                console.warn('Skipping availability record with missing user or user._id:', availability);
                return;
            }
            const userId = availability.user._id.toString();
            
            if (availability.userRole === 'panel') {
                for (const teamId in teamGroups) {
                    const panelMemberEntry = teamGroups[teamId].panelMembers.find(pm => 
                        pm.user && pm.user._id?.toString() === userId
                    );
                    if (panelMemberEntry) {
                        // Aggregate slots, then deduplicate later
                        panelMemberEntry.availableSlots.push(...availability.availableSlots.map(slot => {
                            let transformedSlot;
                            if (typeof slot === 'string') {
                                transformedSlot = { startTime: new Date(slot).toISOString(), endTime: new Date(slot).toISOString() };
                            } else if (slot.startTime && slot.endTime) {
                                transformedSlot = { startTime: new Date(slot.startTime).toISOString(), endTime: new Date(slot.endTime).toISOString() };
                            } else {
                                transformedSlot = slot; // Fallback if unexpected format
                            }
                            return transformedSlot;
                        }));
                    }
                }
            } else if (availability.userRole === 'guide') {
                for (const teamId in teamGroups) {
                    const guideEntry = teamGroups[teamId].guide;
                    if (guideEntry && guideEntry.user && guideEntry.user._id?.toString() === userId) {
                        // Aggregate slots, then deduplicate later
                        guideEntry.availableSlots.push(...availability.availableSlots.map(slot => {
                            let transformedSlot;
                            if (typeof slot === 'string') {
                                transformedSlot = { startTime: new Date(slot).toISOString(), endTime: new Date(slot).toISOString() };
                            } else if (slot.startTime && slot.endTime) {
                                transformedSlot = { startTime: new Date(slot.startTime).toISOString(), endTime: new Date(slot.endTime).toISOString() };
                            } else {
                                transformedSlot = slot; // Fallback if unexpected format
                            }
                            return transformedSlot;
                        }));
                    }
                }
            }
        });

        // Final deduplication of availableSlots for all panel members and guides
        Object.values(teamGroups).forEach(group => {
            if (group.guide && group.guide.availableSlots.length > 0) {
                const uniqueGuideSlotsMap = new Map();
                group.guide.availableSlots.forEach(slot => {
                    // Ensure slot has startTime and endTime before creating key
                    const key = slot.startTime && slot.endTime ? `${slot.startTime}-${slot.endTime}` : null;
                    if (key) {
                        uniqueGuideSlotsMap.set(key, slot);
                    }
                });
                group.guide.availableSlots = Array.from(uniqueGuideSlotsMap.values()).map(slot => ({
                    startTime: new Date(slot.startTime),
                    endTime: new Date(slot.endTime)
                }));
            }

            group.panelMembers.forEach(pm => {
                if (pm.availableSlots.length > 0) {
                    const uniquePmSlotsMap = new Map();
                    pm.availableSlots.forEach(slot => {
                        // Ensure slot has startTime and endTime before creating key
                        const key = slot.startTime && slot.endTime ? `${slot.startTime}-${slot.endTime}` : null;
                        if (key) {
                            uniquePmSlotsMap.set(key, slot);
                        }
                    });
                    pm.availableSlots = Array.from(uniquePmSlotsMap.values()).map(slot => ({
                        startTime: new Date(slot.startTime),
                        endTime: new Date(slot.endTime)
                    }));
                }
            });
        });

        console.log('Final team groups:', teamGroups);
        return Object.values(teamGroups);
    };

    const handleCreateSlotForTeam = async (teamId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/admin/generate-slot-for-team', { teamId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMessage(response.data.message);
            fetchData(); // Refresh data to show new schedule
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error generating slot for team:', err);
            setError(err.response?.data?.message || 'Failed to generate slot for team');
        }
    };

    if (loading) return <div className="text-center p-4">Loading data...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    const teamGroups = groupAvailabilitiesByTeam();

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
                            <option value="review1">review1</option>
                            <option value="review2">review2</option>
                            <option value="review3">review3</option>
                            <option value="viva">viva</option>
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
                                        const inferred = rawType.includes('review1') || rawType === 'review1' ? 'review1'
                                            : rawType.includes('review2') || rawType === 'review2' ? 'review2'
                                            : rawType.includes('review3') || rawType === 'review3' ? 'review3'
                                            : rawType.includes('viva') ? 'viva' : '';
                                        if (typeFilter === 'all') return true;
                                        return inferred === typeFilter;
                                    })
                                    .map((schedule) => {
                                    const displayName = schedule.name || (schedule.type ? schedule.type : 'Review');
                                    const rawType = (schedule.slotType || schedule.type || '').toString().toLowerCase();
                                    const typeLabel = rawType.includes('review1') || rawType === 'review1' ? 'review1'
                                        : rawType.includes('review2') || rawType === 'review2' ? 'review2'
                                        : rawType.includes('review3') || rawType === 'review3' ? 'review3'
                                        : rawType.includes('viva') ? 'viva' : (rawType || '-');
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