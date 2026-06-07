import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Converts a UTC date string from DB into "YYYY-MM-DDTHH:mm" in LOCAL timezone
// This is what datetime-local input expects
const toLocalDateTimeInput = (utcString) => {
    if (!utcString) return '';
    const date = new Date(utcString);
    // getFullYear/Month/Date/Hours/Minutes all use local timezone automatically
    const yyyy = date.getFullYear();
    const MM   = String(date.getMonth() + 1).padStart(2, '0');
    const dd   = String(date.getDate()).padStart(2, '0');
    const hh   = String(date.getHours()).padStart(2, '0');
    const mm   = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

// Formats a "YYYY-MM-DDTHH:mm" local string into a readable display string
const toDisplayString = (localDTString) => {
    if (!localDTString) return '—';
    const date = new Date(localDTString);
    return date.toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

const GuideSelectionSettings = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate]     = useState('');
    const [saved, setSaved]         = useState(null); // what's actually in DB
    const [message, setMessage]     = useState('');
    const [error, setError]         = useState('');
    const [loading, setLoading]     = useState(false);

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchCurrentSettings();
    }, []);

    const fetchCurrentSettings = async () => {
        try {
            if (!token) { setError('Authentication token not found'); return; }
            const response = await axios.get('/api/admin/guide-selection-dates', { headers });
            const { startDate: s, endDate: e } = response.data;

            // ✅ Use local timezone conversion — NOT .toISOString() which gives UTC
            const localStart = toLocalDateTimeInput(s);
            const localEnd   = toLocalDateTimeInput(e);

            setStartDate(localStart);
            setEndDate(localEnd);
            setSaved({ start: localStart, end: localEnd });
            setError('');
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

        setLoading(true);
        try {
            if (!token) { setError('Authentication token not found'); return; }

            // Send as ISO string — new Date(localString) correctly converts
            // local time back to UTC for storage
            await axios.post('/api/admin/guide-selection-dates',
                {
                    startDate: new Date(startDate).toISOString(),
                    endDate:   new Date(endDate).toISOString()
                },
                { headers }
            );

            setSaved({ start: startDate, end: endDate });
            setMessage('Guide selection dates updated successfully!');
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update settings');
            console.error('Error updating settings:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow max-w-xl">
            <h2 className="text-2xl font-semibold mb-2">Guide Selection Request Settings</h2>

            {/* Currently saved values — shown so admin can see what's actually in DB */}
            {saved && (saved.start || saved.end) && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    <p className="font-medium mb-1">Currently saved in database:</p>
                    <p>Start : {toDisplayString(saved.start)}</p>
                    <p>End &nbsp;&nbsp;: {toDisplayString(saved.end)}</p>
                </div>
            )}

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
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date and Time
                    </label>
                    <input
                        type="datetime-local"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                        End Date and Time
                    </label>
                    <input
                        type="datetime-local"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-gray-400"
                >
                    {loading ? 'Saving...' : 'Update Settings'}
                </button>
            </form>
        </div>
    );
};

export default GuideSelectionSettings;