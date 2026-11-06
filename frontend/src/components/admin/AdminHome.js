import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../utils/toast';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
];

const AdminHome = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const navigate = useNavigate();

    // Modal state for Add/Edit Session
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [formData, setFormData] = useState({
        startMonth: 7,
        startYear: new Date().getFullYear(),
        endMonth: 11,
        endYear: new Date().getFullYear(),
        semesterType: 'odd',
        isManualCurrent: false,
        isManualAdvanced: false
    });
    const [submitting, setSubmitting] = useState(false);

    // Modal state for UG Rollover
    const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
    const [targetSessionForRollover, setTargetSessionForRollover] = useState(null);
    const [sourceSessionId, setSourceSessionId] = useState('');
    const [rolloverLoading, setRolloverLoading] = useState(false);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${SERVER_API_KEY}/api/sessions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions(res.data.sessions || []);
            setCurrentSessionId(res.data.currentSessionId);
        } catch (err) {
            console.error('Error fetching sessions:', err);
            toast.error(err.response?.data?.message || 'Failed to fetch sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedSessionId');
        localStorage.removeItem('selectedSessionName');
        window.location.href = '/';
    };

    const openAddModal = () => {
        const now = new Date();
        const curYear = now.getFullYear();
        setEditingSession(null);
        setFormData({
            startMonth: 7,
            startYear: curYear,
            endMonth: 11,
            endYear: curYear,
            semesterType: 'odd',
            isManualCurrent: false,
            isManualAdvanced: false
        });
        setIsModalOpen(true);
    };

    const openEditModal = (s, e) => {
        e.stopPropagation();
        setEditingSession(s);
        setFormData({
            startMonth: s.startMonth,
            startYear: s.startYear,
            endMonth: s.endMonth,
            endYear: s.endYear,
            semesterType: s.semesterType || 'odd',
            isManualCurrent: !!s.isManualCurrent,
            isManualAdvanced: !!s.isManualAdvanced
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            if (editingSession) {
                const res = await axios.put(`${SERVER_API_KEY}/api/sessions/${editingSession._id}`, formData, { headers });
                toast.success(res.data.message || 'Session updated successfully');
            } else {
                const res = await axios.post(`${SERVER_API_KEY}/api/sessions`, formData, { headers });
                toast.success(res.data.message || 'Session created successfully');
            }
            setIsModalOpen(false);
            await fetchSessions();
        } catch (err) {
            console.error('Error saving session:', err);
            toast.error(err.response?.data?.message || 'Failed to save session');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (s, e) => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        try {
            const res = await axios.patch(
                `${SERVER_API_KEY}/api/sessions/${s._id}/toggle-status`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(res.data.message);
            await fetchSessions();
        } catch (err) {
            console.error('Error toggling session status:', err);
            toast.error(err.response?.data?.message || 'Failed to toggle session status');
        }
    };

    const handleDeleteSession = async (s, e) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete session "${s.name}"? This action cannot be undone.`)) {
            return;
        }

        const token = localStorage.getItem('token');
        try {
            const res = await axios.delete(`${SERVER_API_KEY}/api/sessions/${s._id}?force=true`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(res.data.message);
            await fetchSessions();
        } catch (err) {
            console.error('Error deleting session:', err);
            toast.error(err.response?.data?.message || 'Failed to delete session');
        }
    };

    const openRolloverModal = (targetSession, e) => {
        e.stopPropagation();
        setTargetSessionForRollover(targetSession);
        // Find previous odd session if available
        const oddSessions = sessions.filter(s => s._id !== targetSession._id && s.semesterType === 'odd');
        setSourceSessionId(oddSessions.length > 0 ? oddSessions[0]._id : '');
        setIsRolloverModalOpen(true);
    };

    const handlePerformRollover = async (e) => {
        e.preventDefault();
        if (!sourceSessionId) {
            toast.error('Please select a source Odd semester session to copy from');
            return;
        }

        setRolloverLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await axios.post(
                `${SERVER_API_KEY}/api/sessions/rollover-ug`,
                {
                    fromSessionId: sourceSessionId,
                    toSessionId: targetSessionForRollover._id
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(res.data.message);
            setIsRolloverModalOpen(false);
        } catch (err) {
            console.error('Error during UG rollover:', err);
            toast.error(err.response?.data?.message || 'Failed to rollover UG data');
        } finally {
            setRolloverLoading(false);
        }
    };

    const handleSelectSession = (s) => {
        localStorage.setItem('selectedSessionId', s._id);
        localStorage.setItem('selectedSessionName', s.name);
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.session = s._id;
        localStorage.setItem('user', JSON.stringify(storedUser));
        navigate(`/admin-dashboard/session/${s._id}`);
    };

    const ListItem = ({ title, subtitle, icon, color, onClick }) => (
        <button
            onClick={onClick}
            className={`group w-full relative flex items-center p-4 rounded-xl shadow border text-left transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${color} mb-3`}
        >
            <div className="text-3xl mr-4">{icon}</div>
            <div className="flex-1">
                <div className="text-lg font-bold text-gray-800">{title}</div>
                {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
            </div>
            <div className="text-gray-400 text-xl group-hover:translate-x-1 transition-transform">→</div>
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto py-12 px-6">
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Admin Control Panel</h1>
                        <p className="text-gray-500">Select a session context to manage students, panels, and reviews.</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow"
                    >
                        Logout
                    </button>
                </div>

                {/* Sessions Section - Replaces PG programmes */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-purple-600">Sessions</h2>
                            <p className="text-xs text-gray-400">Click any session to view and manage its respective programmes.</p>
                        </div>
                        <button
                            onClick={openAddModal}
                            className="bg-purple-600 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold hover:bg-purple-700 transition shadow flex items-center gap-1.5"
                        >
                            <span>+ Add Session</span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-gray-400 text-sm animate-pulse p-4">Loading sessions…</div>
                    ) : sessions.length === 0 ? (
                        <div className="p-8 text-center bg-white border border-dashed border-gray-300 rounded-xl text-gray-500">
                            <div className="text-3xl mb-2">📅</div>
                            <div className="font-semibold text-gray-700 mb-1">No sessions added yet</div>
                            <p className="text-xs text-gray-400 mb-4">Add your first academic semester session to get started.</p>
                            <button
                                onClick={openAddModal}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-purple-700"
                            >
                                Create First Session
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {sessions.map(s => {
                                const isActive = s.status === 'active';
                                const isEvenSem = s.semesterType === 'even';

                                return (
                                    <div
                                        key={s._id}
                                        onClick={() => handleSelectSession(s)}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="text-3xl p-2 bg-purple-50 rounded-lg text-purple-600 flex-shrink-0">
                                                📅
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="text-lg font-bold text-gray-900">{s.name}</span>
                                                    {s.isCurrent && (
                                                        <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                                                            ⭐ Current
                                                        </span>
                                                    )}
                                                    {s.isAdvanced && (
                                                        <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                                                            🚀 Advanced
                                                        </span>
                                                    )}
                                                    {s.isReadOnly && (
                                                        <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full border border-gray-200">
                                                            🔒 Read-Only
                                                        </span>
                                                    )}
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full border">
                                                        {s.semesterType === 'odd' ? 'Odd Semester' : 'Even Semester'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Session Controls & Actions */}
                                        <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                                            {/* Rollover UG button for Even semester sessions */}
                                            {isEvenSem && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => openRolloverModal(s, e)}
                                                    className="px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
                                                    title="Copy UG students, teams & guides from Odd semester"
                                                >
                                                    👥 UG Rollover
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={(e) => openEditModal(s, e)}
                                                className="px-2.5 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-200 transition"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteSession(s, e)}
                                                className="px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                                            >
                                                Delete
                                            </button>

                                            <div className="text-gray-400 text-xl ml-2">→</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Add / Edit Session Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4 border-b pb-3">
                            <h3 className="text-xl font-bold text-gray-800">
                                {editingSession ? 'Edit Academic Session' : 'Create Academic Session'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            {/* Start Duration */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                    Start Duration (Month & Year)
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <select
                                        value={formData.startMonth}
                                        onChange={e => setFormData({ ...formData, startMonth: parseInt(e.target.value, 10) })}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        required
                                    >
                                        {MONTHS.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min="2000"
                                        max="2100"
                                        value={formData.startYear}
                                        onChange={e => setFormData({ ...formData, startYear: parseInt(e.target.value, 10) })}
                                        placeholder="Start Year (e.g. 2025)"
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {/* End Duration */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                    End Duration (Month & Year)
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <select
                                        value={formData.endMonth}
                                        onChange={e => setFormData({ ...formData, endMonth: parseInt(e.target.value, 10) })}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        required
                                    >
                                        {MONTHS.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min="2000"
                                        max="2100"
                                        value={formData.endYear}
                                        onChange={e => setFormData({ ...formData, endYear: parseInt(e.target.value, 10) })}
                                        placeholder="End Year (e.g. 2025)"
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Semester Type */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                    Semester Type
                                </label>
                                <select
                                    value={formData.semesterType}
                                    onChange={e => setFormData({ ...formData, semesterType: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                >
                                    <option value="odd">Odd Semester </option>
                                    <option value="even">Even Semester </option>
                                </select>
                                <p className="text-xs text-gray-400 mt-1">
                                    {formData.semesterType === 'even'
                                        ? 'Even semester automatically adds B.E. CSE to Programs Offered (removable).'
                                        : 'Odd semester starts with no default programs; add PG programs in Programs Offered.'}
                                </p>
                            </div>

                            {/* Access Tier: Current Session */}
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="manualCurrent"
                                    checked={formData.isManualCurrent}
                                    disabled={formData.isManualAdvanced}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setFormData({
                                            ...formData,
                                            isManualCurrent: checked,
                                            isManualAdvanced: checked ? false : formData.isManualAdvanced
                                        });
                                    }}
                                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                                />
                                <label htmlFor="manualCurrent" className="text-xs text-gray-800 cursor-pointer font-medium">
                                    ⭐ Set as Current Session (Primary active semester for review activities)
                                </label>
                            </div>

                            {/* Access Tier: Advanced Session */}
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="manualAdvanced"
                                    checked={formData.isManualAdvanced}
                                    disabled={formData.isManualCurrent}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setFormData({
                                            ...formData,
                                            isManualAdvanced: checked,
                                            isManualCurrent: checked ? false : formData.isManualCurrent
                                        });
                                    }}
                                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                <label htmlFor="manualAdvanced" className="text-xs text-gray-800 cursor-pointer font-medium">
                                    🚀 Set as Advanced Session (Secondary active semester with full read-write access)
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving…' : editingSession ? 'Update Session' : 'Create Session'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* UG Rollover Modal */}
            {isRolloverModalOpen && targetSessionForRollover && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-3 border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-800">
                                UG Rollover (Odd → Even Semester)
                            </h3>
                            <button
                                onClick={() => setIsRolloverModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                            UG (B.E. CSE) students continue the same project across both semesters.
                            This will copy all <strong>UG teams, members, lock states, and assigned guides</strong> from the selected Odd semester into <strong>{targetSessionForRollover.name}</strong>.
                            <br /><br />
                            <em className="text-gray-500">Note: PG students do not roll over (they begin fresh in Session 2). Reviews and marks start fresh.</em>
                        </p>

                        <form onSubmit={handlePerformRollover} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Source Odd Semester Session:
                                </label>
                                <select
                                    value={sourceSessionId}
                                    onChange={e => setSourceSessionId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    required
                                >
                                    <option value="">-- Select Source Session --</option>
                                    {sessions
                                        .filter(s => s._id !== targetSessionForRollover._id)
                                        .map(s => (
                                            <option key={s._id} value={s._id}>
                                                {s.name} ({s.semesterType === 'odd' ? 'Odd Sem' : 'Even Sem'})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsRolloverModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={rolloverLoading || !sourceSessionId}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {rolloverLoading ? 'Rolling Over…' : 'Execute UG Rollover'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHome;
