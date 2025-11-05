import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PanelReviewSchedules = () => {
    const [user, setUser] = useState(null);
    const [reviewSchedules, setReviewSchedules] = useState([]);
    const [reviewPeriodStartDate, setReviewPeriodStartDate] = useState('');
    const [reviewPeriodEndDate, setReviewPeriodEndDate] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [newSlotStartTime, setNewSlotStartTime] = useState('');
    const [newSlotEndTime, setNewSlotEndTime] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [schedulesRes, userRes, availabilityRes] = await Promise.all([
                axios.get('/api/panels/review-schedules', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/panels/availability', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setReviewSchedules(schedulesRes.data);
            setReviewPeriodStartDate(userRes.data.reviewPeriodStartDate || '');
            setReviewPeriodEndDate(userRes.data.reviewPeriodEndDate || '');
            setAvailableSlots(availabilityRes.data.availableSlots || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch data');
            setLoading(false);
        }
    };

    const handleAddSlot = () => {
        if (newSlotStartTime && newSlotEndTime) {
            const newStart = new Date(newSlotStartTime);
            const newEnd = new Date(newSlotEndTime);
            const periodStart = new Date(reviewPeriodStartDate);
            const periodEnd = new Date(reviewPeriodEndDate);

            if (newStart < periodStart || newEnd > periodEnd || newStart >= newEnd) {
                alert('Availability slot must be within the global review period and start time must be before end time.');
                return;
            }
            setAvailableSlots([...availableSlots, { startTime: newStart, endTime: newEnd }]);
            setNewSlotStartTime('');
            setNewSlotEndTime('');
        }
    };

    const handleRemoveSlot = (index) => {
        setAvailableSlots(availableSlots.filter((_, i) => i !== index));
    };

    const handleSubmitAvailability = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/panels/availability', { availableSlots }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMessage('Availability submitted successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error submitting availability:', err);
            setError('Failed to submit availability');
        }
    };

    if (loading) return <div className="text-center p-4">Loading review schedules...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    // Allow panel members (internal) and guides to access this page
    if (user && !['panel', 'guide', 'admin'].includes(user.role)) {
        return (
            <div className="bg-white p-6 rounded-lg shadow text-center">
                <h2 className="text-2xl font-bold mb-4">Unauthorized Access</h2>
                <p className="text-red-500">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Panel Review Schedules</h2>
            {/* Panel Assigned Review Schedules Section */}
            <h3 className="text-xl font-semibold mb-4">Your Assigned Review Schedules</h3>
            {reviewSchedules.length === 0 ? (
                <p>No review schedules assigned to your panel yet.</p>
            ) : (
                <div className="space-y-4">
                    {(() => {
                        // If external member, only show viva schedules
                        const isExternal = user?.memberType === 'external';
                        const isViva = (s) => {
                            const slotLabel = (s.slotLabel || '').toString().toLowerCase();
                            const slotType = (s.slotType || s.type || '').toString().toLowerCase();
                            const name = (s.name || '').toString().toLowerCase();
                            if (slotLabel === 'viva' || slotType === 'viva') return true;
                            if (name.includes('viva')) return true;
                            return false;
                        };
                        const filtered = isExternal ? reviewSchedules.filter(s => isViva(s)) : reviewSchedules;
                        return filtered.map(schedule => {
                            const inferFromName = (name) => {
                                if (!name) return '';
                                const n = name.toLowerCase();
                                if (n.includes('review 1') || n.includes('review1')) return 'Review 1';
                                if (n.includes('review 2') || n.includes('review2')) return 'Review 2';
                                if (n.includes('review 3') || n.includes('review3')) return 'Review 3';
                                if (n.includes('viva')) return 'Viva';
                                return '';
                            };
                            const slotLabel = schedule.slotLabel || (schedule.slotType || schedule.type ? ((schedule.slotType || schedule.type) === 'review1' ? 'Review 1' : (schedule.slotType || schedule.type) === 'review2' ? 'Review 2' : (schedule.slotType || schedule.type) === 'review3' ? 'Review 3' : (schedule.slotType || schedule.type) === 'viva' ? 'Viva' : (schedule.slotType || schedule.type)) : inferFromName(schedule.name) || 'Review');
                            const displayName = schedule.name || slotLabel || 'Review';
                            let duration = schedule.duration;
                            try {
                                if ((!duration || duration === 0) && schedule.startTime && schedule.endTime) {
                                    duration = Math.round((new Date(schedule.endTime) - new Date(schedule.startTime)) / 60000);
                                }
                            } catch (e) {
                                duration = schedule.duration || 0;
                            }
                            const studentNames = (() => {
                                const leader = schedule.team?.teamLeader?.name ? [schedule.team.teamLeader.name] : [];
                                const members = Array.isArray(schedule.team?.members) ? schedule.team.members.map(m => m?.name).filter(Boolean) : [];
                                const all = [...leader, ...members];
                                return all.length > 0 ? ` (${all.join(', ')})` : '';
                            })();
                            const panelMembers = Array.isArray(schedule.panel?.members) ? schedule.panel.members.map(m => m?.name).filter(Boolean).join(', ') : '';
                            const coordinatorName = schedule.panel?.coordinator?.name || '';
                            const guideName = schedule.team?.guidePreference?.name || '';
                            return (
                                <div key={schedule._id} className="border rounded-lg p-4 bg-gray-50">
                                    <h4 className="text-lg font-semibold mb-2">{displayName} — {slotLabel}</h4>
                                    <p className="text-sm text-gray-600">Team: {schedule.team?.teamName || 'N/A'}{studentNames}</p>
                                    <p className="text-sm text-gray-600">Panel: {schedule.panel?.name || 'N/A'}</p>
                                    {panelMembers && (
                                        <p className="text-sm text-gray-600">Panel Members: {panelMembers}</p>
                                    )}
                                    {coordinatorName && (
                                        <p className="text-sm text-gray-600">Coordinator: {coordinatorName}</p>
                                    )}
                                    {guideName && (
                                        <p className="text-sm text-gray-600">Guide: {guideName}</p>
                                    )}
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Time:</span> {schedule.startTime ? new Date(schedule.startTime).toLocaleString() : 'N/A'} - {schedule.endTime ? new Date(schedule.endTime).toLocaleString() : 'N/A'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Duration:</span> {duration ? `${duration} minutes` : 'N/A'}
                                    </p>
                                </div>
                            );
                        });
                    })()}
                </div>
            )}
        </div>
    );
};

export default PanelReviewSchedules; 