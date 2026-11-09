import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const getDynamicSlotLabel = (s) => {
    if (s.slotLabel) return s.slotLabel;
    const rawType = (s.slotType || s.type || '').toString().toLowerCase();
    if (rawType === 'viva') return 'Viva';
    if (rawType.startsWith('review')) {
        return `Review ${rawType.replace('review', '')}`;
    }
    if (s.name) {
        const n = s.name.toLowerCase();
        if (n.includes('viva')) return 'Viva';
        const match = n.match(/review\s*(\d+)/);
        if (match) return `Review ${match[1]}`;
    }
    return s.slotType || s.type || 'Review';
};

const getSlotKey = (s) => {
    const rawType = (s.slotType || s.type || '').toString().toLowerCase();
    if (rawType === 'viva') return 'viva';
    if (rawType.startsWith('review')) return rawType;
    const label = getDynamicSlotLabel(s).toLowerCase();
    if (label.includes('viva')) return 'viva';
    const match = label.match(/review\s*(\d+)/);
    if (match) return `review${match[1]}`;
    return label || 'review';
};

// Format start/end times into e.g. "09.15 AM TO 09.35 AM"
const formatPeriodLabel = (startStr, endStr) => {
    if (!startStr) return 'N/A';
    try {
        const s = new Date(startStr);
        const e = endStr ? new Date(endStr) : null;
        const pad = (n) => String(n).padStart(2, '0');

        const formatTime = (dateObj) => {
            let hours = dateObj.getHours();
            const minutes = pad(dateObj.getMinutes());
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            return `${pad(hours)}.${minutes} ${ampm}`;
        };

        if (!e) return formatTime(s);
        return `${formatTime(s)} TO ${formatTime(e)}`;
    } catch (err) {
        return 'N/A';
    }
};

