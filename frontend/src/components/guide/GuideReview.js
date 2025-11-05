import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuideReview = () => {
    const [reviewSchedules, setReviewSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const schedulesRes = await axios.get('http://localhost:5000/api/guide/review-schedules', { headers: { Authorization: `Bearer ${token}` } });
                setReviewSchedules(schedulesRes.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching review schedules:', err);
                setError('Failed to fetch review schedules. Please try again later.');
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="text-center p-4">Loading...</div>;
    if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Assigned Review Schedules</h2>
            {reviewSchedules.length === 0 ? (
                <p className="text-gray-500">No review schedules have been assigned to you yet.</p>
            ) : (
                <div className="space-y-4">
                    {reviewSchedules.map(schedule => {
                        const displayName = schedule.name || (schedule.type ? schedule.type : 'Review');
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
                            <div key={schedule._id} className="border rounded-lg p-4 bg-gray-50 hover:shadow-lg transition-shadow">
                                <h4 className="text-lg font-semibold mb-2 text-indigo-600">{displayName} {schedule.type ? `(${schedule.type})` : ''}</h4>
                                <p className="text-sm text-gray-700"><span className="font-semibold">Team:</span> {schedule.team?.teamName || 'N/A'}{studentNames}</p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Panel:</span> {schedule.panel?.name || 'N/A'}
                                </p>
                                {panelMembers && (
                                    <p className="text-sm text-gray-700"><span className="font-semibold">Panel Members:</span> {panelMembers}</p>
                                )}
                                {coordinatorName && (
                                    <p className="text-sm text-gray-700"><span className="font-semibold">Coordinator:</span> {coordinatorName}</p>
                                )}
                                {guideName && (
                                    <p className="text-sm text-gray-700"><span className="font-semibold">Guide:</span> {guideName}</p>
                                )}
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Time:</span> {schedule.startTime ? new Date(schedule.startTime).toLocaleString() : 'N/A'} - {schedule.endTime ? new Date(schedule.endTime).toLocaleString() : 'N/A'}
                                </p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Duration:</span> {duration ? `${duration} minutes` : 'N/A'}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GuideReview; 