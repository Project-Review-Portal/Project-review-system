import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const getStageLabel = (schedule) => {
    if (schedule.slotLabel) return schedule.slotLabel;
    const rawType = (schedule.slotType || schedule.type || '').toString().toLowerCase();
    if (rawType === 'viva') return 'Viva';
    if (rawType.startsWith('review')) {
        return `Review ${rawType.replace('review', '')}`;
    }
    if (schedule.name) {
        const n = schedule.name.toLowerCase();
        if (n.includes('viva')) return 'Viva';
        const match = n.match(/review\s*(\d+)/);
        if (match) return `Review ${match[1]}`;
        return schedule.name;
    }
    return schedule.slotType || 'Review';
};

const formatDateTime = (startTime, endTime) => {
    if (!startTime) return { dateStr: 'N/A', dayName: '', timeRange: 'N/A' };
    try {
        const start = new Date(startTime);
        const end = endTime ? new Date(endTime) : null;

        const dateStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const dayName = start.toLocaleDateString('en-US', { weekday: 'long' });

        const pad = (n) => String(n).padStart(2, '0');
        const formatTime = (d) => {
            let hours = d.getHours();
            const minutes = pad(d.getMinutes());
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${pad(hours)}:${minutes} ${ampm}`;
        };

        const timeRange = end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);

        return { dateStr, dayName, timeRange };
    } catch (e) {
        return { dateStr: 'N/A', dayName: '', timeRange: 'N/A' };
    }
};

const computeDuration = (schedule) => {
    let duration = schedule.duration;
    try {
        if ((!duration || duration === 0) && schedule.startTime && schedule.endTime) {
            duration = Math.round((new Date(schedule.endTime) - new Date(schedule.startTime)) / 60000);
        }
    } catch (e) {
        duration = schedule.duration || 0;
    }
    return duration ? `${duration} mins` : 'N/A';
};

const StudentReviewSchedule = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${SERVER_API_KEY}/api/student/review-schedule`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSchedules(res.data || []);
            } catch (err) {
                setError('Failed to fetch review schedule.');
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, []);

    if (loading) return <div className="text-center p-6 text-gray-500 font-medium">Loading review schedules...</div>;
    if (error) return <div className="text-red-500 text-center p-6 bg-red-50 rounded-lg border border-red-200">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-5">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
                <h2 className="text-xl font-bold text-gray-800">Review Schedules</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                    Your scheduled project evaluation timetable &amp; milestones
                </p>
            </div>

            {/* Schedules Table */}
            {schedules.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                    No review schedules have been assigned to your team yet.
                </div>
            ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                                <th className="py-2.5 px-3 font-semibold text-center w-12">SNo</th>
                                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Schedule</th>
                                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Date</th>
                                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Time Slot</th>
                                <th className="py-2.5 px-4 font-semibold whitespace-nowrap text-center">Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {schedules.map((schedule, idx) => {
                                const stageLabel = getStageLabel(schedule);
                                const { dateStr, dayName, timeRange } = formatDateTime(schedule.startTime, schedule.endTime);
                                const durationStr = computeDuration(schedule);

                                return (
                                    <tr key={schedule._id || idx} className="hover:bg-gray-50/80 transition-colors">
                                        {/* SNo */}
                                        <td className="py-2.5 px-3 align-middle text-center text-gray-500 font-medium">
                                            {idx + 1}
                                        </td>

                                        {/* Schedule */}
                                        <td className="py-2.5 px-4 align-middle whitespace-nowrap">
                                            <span className="font-bold text-gray-900">
                                                {stageLabel}
                                            </span>
                                        </td>

                                        {/* Date */}
                                        <td className="py-2.5 px-4 align-middle whitespace-nowrap">
                                            <span className="font-semibold text-gray-800">{dateStr}</span>
                                            {dayName && <span className="text-gray-500 text-[11px] ml-1.5">({dayName})</span>}
                                        </td>

                                        {/* Time Slot */}
                                        <td className="py-2.5 px-4 align-middle whitespace-nowrap text-gray-700 font-medium">
                                            {timeRange}
                                        </td>

                                        {/* Duration */}
                                        <td className="py-2.5 px-4 align-middle whitespace-nowrap text-center text-gray-700">
                                            {durationStr}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StudentReviewSchedule;
