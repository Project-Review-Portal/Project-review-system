import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../../utils/toast';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

const MaxTeamSizeSettings = ({ programme }) => {
    const [maxTeamSize, setMaxTeamSize] = useState(4);
    const [currentMaxTeamSize, setCurrentMaxTeamSize] = useState(4); // tracks the last saved value
    const [reviewPeriodStartDate, setReviewPeriodStartDate] = useState('');
    const [reviewPeriodEndDate, setReviewPeriodEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (error) {
            toast.error(error);
            setError(null);
        }
    }, [error]);

    useEffect(() => {
        if (message) {
            toast.success(message);
            setMessage(null);
        }
    }, [message]);

    useEffect(() => {
        fetchSettings();
    }, [programme]);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 
                Authorization: `Bearer ${token}`,
                ...(programme ? { 'X-Selected-Programme': programme } : {})
            };
            const [teamSizeRes, reviewPeriodRes] = await Promise.all([
                axios.get(`${SERVER_API_KEY}/api/admin/team-size`, { headers }),
                axios.get(`${SERVER_API_KEY}/api/admin/review-period-dates`, { headers })
            ]);
            setMaxTeamSize(teamSizeRes.data.maxTeamSize);
            setCurrentMaxTeamSize(Number(teamSizeRes.data.maxTeamSize)); // sync the saved baseline
            if (reviewPeriodRes.data.startDate) {
                setReviewPeriodStartDate(new Date(reviewPeriodRes.data.startDate).toISOString().slice(0, 16));
            }
            if (reviewPeriodRes.data.endDate) {
                setReviewPeriodEndDate(new Date(reviewPeriodRes.data.endDate).toISOString().slice(0, 16));
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Update guide selection dates before setting team size');
            setLoading(false);
        }
    };

    const handleSetMaxTeamSize = async (e) => {
        e.preventDefault();
        const newMax = Number(maxTeamSize);

        // Warn admin before decreasing — teams may be permanently disbanded
        if (newMax < currentMaxTeamSize) {
            const confirmed = window.confirm(
                `You are reducing the max team size from ${currentMaxTeamSize} to ${newMax} for ${programme || 'this programme'}.\n\n` +
                `Teams with more than ${newMax} members (including the leader) will be PERMANENTLY DISBANDED and all their data removed.\n\n` +
                `Teams with ${newMax} or fewer members will be automatically unlocked.\n\nProceed?`
            );
            if (!confirmed) return;
        }

        try {
            const token = localStorage.getItem('token');
            const headers = { 
                Authorization: `Bearer ${token}`,
                ...(programme ? { 'X-Selected-Programme': programme } : {})
            };
            const res = await axios.post(`${SERVER_API_KEY}/api/admin/team-size`, { maxTeamSize: newMax }, { headers });

            const { disbandedCount, unlockedCount } = res.data;
            let msg = `Max team size updated successfully for ${programme || 'programme'}!`;
            if (disbandedCount > 0 || unlockedCount > 0) {
                const parts = [];
                if (disbandedCount > 0) parts.push(`${disbandedCount} team(s) disbanded`);
                if (unlockedCount > 0) parts.push(`${unlockedCount} team(s) unlocked`);
                msg += ` (${parts.join(', ')})`;
            }
            setMessage(msg);
            setCurrentMaxTeamSize(newMax);
        } catch (err) {
            console.error('Error updating max team size:', err);
            setError('Failed to update max team size');
        }
    };

    if (loading) return <div className="text-center p-4">Loading settings...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">

            <h2 className="text-2xl font-bold mb-2">Team Size Settings</h2>
            {programme && <p className="text-sm text-indigo-600 font-semibold mb-6">Active Programme: {programme}</p>}

            {/* Max Team Size Setting */}
            <div className="mb-8 p-4 border rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Set Max Team Size</h3>
                <form onSubmit={handleSetMaxTeamSize} className="space-y-4">
                    <div>
                        <label htmlFor="maxTeamSize" className="block text-sm font-medium text-gray-700">Max Team Size:</label>
                        <input
                            type="number"
                            id="maxTeamSize"
                            value={maxTeamSize}
                            onChange={(e) => setMaxTeamSize(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                            min="1"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Update Max Team Size
                    </button>
                </form>
            </div>



           {/*   For pg ... Likely to be removed

            <div className="mb-8 p-4 border rounded-lg">
                <h3 className="text-xl font-semibold mb-4">PG Team Size</h3>
                <form onSubmit={()=>{}} className="space-y-4">
                    <div className="flex">
                        <p className="block text-sm w-[70%] font-medium text-gray-700">Program:</p>
                        <p className="block text-sm ml-[1%] w-[29%] font-medium text-gray-700">Max Team Size:</p>
                    </div>
                    <div className="flex">
                        <input 
                            type='text'
                            className='mt-1 block w-[70%] p-2 border border-gray-300 rounded-md shadow-sm'

                        />
                        <input
                            type="number"
                            id="maxTeamSize"
                            value={maxTeamSize}
                            onChange={(e) => setMaxTeamSize(e.target.value)}
                            className="mt-1 ml-[1%] block w-[29%] p-2 border border-gray-300 rounded-md shadow-sm"
                            min="1"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Update Max Team Size
                    </button>
                </form>
            </div> */}
        </div>
    );
};

export default MaxTeamSizeSettings; 