import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../../utils/toast';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const CoordinatorVivaPanelFormation = () => {
    const [reviewPanels, setReviewPanels] = useState([]);
    const [selectedReviewPanelId, setSelectedReviewPanelId] = useState('');
    const [vivaPanels, setVivaPanels] = useState([]);
    const [teams, setTeams] = useState([]);
    const [allFaculty, setAllFaculty] = useState([]);
    const [availableFacultyForSelection, setAvailableFacultyForSelection] = useState([]);
    const [selectedMembersForForm, setSelectedMembersForForm] = useState([]);
    const [vivaPanelName, setVivaPanelName] = useState('');
    const [editingPanelId, setEditingPanelId] = useState(null);
    const [showPanelForm, setShowPanelForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (selectedReviewPanelId) {
            fetchVivaPanelsAndTeams(selectedReviewPanelId);
        } else {
            setVivaPanels([]);
            setTeams([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedReviewPanelId]);

    // Update available faculty list when allFaculty or selectedMembersForForm changes
    useEffect(() => {
        const selectedIds = new Set(selectedMembersForForm.map(m => m._id));
        const filtered = allFaculty.filter(f => !selectedIds.has(f._id));
        setAvailableFacultyForSelection(filtered);
    }, [allFaculty, selectedMembersForForm]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch coordinator's review panels
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const selectedProg = user.programme || 'UG';
            const panelsRes = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/panel-status`, {
                headers: { ...headers, 'x-selected-programme': selectedProg }
            });

            const coordPanels = panelsRes.data.panels || [];
            setReviewPanels(coordPanels);
            if (coordPanels.length > 0) {
                setSelectedReviewPanelId(coordPanels[0]._id);
            }

            // 2. Fetch all faculty members (both internal and external)
            const facultyRes = await axios.get(`${SERVER_API_KEY}/api/admin/faculty-list?includeExternal=true`, { headers });
            setAllFaculty(facultyRes.data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error loading initialization data');
        } finally {
            setLoading(false);
        }
    };

    const fetchVivaPanelsAndTeams = async (reviewPanelId) => {
        try {
            // 1. Fetch viva panels for the selected review panel
            const vivaPanelsRes = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/viva-panels?reviewPanelId=${reviewPanelId}`, { headers });
            setVivaPanels(vivaPanelsRes.data || []);

            // 2. Fetch teams for the selected review panel
            const teamsRes = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/viva-teams?reviewPanelId=${reviewPanelId}`, { headers });
            setTeams(teamsRes.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error loading panels and teams');
        }
    };

    const handleAddMemberToForm = (member) => {
        setSelectedMembersForForm([...selectedMembersForForm, member]);
    };

    const handleRemoveMemberFromForm = (memberId) => {
        setSelectedMembersForForm(selectedMembersForForm.filter(m => m._id !== memberId));
    };

    const handleSubmitVivaPanel = async (e) => {
        e.preventDefault();

        if (!vivaPanelName.trim()) {
            toast.error('Viva Panel Name is required.');
            return;
        }
        if (selectedMembersForForm.length === 0) {
            toast.error('Viva Panel must have at least one member.');
            return;
        }

        try {
            const payload = {
                panelId: editingPanelId,
                name: vivaPanelName.trim(),
                members: selectedMembersForForm.map(m => m._id),
                reviewPanelId: selectedReviewPanelId
            };

            await axios.post(`${SERVER_API_KEY}/api/panels/coordinator/viva-panel`, payload, { headers });
            toast.success(editingPanelId ? 'Viva panel modified successfully!' : 'Viva panel created successfully!');
            handleClearForm();
            fetchVivaPanelsAndTeams(selectedReviewPanelId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save Viva panel');
        }
    };

    const handleEditVivaPanel = (panel) => {
        setEditingPanelId(panel._id);
        setVivaPanelName(panel.name);
        setSelectedMembersForForm(panel.members || []);
        setShowPanelForm(true);
    };

    const handleDeleteVivaPanel = async (panelId) => {
        if (!window.confirm('Are you sure you want to delete this Viva panel? This will unset this panel from any assigned teams.')) {
            return;
        }
        try {
            await axios.delete(`${SERVER_API_KEY}/api/panels/coordinator/viva-panel/${panelId}`, { headers });
            toast.success('Viva panel deleted successfully!');
            fetchVivaPanelsAndTeams(selectedReviewPanelId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete Viva panel');
        }
    };

    const handleClearForm = () => {
        setEditingPanelId(null);
        setVivaPanelName('');
        setSelectedMembersForForm([]);
        setShowPanelForm(false);
        setSearchQuery('');
    };

    const handleAssignVivaPanel = async (teamId, vivaPanelId) => {
        try {
            await axios.post(`${SERVER_API_KEY}/api/panels/coordinator/assign-viva-panel`, {
                teamId,
                vivaPanelId: vivaPanelId || null
            }, { headers });
            toast.success('Viva Panel assigned to team successfully!');
            fetchVivaPanelsAndTeams(selectedReviewPanelId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to assign Viva Panel');
        }
    };

    // Filter available faculty list based on search query
    const filteredAvailableFaculty = availableFacultyForSelection.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.email_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.affiliation && f.affiliation.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-slate-600 font-medium">Loading viva panel details...</span>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            {/* Header / Review Panel Selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Viva Panel Formation</h2>
                    <p className="text-xs text-slate-500 mt-1">Create multiple viva panels and assign them to teams coordinated by you.</p>
                </div>
                {reviewPanels.length > 1 ? (
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Review Panel Context:</label>
                        <select
                            value={selectedReviewPanelId}
                            onChange={(e) => setSelectedReviewPanelId(e.target.value)}
                            className="text-xs px-3 py-2 border rounded-md font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                            {reviewPanels.map(rp => (
                                <option key={rp._id} value={rp._id}>{rp.name} ({rp.programme})</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    reviewPanels.length === 1 && (
                        <span className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-150 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                            Coordinating: {reviewPanels[0].name} ({reviewPanels[0].programme})
                        </span>
                    )
                )}
            </div>

            {/* List and Creation form block */}
            <div className="grid grid-cols-1 gap-6">
                {/* Existing Viva Panels Table */}
                <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-700">Existing Viva Panels</h3>
                        {!showPanelForm && (
                            <button
                                onClick={() => { handleClearForm(); setShowPanelForm(true); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-bold transition"
                            >
                                Create Viva Panel
                            </button>
                        )}
                    </div>
                    {vivaPanels.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm border-t border-slate-100">
                            No viva panels created for this panel yet. Click "Create Viva Panel" to add one.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-150 text-xs text-slate-700 text-left">
                                <thead className="bg-slate-50">
                                    <tr className="text-slate-500 uppercase tracking-wider font-bold">
                                        <th className="px-4 py-3">Viva Panel Name</th>
                                        <th className="px-4 py-3">Members</th>
                                        <th className="px-4 py-3 text-center w-28">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {vivaPanels.map(panel => (
                                        <tr key={panel._id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-indigo-600">{panel.name}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {panel.members.map(m => (
                                                        <span key={m._id} className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                                                            m.memberType === 'external' 
                                                                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                                                : 'bg-slate-50 text-slate-700 border-slate-200'
                                                        }`}>
                                                            {m.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center space-x-2">
                                                <button
                                                    onClick={() => handleEditVivaPanel(panel)}
                                                    className="text-indigo-600 hover:text-indigo-900 font-semibold"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteVivaPanel(panel._id)}
                                                    className="text-rose-600 hover:text-rose-900 font-semibold"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Form Container */}
                {showPanelForm && (
                    <div className="border-2 border-indigo-150 p-5 rounded-xl bg-indigo-50/15 space-y-4">
                        <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                            <h3 className="text-sm font-extrabold text-indigo-900">
                                {editingPanelId ? `Edit Viva Panel Configuration` : `Configure New Viva Panel`}
                            </h3>
                            <button onClick={handleClearForm} className="text-slate-400 hover:text-slate-600 font-bold text-base">&times;</button>
                        </div>

                        <form onSubmit={handleSubmitVivaPanel} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Viva Panel Name</label>
                                <input
                                    type="text"
                                    value={vivaPanelName}
                                    onChange={(e) => setVivaPanelName(e.target.value)}
                                    placeholder="e.g. Viva Panel 1"
                                    className="w-full max-w-sm px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Available Faculty Transfer Box */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Available Faculty (Internal & External)</label>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by name/aff..."
                                            className="px-2 py-1 border rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                        />
                                    </div>
                                    <div className="border bg-white rounded-md p-2 max-h-56 overflow-y-auto space-y-1">
                                        {filteredAvailableFaculty.length === 0 ? (
                                            <p className="text-slate-400 text-center py-4 text-xs italic">No matching available faculty</p>
                                        ) : (
                                            filteredAvailableFaculty.map(member => (
                                                <div key={member._id} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-slate-700">{member.name}</span>
                                                        <span className="text-[9px] text-slate-400 italic leading-none mt-0.5">
                                                            {member.memberType === 'external' ? `External (${member.affiliation || 'no affiliation'})` : `Internal (${member.designation || 'no designation'})`}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddMemberToForm(member)}
                                                        className="px-2 py-1 text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-bold transition"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Selected Members List */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Selected Panel Members</label>
                                    <div className="border bg-white rounded-md max-h-56 overflow-y-auto divide-y">
                                        {selectedMembersForForm.length === 0 ? (
                                            <p className="text-slate-400 text-center py-6 text-xs italic">No members selected yet</p>
                                        ) : (
                                            selectedMembersForForm.map(member => (
                                                <div key={member._id} className="flex items-center justify-between p-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-slate-700">{member.name}</span>
                                                        <span className="text-[9px] text-slate-400 italic">
                                                            {member.memberType === 'external' ? 'External' : 'Internal'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMemberFromForm(member._id)}
                                                        className="px-2 py-1 text-[10px] bg-rose-50 text-rose-600 hover:bg-rose-100 rounded font-bold transition"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={handleClearForm}
                                    className="px-3.5 py-2 border rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 bg-white shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={selectedMembersForForm.length === 0}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editingPanelId ? 'Save Changes' : 'Save Viva Panel'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Team Allocation Section */}
            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="p-4 bg-slate-50 border-b">
                    <h3 className="text-sm font-bold text-slate-700">Assign Viva Panels to Teams</h3>
                </div>
                {teams.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm border-t border-slate-100">
                        No teams assigned to this review panel yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-150 text-xs text-slate-700 text-left">
                            <thead className="bg-slate-50">
                                <tr className="text-slate-500 uppercase tracking-wider font-bold">
                                    <th className="px-4 py-3 text-center w-14">#</th>
                                    <th className="px-4 py-3">Team Name</th>
                                    <th className="px-4 py-3">Programme</th>
                                    <th className="px-4 py-3">Members</th>
                                    <th className="px-4 py-3">Assigned Viva Panel</th>
                                    <th className="px-4 py-3 text-center w-24">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {teams.map((team, index) => {
                                    const allMembers = [];
                                    if (team.teamLeader) allMembers.push(team.teamLeader.name);
                                    (team.members || []).forEach(m => allMembers.push(m.name));

                                    // Local state track selection
                                    return (
                                        <tr key={team._id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-center text-slate-400">{index + 1}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-800">{team.teamName}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 border border-indigo-100 text-indigo-600">
                                                    {team.programme || 'UG'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">{allMembers.join(', ')}</td>
                                            <td className="px-4 py-3">
                                                <select
                                                    id={`viva-select-${team._id}`}
                                                    defaultValue={team.vivaPanel?._id || ''}
                                                    className="w-full max-w-[200px] text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                                >
                                                    <option value="">— None —</option>
                                                    {vivaPanels.map(p => (
                                                        <option key={p._id} value={p._id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => {
                                                        const el = document.getElementById(`viva-select-${team._id}`);
                                                        handleAssignVivaPanel(team._id, el?.value);
                                                    }}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition"
                                                >
                                                    Save
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoordinatorVivaPanelFormation;
