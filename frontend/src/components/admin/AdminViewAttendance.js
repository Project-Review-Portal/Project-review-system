import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminViewAttendance = () => {
    const [studentData, setStudentData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const response = await axios.get('/api/admin/daily-attendance-records', { headers });
            setStudentData(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.message || 'Failed to fetch data');
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center p-4">Loading attendance and marks records...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Student Attendance & Marks Overview</h2>

            {studentData.length === 0 ? (
                <p>No student records found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Student Name</th>
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Team Name</th>
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Guide Name</th>
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Panel Name</th>
                                <th className="py-2 px-4 border-b text-center text-sm font-semibold text-gray-600">Attendance %</th>
                                <th className="py-2 px-4 border-b text-center text-sm font-semibold text-gray-600">Average Marks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentData.map(student => (
                                <tr key={student.studentId} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 border-b">{student.studentName}</td>
                                    <td className="py-2 px-4 border-b">{student.teamName}</td>
                                    <td className="py-2 px-4 border-b">{student.guideName}</td>
                                    <td className="py-2 px-4 border-b">{student.panelName}</td>
                                    <td className="py-2 px-4 border-b text-center">{student.attendancePercentage}%</td>
                                    <td className="py-2 px-4 border-b text-center">{student.averageMarks}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminViewAttendance; 