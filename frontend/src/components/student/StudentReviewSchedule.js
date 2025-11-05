import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentReviewSchedule = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:5000/api/student/review-schedule', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSchedules(res.data);
            } catch (err) {
                setError('Failed to fetch review schedule.');
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, []);

    if (loading) return <div className="text-center p-4">Loading...</div>;
    if (error) return <div className="text-red-500 text-center p-4">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Team's Review Schedules</h2>
            {schedules.length === 0 ? (
                <p className="text-gray-500">No review schedules have been assigned to your team yet.</p>
            ) : (
                <div className="space-y-4">
                    {schedules.map(schedule => {
                        let duration = schedule.duration;
                        try {
                            if ((!duration || duration === 0) && schedule.startTime && schedule.endTime) {
                                duration = Math.round((new Date(schedule.endTime) - new Date(schedule.startTime)) / 60000);
                            }
                        } catch (e) {
                            duration = schedule.duration || 0;
                        }
                        return (
                            <div key={schedule._id} className="border rounded-lg p-4 bg-gray-50 hover:shadow-lg transition-shadow">
                                <h3 className="text-xl font-semibold text-indigo-600">Review for {schedule.team?.teamName || 'your team'} {schedule.slotType ? `(${schedule.slotType})` : ''}</h3>
                                <p className="text-gray-700"><span className="font-semibold">Panel:</span> {schedule.panel?.name || 'N/A'}</p>
                                <p className="text-gray-700"><span className="font-semibold">Time:</span> {schedule.startTime ? new Date(schedule.startTime).toLocaleString() : 'N/A'} - {schedule.endTime ? new Date(schedule.endTime).toLocaleString() : 'N/A'}</p>
                                <p className="text-gray-700"><span className="font-semibold">Duration:</span> {duration ? `${duration} minutes` : 'N/A'}</p>
                                {(schedule.panel?.members?.length > 0 || schedule.panel?.coordinator) && (
                                    <div className="mt-3 pt-3 border-t">
                                        {schedule.panel?.members?.length > 0 && (
                                            <>
                                                <h4 className="font-semibold text-gray-600">Panel Members:</h4>
                                                <ul className="list-disc list-inside text-sm text-gray-600">
                                                    {schedule.panel.members.map(member => (
                                                        <li key={member._id}>{member.name} ({member.memberType})</li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}
                                        {schedule.panel?.coordinator && (
                                            <p className="text-sm text-gray-700 mt-2"><span className="font-semibold">Coordinator:</span> {schedule.panel.coordinator.name}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentReviewSchedule; 