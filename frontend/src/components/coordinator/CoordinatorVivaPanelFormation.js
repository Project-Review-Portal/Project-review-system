import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

const CoordinatorVivaPanelFormation = () => {
    const [reviewPanel, setReviewPanel] = useState(null);
    const [, setVivaPanel] = useState(null);
    const [externalFaculty, setExternalFaculty] = useState([]);
    const [selectedExternalId, setSelectedExternalId] = useState('');
    const [assignedExternalMembers, setAssignedExternalMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchPanelDetails();
        fetchExternalFaculty();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-dismiss messages
    useEffect(() => {
        if (message && messageType === 'success') {
            const timer = setTimeout(() => {
                setMessage('');
                setMessageType('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message, messageType]);

    const fetchPanelDetails = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/viva-panel`, { headers });
            setReviewPanel(response.data.reviewPanel);
            setVivaPanel(response.data.vivaPanel);
            
            // Prefill assigned external members from existing viva panel
            if (response.data.vivaPanel && response.data.vivaPanel.members) {
                const externals = response.data.vivaPanel.members.filter(m => m.memberType === 'external');
                setAssignedExternalMembers(externals);
            } else {
                setAssignedExternalMembers([]);
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error fetching panel details');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const fetchExternalFaculty = async () => {
        try {
            const response = await axios.get(`${SERVER_API_KEY}/api/admin/faculty-list?includeExternal=true`, { headers });
            const externals = response.data.filter(f => f.memberType === 'external');
            setExternalFaculty(externals);
        } catch (error) {
            console.error('Error fetching external faculty:', error);
        }
    };

    const addExternalExaminer = () => {
        if (!selectedExternalId) return;

        // Check if already added
        if (assignedExternalMembers.some(m => m._id === selectedExternalId)) {
            setMessage('This examiner is already added to the Viva Panel.');
            setMessageType('error');
            return;
        }

        const examiner = externalFaculty.find(f => f._id === selectedExternalId);
        if (examiner) {
            setAssignedExternalMembers(prev => [...prev, examiner]);
            setSelectedExternalId('');
            setMessage('');
            setMessageType('');
        }
    };

    const removeExternalExaminer = (id) => {
        setAssignedExternalMembers(prev => prev.filter(m => m._id !== id));
    };

    const handleSaveVivaPanel = async () => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const isReadOnly = storedUser.role === 'assistant coordinator';
        if (isReadOnly) {
            setMessage('Action forbidden in Read-Only Mode.');
            setMessageType('error');
            return;
        }
        setLoading(true);
        setMessage('');
        setMessageType('');
        try {
            const externalMemberIds = assignedExternalMembers.map(m => m._id);
            const response = await axios.post(`${SERVER_API_KEY}/api/panels/coordinator/viva-panel`, { externalMemberIds }, { headers });
            setVivaPanel(response.data.vivaPanel);
            setMessage('Viva Panel updated and assigned to all panel teams successfully!');
            setMessageType('success');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error saving Viva Panel');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    if (!reviewPanel) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-slate-500 font-semibold">Loading panel details...</p>
            </div>
        );
    }

    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isReadOnly = storedUser.role === 'assistant coordinator';

    // Filter internal members of review panel
    const internalMembers = reviewPanel.members.filter(m => m.memberType === 'internal');

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-6 bg-white rounded-xl shadow-lg border border-gray-100 mt-6">
            <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-slate-800">Viva Panel Formation</h2>
                {isReadOnly && (
                    <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded font-medium text-center">
                        ℹ️ You are viewing this page in Read-Only Mode as an Assistant Coordinator.
                    </div>
                )}
                <p className="text-sm text-slate-500 mt-1">
                    Form the Viva Examination Panel. Internal review panel members and coordinators are prefilled. Add or remove external examiners as needed.
                </p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${messageType === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-rose-100 bg-rose-50 text-rose-800'}`}>
                    <span className="text-lg">{messageType === 'success' ? '✅' : '⚠️'}</span>
                    <p className="text-sm font-semibold">{message}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Prefilled Internal Panel Members */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 border-b pb-2">
                        Internal Panel Members (Read-Only)
                    </h3>
                    
                    <div className="space-y-3">
                        <div className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm">
                            <div>
                                <p className="font-semibold text-slate-800 text-sm">{reviewPanel.coordinator?.name}</p>
                                <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider mt-0.5">Coordinator</p>
                            </div>
                            <span className="text-xs text-slate-400 font-semibold">{reviewPanel.coordinator?.designation || 'Faculty'}</span>
                        </div>

                        {reviewPanel.assistantCoordinators && reviewPanel.assistantCoordinators.map(ac => (
                            <div key={ac._id} className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{ac.name}</p>
                                    <p className="text-xs text-purple-600 font-medium uppercase tracking-wider mt-0.5">Assistant Coordinator</p>
                                </div>
                                <span className="text-xs text-slate-400 font-semibold">{ac.designation || 'Faculty'}</span>
                            </div>
                        ))}

                        {internalMembers.map(member => (
                            <div key={member._id} className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{member.name}</p>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">Internal Examiner</p>
                                </div>
                                <span className="text-xs text-slate-400 font-semibold">{member.designation || 'Faculty'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: External Examiners */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">
                            External Examiners
                        </h3>

                        {/* Add external dropdown */}
                        <div className="flex gap-2 mb-6">
                            <select
                                value={selectedExternalId}
                                onChange={(e) => setSelectedExternalId(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
                                disabled={isReadOnly}
                            >
                                <option value="">Select External Examiner</option>
                                {externalFaculty.map(f => (
                                    <option key={f._id} value={f._id}>
                                        {f.name} ({f.designation || 'Industry Expert'})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={addExternalExaminer}
                                disabled={!selectedExternalId || isReadOnly}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                            >
                                Add
                            </button>
                        </div>

                        {/* External List */}
                        <div className="space-y-3">
                            {assignedExternalMembers.length === 0 ? (
                                <div className="text-center p-8 border border-dashed rounded-lg text-slate-400 text-sm font-medium">
                                    No external examiners added yet.
                                </div>
                            ) : (
                                assignedExternalMembers.map(member => (
                                    <div key={member._id} className="p-3 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm bg-indigo-50/30">
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{member.name}</p>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">External Examiner</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400 font-semibold">{member.designation || 'Expert'}</span>
                                            <button
                                                onClick={() => removeExternalExaminer(member._id)}
                                                className="text-rose-600 hover:text-rose-800 text-lg font-bold px-2 disabled:opacity-50"
                                                disabled={isReadOnly}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-6 flex justify-end">
                        <button
                            onClick={handleSaveVivaPanel}
                            disabled={loading || isReadOnly}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors shadow"
                        >
                            {loading ? 'Saving...' : 'Save Viva Panel'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoordinatorVivaPanelFormation;
