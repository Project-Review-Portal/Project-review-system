import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626"; 

const ReviewsVivaSettings = () => {
    const [numReviews, setNumReviews] = useState(3);
    const [vivaRequired, setVivaRequired] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success'|'error', text: string }

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (message) {
            if (message.type === 'success') {
                toast.success(message.text);
            } else {
                toast.error(message.text);
            }
            setMessage(null);
        }
    }, [message]);

    useEffect(() => {
        fetchSettings();
        // eslint-disable-next-line
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${SERVER_API_KEY}/api/admin/reviews-viva-settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch settings');
            const data = await res.json();
            setNumReviews(data.numReviews ?? 3);
            setVivaRequired(data.vivaRequired ?? true);
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Error fetching settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${SERVER_API_KEY}/api/admin/reviews-viva-settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ numReviews, vivaRequired })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to save settings');
            setMessage({ type: 'success', text: data.message || 'Settings saved successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Error saving settings' });
        } finally {
            setSaving(false);
        }
    };

    // Build a preview list of slot types that would result from current settings
    const previewSlots = [];
    for (let i = 1; i <= numReviews; i++) previewSlots.push(`Review ${i}`);
    if (vivaRequired) previewSlots.push('Viva');

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600">Loading settings...</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6 max-w-xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Reviews / Viva Settings</h2>
            <p className="text-sm text-gray-500 mb-6">
                Configure how many reviews are required and whether a Viva is included. All scheduling,
                attendance, and marking logic will use these settings automatically.
            </p>



            {/* Number of Reviews */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Reviews
                </label>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setNumReviews(prev => Math.max(1, prev - 1))}
                        className="w-9 h-9 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 text-lg font-bold flex items-center justify-center"
                        disabled={numReviews <= 1}
                    >
                        −
                    </button>
                    <span className="text-3xl font-bold text-indigo-600 w-10 text-center">
                        {numReviews}
                    </span>
                    <button
                        onClick={() => setNumReviews(prev => Math.min(10, prev + 1))}
                        className="w-9 h-9 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 text-lg font-bold flex items-center justify-center"
                        disabled={numReviews >= 10}
                    >
                        +
                    </button>
                    <span className="text-sm text-gray-500 ml-2">
                        (min 1, max 10)
                    </span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={numReviews}
                    onChange={e => setNumReviews(parseInt(e.target.value, 10))}
                    className="mt-3 w-full accent-indigo-600"
                />
            </div>

            {/* Viva Required Toggle */}
            <div className="mb-6 flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                    <p className="text-sm font-medium text-gray-700">Viva Required</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        When enabled, a Viva slot is added after all reviews.
                    </p>
                </div>
                <button
                    onClick={() => setVivaRequired(prev => !prev)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        vivaRequired ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            vivaRequired ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>

            {/* Preview */}
            <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview — Active Slot Types:</p>
                <div className="flex flex-wrap gap-2">
                    {previewSlots.map((slot, idx) => (
                        <span
                            key={idx}
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                slot === 'Viva'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-indigo-100 text-indigo-700'
                            }`}
                        >
                            {slot}
                        </span>
                    ))}
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
                {saving ? 'Saving...' : 'Save Settings'}
            </button>
        </div>
    );
};

export default ReviewsVivaSettings;
