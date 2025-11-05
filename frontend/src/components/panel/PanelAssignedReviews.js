import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PanelAssignedReviews = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        fetchAssignedReviews();
    }, []);

    const fetchAssignedReviews = async () => {
        try {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required');
                return;
            }
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch review schedules for this panel member
            const res = await axios.get('http://localhost:5000/api/panels/review-schedules', { headers });

            // If user is external (from localStorage), filter to viva only
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const isExternal = user?.memberType === 'external';
            const isViva = (s) => {
                const slotLabel = (s.slotLabel || '').toString().toLowerCase();
                const slotType = (s.slotType || s.type || '').toString().toLowerCase();
                const name = (s.name || '').toString().toLowerCase();
                if (slotLabel === 'viva' || slotType === 'viva') return true;
                if (name.includes('viva')) return true;
                return false;
            };
            const onlyViva = isExternal ? (res.data || []).filter(s => isViva(s)) : (res.data || []);
            setSchedules(onlyViva);
        } catch (err) {
            console.error('Error fetching assigned reviews:', err);
            setError(err.response?.data?.message || 'Failed to fetch assigned reviews');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpanded = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const formatDateTime = (ts) => (ts ? new Date(ts).toLocaleString() : 'Not scheduled');

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">My Assigned Reviews</h2>
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading assigned reviews...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">My Assigned Reviews</h2>
                <div className="text-red-600 p-4 bg-red-50 rounded-md">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">My Assigned Reviews</h2>
            
            {schedules.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-600">No reviews assigned yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Check back later or contact the coordinator.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {schedules.map((sch) => {
                        let duration = sch.duration;
                        try {
                            if ((!duration || duration === 0) && sch.startTime && sch.endTime) {
                                duration = Math.round((new Date(sch.endTime) - new Date(sch.startTime)) / 60000);
                            }
                        } catch (e) {
                            duration = sch.duration || 0;
                        }
                        return (
                        <div key={sch._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    {/* Use server-provided slotLabel when available */}
                                    <h3 className="text-lg font-medium text-gray-900">{sch.slotLabel || (sch.slotType ? (sch.slotType === 'review1' ? 'Review 1' : sch.slotType === 'review2' ? 'Review 2' : sch.slotType === 'review3' ? 'Review 3' : sch.slotType === 'viva' ? 'Viva' : sch.slotType) : (sch.name ? (sch.name.includes('viva') ? 'Viva' : sch.name) : 'Review'))}</h3>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-sm text-gray-600"><span className="font-medium">Team:</span> {sch.team?.teamName || 'N/A'}</p>
                                        <p className="text-sm text-gray-600"><span className="font-medium">Panel:</span> {sch.panel?.name || 'N/A'}</p>
                                        <p className="text-sm text-gray-600"><span className="font-medium">Time:</span> {formatDateTime(sch.startTime)} - {formatDateTime(sch.endTime)}</p>
                                        <p className="text-sm text-gray-600"><span className="font-medium">Duration:</span> {duration ? `${duration} minutes` : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => toggleExpanded(sch._id)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">{expandedId === sch._id ? 'Hide Details' : 'View Details'}</button>
                                </div>
                            </div>
                            
                            {expandedId === sch._id && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                                    <h4 className="font-medium text-gray-900 mb-2">Team Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-600"><span className="font-medium">Team:</span> {sch.team?.teamName || 'N/A'} ({sch.team?._id})</p>
                                            <p className="text-gray-600"><span className="font-medium">Start:</span> {formatDateTime(sch.startTime)}</p>
                                            <p className="text-gray-600"><span className="font-medium">End:</span> {formatDateTime(sch.endTime)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600"><span className="font-medium">Panel:</span> {sch.panel?.name || 'N/A'}</p>
                                            <p className="text-gray-600"><span className="font-medium">Type:</span> {sch.slotType}</p>
                                        </div>
                                    </div>
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

export default PanelAssignedReviews; 