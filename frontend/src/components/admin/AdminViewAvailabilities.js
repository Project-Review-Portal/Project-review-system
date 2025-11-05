import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminViewAvailabilities = () => {
    const [availabilities, setAvailabilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAvailabilities = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('No authentication token found. Please log in.');
                    setLoading(false);
                    return;
                }

                const response = await axios.get('/api/admin/availabilities', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setAvailabilities(response.data);
            } catch (err) {
                console.error('Error fetching availabilities:', err);
                setError(err.response?.data?.message || 'Failed to fetch availabilities.');
            } finally {
                setLoading(false);
            }
        };

        fetchAvailabilities();
    }, []);

    if (loading) {
        return <div className="container mx-auto p-4">Loading availabilities...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-4 text-red-600">Error: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">All User Availabilities</h2>
            {availabilities.length === 0 ? (
                <p>No availabilities submitted yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availabilities.map((availability) => (
                        <div key={availability._id} className="bg-white shadow rounded-lg p-4">
                            <h3 className="text-xl font-semibold mb-2">{availability.user?.name || 'N/A'} ({availability.userRole})</h3>
                            <p className="text-gray-600 mb-2"><strong>Username:</strong> {availability.user?.username || 'N/A'}</p>
                            <p className="text-gray-600 mb-2"><strong>Review Period:</strong> {new Date(availability.reviewPeriodStart).toLocaleDateString()} - {new Date(availability.reviewPeriodEnd).toLocaleDateString()}</p>
                            <h4 className="text-lg font-medium mt-3 mb-1">Available Slots:</h4>
                            {availability.availableSlots.length === 0 ? (
                                <p className="text-gray-500">No specific slots provided.</p>
                            ) : (
                                <ul className="list-disc list-inside">
                                    {availability.availableSlots.map((slot, index) => (
                                        <li key={index} className="text-gray-700">
                                            {new Date(slot.startTime).toLocaleString()} - {new Date(slot.endTime).toLocaleString()}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <p className="text-sm text-gray-500 mt-2">Last Updated: {new Date(availability.updatedAt).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminViewAvailabilities; 