const PanelScheduleSection = ({ panel, schedules }) => {
    // Determine default selected slot: prefer 'review1' if present, else first assigned, else 'all'
    const [selectedSlot, setSelectedSlot] = useState(() => {
        const assignedKeys = schedules.map(s => getSlotKey(s));
        if (assignedKeys.includes('review1')) return 'review1';
        if (assignedKeys.length > 0) return assignedKeys[0];
        return 'all';
    });

    // Review stage buttons
    const slotButtons = useMemo(() => {
        const standardButtons = [
            { key: 'review0', label: 'REVIEW 0' },
            { key: 'review1', label: 'REVIEW 1' },
            { key: 'review2', label: 'REVIEW 2' },
            { key: 'review3', label: 'REVIEW 3' },
            { key: 'viva', label: 'VIVA' }
        ];

        const buttons = [{ key: 'all', label: 'ALL' }, ...standardButtons];

        // Append any non-standard slot types if present
        schedules.forEach(s => {
            const key = getSlotKey(s);
            if (key && !buttons.some(b => b.key === key)) {
                buttons.push({ key, label: getDynamicSlotLabel(s).toUpperCase() });
            }
        });

        return buttons;
    }, [schedules]);

    // Filter schedules for this panel by selected review stage
    const filteredSlots = useMemo(() => {
        return schedules.filter(schedule => {
            if (selectedSlot !== 'all') {
                const key = getSlotKey(schedule);
                if (key !== selectedSlot) return false;
            }
            return true;
        });
    }, [schedules, selectedSlot]);

    // Group filtered slots by date
    const sortedDates = useMemo(() => {
        const dateGroupsMap = new Map();
        filteredSlots.forEach(s => {
            const rawDate = s.date || s.startTime;
            if (!rawDate) return;
            const d = new Date(rawDate);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;

            if (!dateGroupsMap.has(dateKey)) {
                dateGroupsMap.set(dateKey, {
                    dateKey,
                    dateVal: d,
                    slots: []
                });
            }
            dateGroupsMap.get(dateKey).slots.push(s);
        });

        return Array.from(dateGroupsMap.values()).sort((a, b) => a.dateVal - b.dateVal);
    }, [filteredSlots]);

    const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            {/* Panel Details Header */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-gray-800 flex flex-wrap items-center gap-x-6 gap-y-1.5 font-medium">
                <div>
                    <span className="font-bold text-gray-900">Panel: </span>
                    <span className="text-indigo-900 font-bold">{panel.name}</span>
                </div>
                {panel.coordinator && (
                    <div>
                        <span className="font-bold text-gray-900">Coordinator: </span>
                        <span className="text-gray-700">{panel.coordinator}</span>
                    </div>
                )}
                {panel.members && (
                    <div>
                        <span className="font-bold text-gray-900">Panel Members: </span>
                        <span className="text-gray-700">{panel.members}</span>
                    </div>
                )}
            </div>

            {/* Allotted Slots Timetable Section */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-inner w-full border border-gray-100">
                {/* Timetable Header with Review Selector Buttons */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-4 gap-4 mb-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">Allotted Slots Timetable</h3>
                        <p className="text-xs text-gray-500 mt-1">Review the free and assigned slots for your panels.</p>
                    </div>

                    {/* Slot Type Selector */}
                    <div className="flex bg-white p-1 rounded-md border shadow-sm flex-wrap gap-0.5">
                        {slotButtons.map(btn => (
                            <button
                                key={btn.key}
                                type="button"
                                onClick={() => setSelectedSlot(btn.key)}
                                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition tracking-wider ${
                                    selectedSlot === btn.key
                                        ? 'bg-indigo-600 text-white shadow'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Timetable Body */}
                {filteredSlots.length === 0 ? (
                    <div className="text-center py-8 bg-white border border-gray-200 rounded-lg text-gray-500 font-semibold shadow-sm">
                        No slots have been set for this review type yet.
                    </div>
                ) : (
                    <div className="space-y-5">
                        {sortedDates.map(group => {
                            const slotsForDate = [...group.slots].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
                            const hasFN = slotsForDate.some(s => s.startTime && new Date(s.startTime).getHours() < 12);
                            const hasAN = slotsForDate.some(s => s.startTime && new Date(s.startTime).getHours() >= 12);
                            const chunks = chunkArray(slotsForDate, 5);

                            const dateObj = group.dateVal;
                            const formattedDateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                            return (
                                <div key={group.dateKey} className="flex flex-col md:flex-row gap-4 bg-white p-5 border border-gray-200 rounded-lg shadow-sm">
                                    {/* Left Column: Date Box */}
                                    <div className="md:w-48 flex-shrink-0 bg-gray-50 p-4 border border-gray-200 rounded-md flex flex-col justify-center items-center text-center">
                                        <div className="font-bold text-gray-800 text-sm">{formattedDateLabel}</div>
                                        <div className="text-xs text-gray-500 font-semibold mt-1">{dayName}</div>

                                        {/* Session Badges */}
                                        <div className="mt-3 flex gap-1.5 justify-center">
                                            {hasFN && (
                                                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700" title="Forenoon">
                                                    FN
                                                </span>
                                            )}
                                            {hasAN && (
                                                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700" title="Afternoon">
                                                    AN
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Column: Chunks of Slots */}
                                    <div className="flex-1 space-y-4 overflow-x-auto">
                                        {chunks.map((chunk, chunkIdx) => (
                                            <div key={chunkIdx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
                                                {chunk.map((slot, sIdx) => {
                                                    const hasTeam = !!slot.team && (slot.team.teamName || typeof slot.team === 'string');
                                                    const teamName = slot.team?.teamName || (typeof slot.team === 'string' ? slot.team : 'Free Slot');
                                                    const guideName = slot.team?.guidePreference?.name || '—';

                                                    // Extract team members and roll numbers (username)
                                                    const teamLeader = slot.team?.teamLeader;
                                                    const rawMembers = Array.isArray(slot.team?.members) ? slot.team.members : [];
                                                    const membersWithRoll = [];
                                                    if (teamLeader?.name) {
                                                        membersWithRoll.push({
                                                            name: teamLeader.name,
                                                            rollNo: teamLeader.username || ''
                                                        });
                                                    }
                                                    rawMembers.forEach(m => {
                                                        if (!m?.name) return;
                                                        const isDuplicate = membersWithRoll.some(
                                                            existing => existing.name === m.name || (m.username && existing.rollNo === m.username)
                                                        );
                                                        if (!isDuplicate) {
                                                            membersWithRoll.push({
                                                                name: m.name,
                                                                rollNo: m.username || ''
                                                            });
                                                        }
                                                    });

                                                    return (
                                                        <div key={sIdx} className="flex flex-col rounded-md shadow-xs overflow-hidden border border-gray-200 min-w-[210px]">
                                                            {/* Period Header */}
                                                            <div className="bg-indigo-600 text-white font-bold text-[10px] text-center py-1.5 px-2 uppercase tracking-wider whitespace-nowrap">
                                                                {formatPeriodLabel(slot.startTime, slot.endTime)}
                                                            </div>

                                                            {/* Card Body */}
                                                            {!hasTeam ? (
                                                                <div className="flex-1 p-3 bg-green-50/30 text-center flex flex-col justify-center items-center transition-colors hover:bg-green-50/50 min-h-[115px]">
                                                                    <div>
                                                                        <div className="text-[9px] uppercase font-extrabold text-green-700 tracking-wider">
                                                                            FREE SLOT
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400 mt-2 whitespace-nowrap">
                                                                            Guide: —
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex-1 p-3 bg-indigo-50 text-center flex flex-col justify-between items-center transition-colors hover:bg-indigo-100/30 min-h-[115px]">
                                                                    <div className="w-full">
                                                                        <div className="text-[9px] uppercase font-extrabold text-indigo-700 tracking-wider">
                                                                            ASSIGNED TEAM
                                                                        </div>
                                                                        {/* Team name in one line */}
                                                                        <div className="font-bold text-gray-800 text-xs mt-1 whitespace-nowrap" title={teamName}>
                                                                            {teamName}
                                                                        </div>

                                                                        {/* One member's name and roll no per line */}
                                                                        {membersWithRoll.length > 0 && (
                                                                            <div className="my-2 space-y-1 w-full text-center">
                                                                                {membersWithRoll.map((m, mIdx) => (
                                                                                    <div
                                                                                        key={mIdx}
                                                                                        className="text-[11px] text-gray-700 whitespace-nowrap flex items-center justify-center gap-1"
                                                                                        title={`${m.name} ${m.rollNo ? `(${m.rollNo})` : ''}`}
                                                                                    >
                                                                                        <span className="font-semibold text-gray-900">{m.name}</span>
                                                                                        {m.rollNo && (
                                                                                            <span className="text-gray-500 text-[10px]">({m.rollNo})</span>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="text-[10px] text-indigo-700 font-semibold mt-1.5 w-full whitespace-nowrap" title={`Guide: ${guideName}`}>
                                                                        Guide: {guideName}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const PanelReviewSchedules = () => {
    const [user, setUser] = useState(null);
    const [reviewSchedules, setReviewSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [schedulesRes] = await Promise.all([
                axios.get(`${SERVER_API_KEY}/api/panels/review-schedules`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${SERVER_API_KEY}/api/auth/profile`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const selectedProgramme = storedUser.programme;
            let fetchedSchedules = schedulesRes.data || [];
            if (selectedProgramme) {
                fetchedSchedules = fetchedSchedules.filter(sch => sch.team?.programme?.toLowerCase() === selectedProgramme?.toLowerCase());
            }
            setReviewSchedules(fetchedSchedules);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch data');
            setLoading(false);
        }
    };

    const isExternal = user?.memberType === 'external';

    // Base filtered schedules (external examiners only see viva)
    const baseSchedules = useMemo(() => {
        if (!isExternal) return reviewSchedules;
        return reviewSchedules.filter(s => {
            const slotLabel = (s.slotLabel || '').toString().toLowerCase();
            const slotType = (s.slotType || s.type || '').toString().toLowerCase();
            const name = (s.name || '').toString().toLowerCase();
            return slotLabel === 'viva' || slotType === 'viva' || name.includes('viva');
        });
    }, [reviewSchedules, isExternal]);

    // Group schedules by panel
    const panelsList = useMemo(() => {
        const map = new Map();
        baseSchedules.forEach(schedule => {
            const pId = schedule.panel?._id ? String(schedule.panel._id) : (schedule.panel?.name || 'unassigned');
            if (!map.has(pId)) {
                const members = Array.isArray(schedule.panel?.members)
                    ? schedule.panel.members.map(m => m?.name).filter(Boolean).join(', ')
                    : '';
                const coordinator = schedule.panel?.coordinator?.name || '';
                const name = schedule.panel?.name || 'Unassigned Panel';
                map.set(pId, {
                    id: pId,
                    name,
                    coordinator,
                    members,
                    schedules: []
                });
            }
            map.get(pId).schedules.push(schedule);
        });
        return Array.from(map.values());
    }, [baseSchedules]);

    if (loading) return <div className="text-center p-4">Loading review schedules...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    if (user && !['panel', 'guide', 'admin'].includes(user.role)) {
        return (
            <div className="bg-white p-6 rounded-lg shadow text-center">
                <h2 className="text-2xl font-bold mb-4">Unauthorized Access</h2>
                <p className="text-red-500">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Panel Review Schedules</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Assigned Review Timetable &amp; Schedules
                    </p>
                </div>
            </div>

            {panelsList.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-500 bg-white border border-dashed border-gray-300 rounded-lg shadow-sm">
                    No review schedules assigned to your panel yet.
                </div>
            ) : (
                panelsList.map(panelItem => (
                    <PanelScheduleSection
                        key={panelItem.id}
                        panel={panelItem}
                        schedules={panelItem.schedules}
                    />
                ))
            )}
        </div>
    );
};

export default PanelReviewSchedules;
