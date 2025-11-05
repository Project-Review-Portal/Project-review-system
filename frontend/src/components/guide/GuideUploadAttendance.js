import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuideUploadAttendance = () => {
    const [assignedTeams, setAssignedTeams] = useState([]);
    const [attendanceData, setAttendanceData] = useState({}); // { studentId: { review1: bool, ... } }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reviewEvents = ['review1', 'review2', 'review3', 'viva'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const teamsRes = await axios.get('/api/guide/assigned-teams', { headers });
            setAssignedTeams(teamsRes.data);

            const existingAttendanceRes = await axios.get('/api/guide/daily-attendance', { headers });
            setAttendanceData(existingAttendanceRes.data);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch data');
            setLoading(false);
        }
    };

    const handleAttendanceChange = (studentId, reviewEvent, isPresent) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [reviewEvent]: isPresent,
            },
        }));
    };

    const handleSubmitAttendance = async (teamId) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const team = assignedTeams.find(t => t._id === teamId);
            const studentAttendances = [];
            
            // Add team leader if exists
            if (team.teamLeader) {
                studentAttendances.push({
                    student: team.teamLeader._id,
                    review1: !!attendanceData[team.teamLeader._id]?.review1,
                    review2: !!attendanceData[team.teamLeader._id]?.review2,
                    review3: !!attendanceData[team.teamLeader._id]?.review3,
                    viva: !!attendanceData[team.teamLeader._id]?.viva,
                });
            }
            
            // Add team members
            team.members.forEach(member => {
                studentAttendances.push({
                    student: member._id,
                    review1: !!attendanceData[member._id]?.review1,
                    review2: !!attendanceData[member._id]?.review2,
                    review3: !!attendanceData[member._id]?.review3,
                    viva: !!attendanceData[member._id]?.viva,
                });
            });
            
            await axios.post('/api/guide/upload-attendance', { teamId, studentAttendances }, { headers });
            alert(`Attendance for ${team.teamName} submitted successfully!`);
            fetchData();
        } catch (err) {
            console.error('Error uploading attendance:', err);
            setError(err.response?.data?.message || 'Failed to upload attendance');
        }
    };

    const calculateAttendancePercentage = (studentId) => {
        let presentCount = 0;
        const studentAttendance = attendanceData[studentId];
        if (studentAttendance) {
            presentCount = reviewEvents.filter(event => studentAttendance[event]).length;
        }
        const percentage = (presentCount / reviewEvents.length) * 100;
        return `${percentage.toFixed(0)}%`;
    };

    if (loading) return <div className="text-center p-4">Loading attendance data...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-8">
            <h2 className="text-2xl font-bold mb-6">Upload Review Attendance</h2>

            {assignedTeams.length === 0 ? (
                <p>No teams assigned to you to mark attendance for.</p>
            ) : (
                assignedTeams.map(team => (
                    <div key={team._id} className="border p-4 rounded-lg">
                        <h3 className="text-xl font-semibold mb-4">{team.teamName}</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Student Name</th>
                                        {reviewEvents.map(event => (
                                            <th key={event} className="py-2 px-4 border-b text-center text-sm font-semibold text-gray-600">
                                                {event.replace('review', 'Review ').toUpperCase()}
                                            </th>
                                        ))}
                                        <th className="py-2 px-4 border-b text-center text-sm font-semibold text-gray-600">Attendance %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Team Leader */}
                                    {team.teamLeader && (
                                        <tr key={team.teamLeader._id} className="hover:bg-gray-50 bg-blue-50">
                                            <td className="py-2 px-4 border-b text-left text-sm text-gray-800 font-semibold">{team.teamLeader.name} (Team Leader)</td>
                                            {reviewEvents.map(event => {
                                                const isPresent = attendanceData[team.teamLeader._id]?.[event] || false;
                                                return (
                                                    <td key={event} className="py-2 px-4 border-b text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isPresent}
                                                            onChange={(e) => handleAttendanceChange(team.teamLeader._id, event, e.target.checked)}
                                                            className="form-checkbox h-5 w-5 text-blue-600 rounded"
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td className="py-2 px-4 border-b text-center text-sm text-gray-800 font-medium">
                                                {calculateAttendancePercentage(team.teamLeader._id)}
                                            </td>
                                        </tr>
                                    )}
                                    {/* Team Members */}
                                    {team.members && team.members.map(member => (
                                        <tr key={member._id} className="hover:bg-gray-50">
                                            <td className="py-2 px-4 border-b text-left text-sm text-gray-800">{member.name}</td>
                                            {reviewEvents.map(event => {
                                                const isPresent = attendanceData[member._id]?.[event] || false;
                                                return (
                                                    <td key={event} className="py-2 px-4 border-b text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isPresent}
                                                            onChange={(e) => handleAttendanceChange(member._id, event, e.target.checked)}
                                                            className="form-checkbox h-5 w-5 text-blue-600 rounded"
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td className="py-2 px-4 border-b text-center text-sm text-gray-800 font-medium">
                                                {calculateAttendancePercentage(member._id)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={() => handleSubmitAttendance(team._id)}
                                className="w-full px-4 py-3 rounded-md transition-colors bg-green-600 text-white hover:bg-green-700"
                            >
                                Submit Attendance for {team.teamName}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default GuideUploadAttendance; 