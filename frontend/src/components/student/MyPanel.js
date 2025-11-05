import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MyPanel = () => {
    const [assignedPanel, setAssignedPanel] = useState(null);
    const [guide, setGuide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchMyPanel();
    }, []);

    const fetchMyPanel = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found.');
                setLoading(false);
                return;
            }
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get('http://localhost:5000/api/teams/my-assigned-panel', { headers });
            setAssignedPanel(response.data.panel);
            setGuide(response.data.guide || null);
        } catch (err) {
            console.error('Error fetching assigned panel:', err);
            setError(err.response?.data?.message || 'Failed to fetch assigned panel.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    if (error) {
        return <div className="bg-white p-6 rounded-lg shadow text-red-600">Error: {error}</div>;
    }

    if (!assignedPanel) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">My Panel</h2>
                <p className="text-gray-600">No panel has been assigned to your team yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-semibold mb-4">My Panel</h2>
            
            <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded">
                <h3 className="font-semibold">{assignedPanel.name}</h3>
            </div>

            <div className="border p-4 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Panel Members</h3>
                <ul className="space-y-2">
                    {assignedPanel.members.length === 0 ? (
                        <li className="text-gray-500">No members assigned to this panel.</li>
                    ) : (
                        assignedPanel.members.map(member => (
                            <li key={member._id} className="flex items-center p-2 rounded-md bg-gray-50">
                                <span className="font-medium">{member.name} ({member.memberType})</span>
                            </li>
                        ))
                    )}
                </ul>
                {assignedPanel.coordinator && (
                    <div className="mt-4">
                        <h4 className="font-semibold">Coordinator</h4>
                        <p className="text-gray-700">{assignedPanel.coordinator.name}</p>
                    </div>
                )}
                {guide && (
                    <div className="mt-4">
                        <h4 className="font-semibold">Guide</h4>
                        <p className="text-gray-700">{guide.name}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyPanel; 