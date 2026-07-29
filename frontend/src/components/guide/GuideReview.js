import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const GuideReview = () => {
    const [panels, setPanels] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState(null);
    const [slots, setSlots] = useState([]);
    const [myTeams, setMyTeams] = useState([]);
    const [selectedSlotType, setSelectedSlotType] = useState('review1');
    const [modifiedAssignments, setModifiedAssignments] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [guideUser, setGuideUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setGuideUser(JSON.parse(storedUser));
        }
        fetchPanels();
    }, []);

    const fetchPanels = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${SERVER_API_KEY}/api/guide/assigned-panels`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPanels(res.data || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching assigned panels:', err);
            setError('Failed to fetch assigned panels.');
            setLoading(false);
        }
    };

    const handleSelectPanel = async (panel) => {
        setSelectedPanel(panel);
        setModifiedAssignments({});
        setSuccessMessage('');
        setError(null);
        setLoadingSlots(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${SERVER_API_KEY}/api/guide/panels/${panel._id}/slots`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSlots(res.data.slots || []);
            setMyTeams(res.data.myTeams || []);
            setLoadingSlots(false);
        } catch (err) {
            console.error('Error fetching slots:', err);
            setError('Failed to fetch slots for the selected panel.');
            setLoadingSlots(false);
        }
    };

    const handleCancelChanges = () => {
        setModifiedAssignments({});
        setSuccessMessage('');
        setError(null);
    };

    const handleSaveChanges = async () => {
        setError(null);
        setSuccessMessage('');
        setLoadingSlots(true);
        try {
            const token = localStorage.getItem('token');
            const updates = [];
            Object.keys(modifiedAssignments).forEach(slotId => {
                const originalSlot = slots.find(s => s._id === slotId);
                const originalTeamId = originalSlot?.team?._id || null;
                const newTeamId = modifiedAssignments[slotId];
                if (newTeamId !== originalTeamId) {
                    updates.push({ slotId, teamId: newTeamId });
                }
            });

            await axios.post(`${SERVER_API_KEY}/api/guide/save-slots`, {
                panelId: selectedPanel._id,
                assignments: updates
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccessMessage('Assignments saved successfully!');
            setModifiedAssignments({});
            
            // Refresh the slots for this panel
            const res = await axios.get(`${SERVER_API_KEY}/api/guide/panels/${selectedPanel._id}/slots`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSlots(res.data.slots || []);
            setMyTeams(res.data.myTeams || []);
            setLoadingSlots(false);
        } catch (err) {
            console.error('Error saving assignments:', err);
            setError(err.response?.data?.message || 'Failed to save assignments.');
            setLoadingSlots(false);
        }
    };

    // Format start/end times into e.g. "09.30 am to 09.50 am"
    const formatPeriodLabel = (startStr, endStr) => {
        const s = new Date(startStr);
        const e = new Date(endStr);
        const pad = (n) => String(n).padStart(2, '0');
        
        const formatTime = (dateObj) => {
            let hours = dateObj.getHours();
            const minutes = pad(dateObj.getMinutes());
            const ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // '0' becomes '12'
            return `${pad(hours)}.${minutes} ${ampm}`;
        };
        
        return `${formatTime(s)} to ${formatTime(e)}`;
    };

    // Filter slots by selected slotType (review1, review2, viva)
    const filteredSlots = slots.filter(s => s.slotType === selectedSlotType);

    // Compute unique date/session rows
    const rowMap = new Map();
    filteredSlots.forEach(s => {
        const dateObj = new Date(s.date);
        const startObj = new Date(s.startTime);
        const isFN = startObj.getHours() < 12;
        const session = isFN ? 'FN' : 'AN';
        
        const dateString = dateObj.toISOString().split('T')[0];
        const key = `${dateString}_${session}`;
        
        if (!rowMap.has(key)) {
            const dateStrLabel = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            const dayStrLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            rowMap.set(key, {
                key,
                dateString,
                session,
                label: `${dateStrLabel} (${dayStrLabel})`,
                day: dayStrLabel,
                dateVal: dateObj
            });
        }
    });

    const sortedRows = Array.from(rowMap.values()).sort((a, b) => {
        const diff = a.dateVal - b.dateVal;
        if (diff !== 0) return diff;
        return a.session === 'FN' ? -1 : 1;
    });

    // Compute unique periods (columns)
    const periodMap = new Map();
    filteredSlots.forEach(s => {
        const label = formatPeriodLabel(s.startTime, s.endTime);
        const startD = new Date(s.startTime);
        const minutes = startD.getHours() * 60 + startD.getMinutes();
        if (!periodMap.has(label)) {
            periodMap.set(label, minutes);
        }
    });

    const sortedPeriods = Array.from(periodMap.keys()).sort((a, b) => periodMap.get(a) - periodMap.get(b));

    // Find slot for a row and period
    const findSlot = (row, period) => {
        return filteredSlots.find(s => {
            const dObj = new Date(s.date);
            const sObj = new Date(s.startTime);
            const dateString = dObj.toISOString().split('T')[0];
            const isFN = sObj.getHours() < 12;
            const session = isFN ? 'FN' : 'AN';
            
            const slotRowKey = `${dateString}_${session}`;
            const slotPeriod = formatPeriodLabel(s.startTime, s.endTime);
            
            return slotRowKey === row.key && slotPeriod === period;
        });
    };

    // Calculate currently assigned team IDs across all slots of this type
    const assignedTeamIds = new Set();
    filteredSlots.forEach(s => {
        const currentTeamId = modifiedAssignments[s._id] !== undefined ? modifiedAssignments[s._id] : (s.team?._id?.toString() || null);
        if (currentTeamId) {
            assignedTeamIds.add(currentTeamId.toString());
        }
    });

    // Determine pending changes count
    const getPendingChangesCount = () => {
        let count = 0;
        Object.keys(modifiedAssignments).forEach(slotId => {
            const originalSlot = slots.find(s => s._id === slotId);
            const originalTeamId = originalSlot?.team?._id || null;
            const newTeamId = modifiedAssignments[slotId];
            if (newTeamId !== originalTeamId) {
                count++;
            }
        });
        return count;
    };
    const hasChanges = getPendingChangesCount() > 0;

    if (loading) return <div className="text-center p-8 font-bold text-gray-600">Loading Assigned Panels...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-7xl mx-auto">
            {!selectedPanel ? (
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Assigned Panels</h2>
                    {panels.length === 0 ? (
                        <div className="p-6 bg-gray-50 border rounded-lg text-center text-gray-500 font-semibold">
                            No panels have been assigned to your teams yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {panels.map(panel => (
                                <div 
                                    key={panel._id} 
                                    onClick={() => handleSelectPanel(panel)}
                                    className="border-2 border-indigo-100 hover:border-indigo-500 bg-indigo-50/10 hover:bg-indigo-50/20 p-5 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                >
                                    <div>
                                        <h3 className="text-xl font-bold text-indigo-700">{panel.name}</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            <strong>Coordinator:</strong> {panel.coordinator?.name || 'N/A'} | <strong>Type:</strong> <span className="capitalize">{panel.panelType}</span>
                                        </p>
                                    </div>
                                    <span className="text-xs uppercase font-extrabold tracking-wider bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{panel.programme}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Panel Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
                        <div>
                            <button 
                                onClick={() => setSelectedPanel(null)} 
                                className="mb-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded text-xs transition uppercase tracking-wider"
                            >
                                ← Back to Panels
                            </button>
                            <h2 className="text-2xl font-bold text-gray-800">{selectedPanel.name} Schedule</h2>
                            <p className="text-xs text-gray-500 mt-1">Coordinator: {selectedPanel.coordinator?.name}</p>
                        </div>
                        
                        {/* Slot Type Selector */}
                        <div className="flex bg-gray-100 p-1 rounded-md">
                            {['review1', 'review2', 'review3', 'viva'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => { setSelectedSlotType(type); setModifiedAssignments({}); setError(null); setSuccessMessage(''); }}
                                    className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition tracking-wider ${selectedSlotType === type ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {type === 'viva' ? 'Viva' : `Review ${type.replace('review', '')}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {successMessage && <div className="p-3 bg-green-100 text-green-700 rounded font-semibold text-sm">{successMessage}</div>}
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded font-semibold text-sm">{error}</div>}

                    {loadingSlots ? (
                        <div className="text-center py-12 font-bold text-gray-500">Loading timetable slots...</div>
                    ) : filteredSlots.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 border rounded-lg text-gray-500 font-semibold">
                            No slots have been set by the coordinator for this review type yet.
                        </div>
                    ) : (
                        <div>
                            <div className="overflow-x-auto border rounded-lg shadow-sm">
                                <table className="w-full border-collapse text-left text-sm bg-white">
                                    <thead>
                                        <tr className="bg-indigo-600 text-white">
                                            <th className="border p-3 text-sm font-bold w-48 tracking-wider uppercase">Date & Session</th>
                                            {sortedPeriods.map((period, pIdx) => (
                                                <th key={pIdx} className="border p-3 text-center text-sm font-bold min-w-[200px] tracking-wider">
                                                    {period}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {sortedRows.map((row, rIdx) => (
                                            <tr key={rIdx} className="hover:bg-gray-50/50 transition-colors">
                                                {/* Left Date column */}
                                                <td className="border p-3 bg-gray-50 align-top">
                                                    <div className="font-bold text-gray-800">{row.label}</div>
                                                    <span className="inline-block mt-2 text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{row.session}</span>
                                                </td>

                                                {/* Slots columns */}
                                                {sortedPeriods.map((period, pIdx) => {
                                                    const slot = findSlot(row, period);
                                                    if (!slot) {
                                                        return (
                                                            <td key={pIdx} className="border p-3 bg-gray-50/40 text-center text-gray-400 select-none align-middle font-medium italic text-xs">
                                                                Not Available
                                                            </td>
                                                        );
                                                    }

                                                    const currentTeamId = modifiedAssignments[slot._id] !== undefined ? modifiedAssignments[slot._id] : (slot.team?._id?.toString() || null);
                                                    const isAssigned = !!currentTeamId;
                                                    const isMyTeam = isAssigned && (
                                                        myTeams.some(t => t._id?.toString() === currentTeamId?.toString()) ||
                                                        (slot.team?.guidePreference?._id?.toString() === guideUser?._id?.toString())
                                                    );

                                                    if (!isAssigned) {
                                                        // FREE SLOT (Green border, selection dropdown)
                                                        return (
                                                            <td key={pIdx} className="border p-3 bg-green-50/30 border-green-200 text-center align-top transition-colors hover:bg-green-50/50">
                                                                <div className="text-[10px] uppercase font-extrabold text-green-700 tracking-wider mb-2">Free Slot</div>
                                                                <select
                                                                    value=""
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val) {
                                                                            setModifiedAssignments(prev => ({
                                                                                ...prev,
                                                                                [slot._id]: val
                                                                            }));
                                                                        }
                                                                    }}
                                                                    className="w-full border border-green-300 rounded px-2 py-1 text-xs bg-white text-gray-800 font-medium cursor-pointer shadow-sm hover:border-green-400 focus:outline-none"
                                                                >
                                                                    <option value="">-- Assign Team --</option>
                                                                    {myTeams
                                                                        .filter(t => !assignedTeamIds.has(t._id?.toString()))
                                                                        .map(t => (
                                                                            <option key={t._id} value={t._id}>{t.teamName}</option>
                                                                        ))
                                                                    }
                                                                </select>
                                                                <div className="text-[11px] text-gray-400 mt-2">Supervisor: —</div>
                                                            </td>
                                                        );
                                                    } else if (isMyTeam) {
                                                        // MY TEAM ASSIGNED (Indigo / Blue border, show team and unassign)
                                                        const teamObj = myTeams.find(t => t._id === currentTeamId) || slot.team;
                                                        return (
                                                            <td key={pIdx} className="border p-3 bg-indigo-50 border-indigo-200 text-center align-top transition-colors hover:bg-indigo-100/30">
                                                                <div className="text-[10px] uppercase font-extrabold text-indigo-700 tracking-wider mb-1">My Team Assigned</div>
                                                                <div className="font-bold text-gray-800 text-sm">{teamObj?.teamName}</div>
                                                                <div className="text-[11px] text-indigo-600 mt-1 font-semibold">Supervisor: {guideUser?.name || 'You'}</div>
                                                                <button
                                                                    onClick={() => {
                                                                        setModifiedAssignments(prev => ({
                                                                            ...prev,
                                                                            [slot._id]: null // mark as cleared
                                                                        }));
                                                                    }}
                                                                    className="mt-3 px-2 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 rounded text-[10px] font-bold uppercase transition shadow-sm"
                                                                >
                                                                    Unassign
                                                                </button>
                                                            </td>
                                                        );
                                                    } else {
                                                        // OCCUPIED BY ANOTHER GUIDE (Red border, read-only)
                                                        const teamName = slot.team?.teamName || 'N/A';
                                                        const otherGuideName = slot.team?.guidePreference?.name || 'N/A';
                                                        return (
                                                            <td key={pIdx} className="border p-3 bg-red-50/20 border-red-100 text-center text-red-800 select-none align-top">
                                                                <div className="text-[10px] uppercase font-extrabold text-red-500 tracking-wider mb-1">Occupied</div>
                                                                <div className="font-bold text-gray-700 text-sm">{teamName}</div>
                                                                <div className="text-[11px] text-gray-500 mt-1">Supervisor: {otherGuideName}</div>
                                                            </td>
                                                        );
                                                    }
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Batch Action Buttons */}
                            {hasChanges && (
                                <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                                    <button
                                        onClick={handleCancelChanges}
                                        className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded shadow-sm transition text-sm uppercase tracking-wider"
                                    >
                                        Cancel Changes
                                    </button>
                                    <button
                                        onClick={handleSaveChanges}
                                        disabled={loadingSlots}
                                        className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow-sm transition disabled:bg-green-300 text-sm uppercase tracking-wider"
                                    >
                                        {loadingSlots ? 'Saving...' : 'Save Assignments'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GuideReview;