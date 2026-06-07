import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GuideSelectionSettings = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCurrentSettings();
    }, []);

    const fetchCurrentSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found');
                return;
            }
            const response = await axios.get('http://localhost:5000/api/admin/guide-selection-dates', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const { startDate: currentStart, endDate: currentEnd } = response.data;
            setStartDate(currentStart ? new Date(currentStart).toISOString().slice(0, 16) : '');
            setEndDate(currentEnd ? new Date(currentEnd).toISOString().slice(0, 16) : '');
        } catch (err) {
            setError('Failed to fetch current settings');
            console.error('Error fetching settings:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!startDate || !endDate) {
            setError('Both start and end dates are required');
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            setError('End date must be after start date');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found');
                return;
            }

            await axios.post('http://localhost:5000/api/admin/guide-selection-dates', 
                { startDate, endDate },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Guide selection dates updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update settings');
            console.error('Error updating settings:', err);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Guide Selection Request Settings</h2>
            
            {message && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                    {message}
                </div>
            )}
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                        Start Date and Time
                    </label>
                    <input
                        type="datetime-local"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                        End Date and Time
                    </label>
                    <input
                        type="datetime-local"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Update Settings
                </button>
            </form>
        </div>
    );
};

export default GuideSelectionSettings; 