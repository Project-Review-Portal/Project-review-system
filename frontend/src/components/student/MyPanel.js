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
        return (
            <div className="bg-gray-50 flex items-center justify-center p-6 min-h-[300px]">
                <div className="w-full max-w-3xl bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-8 shadow-sm text-center">
                    <svg className="w-12 h-12 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h3 className="text-lg font-bold text-amber-900 mb-2">Notice From Panel Coordinator</h3>
                    <p className="text-sm leading-relaxed max-w-md mx-auto text-amber-700">{error}</p>
                </div>
            </div>
        );
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