import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../../utils/toast';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

const PanelManagement = ({ panelType = 'review', programme }) => {
    const [panels, setPanels] = useState([]);
    const [allFaculty, setAllFaculty] = useState([]); // All potential faculty (guides, panel members)
    const [availableFacultyForSelection, setAvailableFacultyForSelection] = useState([]); // For add/remove lists
    const [selectedMembersForForm, setSelectedMembersForForm] = useState([]); // Members currently chosen for form
    const [showPanelForm, setShowPanelForm] = useState(false); // Controls form visibility
    const [editingPanelId, setEditingPanelId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [coordinators, setCoordinators] = useState([]); // All coordinators
    const [selectedCoordinator, setSelectedCoordinator] = useState(null); // String ID
    const [selectedAssistantCoordinators, setSelectedAssistantCoordinators] = useState([]); // Array of String IDs

    useEffect(() => {
        if (error) {
            toast.error(error);
            setError('');
        }
    }, [error]);

    useEffect(() => {
        if (message) {
            toast.success(message);
            setMessage('');
        }
    }, [message]);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [panelType]);

    // Effect to update available/selected faculty lists when allFaculty or selectedMembersForForm changes
    useEffect(() => {
        const selectedIds = new Set(selectedMembersForForm.map(m => m._id));
        const newAvailable = allFaculty.filter(f => {
            if (!f) return false;
            const roleNames = Array.isArray(f.roles) && f.roles.length > 0
                ? f.roles.map(r => r.role)
                : (f.role ? [f.role] : []);
            const hasFacultyRole = roleNames.some(r => ['panel', 'guide'].includes(r));
            return hasFacultyRole && !selectedIds.has(f._id);
        });
        setAvailableFacultyForSelection(newAvailable);
    }, [allFaculty, selectedMembersForForm]);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found. Please log in as an admin.');
                setLoading(false);
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };

            // Fetch all panels of the specific type, filtered by programme if provided
            const progParam = programme ? `&programme=${encodeURIComponent(programme)}` : '';
            const panelsRes = await axios.get(`${SERVER_API_KEY}/api/panels?panelType=${panelType}${progParam}`, { headers });
            setPanels(panelsRes.data);

            // Fetch all faculty (guides and panel members)
            const facultyRes = await axios.get(`${SERVER_API_KEY}/api/auth/faculty`, { headers });
            setAllFaculty(facultyRes.data);

            // Fetch all faculty for coordinator selection
            const facultyListRes = await axios.get(`${SERVER_API_KEY}/api/admin/faculty-list`, { headers });
            setCoordinators(facultyListRes.data);

        } catch (err) {
            console.error('Error fetching panel data:', err);
            setError(err.response?.data?.message || 'Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMemberToForm = (member) => {
        if (member.memberType === 'external') {
            const hasExternal = selectedMembersForForm.some(m => m.memberType === 'external');
            if (hasExternal) {
                setError('A panel can only have one external member.');
                setTimeout(() => setError(''), 5000);
                return;
            }
        }
        setSelectedMembersForForm([...selectedMembersForForm, member]);
    };

    const handleRemoveMemberFromForm = (memberId) => {
        setSelectedMembersForForm(selectedMembersForForm.filter(m => m._id !== memberId));
        if (selectedCoordinator === memberId) setSelectedCoordinator(null);
        setSelectedAssistantCoordinators(selectedAssistantCoordinators.filter(id => id !== memberId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const panelData = {
            members: selectedMembersForForm.map(m => m._id),
            coordinator: selectedCoordinator,
            assistantCoordinators: selectedAssistantCoordinators,
            panelType,
            programme
        };

        if (panelData.members.length === 0) {
            setError('Panel must have at least one member.');
            return;
        }
        if (!panelData.coordinator) {
            setError('Panel must have a coordinator.');
            return;
        }
        if (!panelData.members.includes(panelData.coordinator)) {
            setError('Coordinator must be selected from the panel members.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (editingPanelId) {
                await axios.put(`${SERVER_API_KEY}/api/panels/${editingPanelId}`, panelData, { headers });
                setMessage('Panel updated successfully!');
            } else {
                await axios.post(`${SERVER_API_KEY}/api/panels`, panelData, { headers });
                setMessage('Panel created successfully!');
            }
            handleClearForm();
            fetchData();
        } catch (err) {
            console.error('Error saving panel:', err);
            setError(err.response?.data?.message || 'Failed to save panel.');
        }
    };

    const handleEdit = (panel) => {
        setEditingPanelId(panel._id);
        setSelectedMembersForForm(panel.members);
        setSelectedCoordinator(panel.coordinator ? panel.coordinator._id || panel.coordinator : null);
        setSelectedAssistantCoordinators(panel.assistantCoordinators ? panel.assistantCoordinators.map(ac => ac._id || ac) : []);
        setShowPanelForm(true);
        setMessage('');
        setError('');
        
        setTimeout(() => {
            document.getElementById('panel-form-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleDelete = async (panelId) => {
        if (window.confirm('Are you sure you want to delete this panel? This will cleanly cascade and clear assignments across the database.')) {
            setError('');
            setMessage('');
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };
                await axios.delete(`${SERVER_API_KEY}/api/panels/${panelId}`, { headers });
                setMessage('Panel deleted successfully!');
                fetchData();
            } catch (err) {
                console.error('Error deleting panel:', err);
                setError(err.response?.data?.message || 'Failed to delete panel.');
            }
        }
    };

    const handleClearForm = () => {
        setEditingPanelId(null);
        setSelectedMembersForForm([]);
        setSelectedCoordinator(null);
        setSelectedAssistantCoordinators([]);
        setShowPanelForm(false);
        setError('');
        setMessage('');
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                    {panelType === 'viva' ? 'Viva Panel Management' : 'Review Panel Management'}
                </h2>
                {!showPanelForm && (
                    <button
                        onClick={() => { handleClearForm(); setShowPanelForm(true); }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        {panelType === 'viva' ? 'Create New Viva Panel' : 'Create New Review Panel'}
                    </button>
                )}
            </div>
            


            {/* Master Panels Table View */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-md bg-white">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">Existing Panels</h3>
                </div>
                <div className="overflow-x-auto">
                    {panels.length === 0 ? (
                        <p className="text-gray-500 text-center py-6 bg-white">No panels created yet.</p>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-200 bg-white">
                            <thead className="bg-slate-100/80">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Panel Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Members</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Coordinator</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Assistant Coordinators</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Assigned Teams</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {panels.map((panel) => (
                                    <tr key={panel._id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 border-b border-slate-200/60">
                                            {panel.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 border-b border-slate-200/60">
                                            {panel.members && panel.members.map(m => m.name).join(', ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold border-b border-slate-200/60">
                                            {panel.coordinator ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                    <span>{typeof panel.coordinator === 'object' ? panel.coordinator.name : panel.coordinator}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic font-normal">None Assigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 border-b border-slate-200/60">
                                            {panel.assistantCoordinators && panel.assistantCoordinators.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {panel.assistantCoordinators
                                                        .map(ac => {
                                                            if (!ac) return null;
                                                            const name = typeof ac === 'object' ? (ac.name || ac._id) : ac;
                                                            return (
                                                                <span key={ac._id || ac} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                                                                    {name}
                                                                </span>
                                                            );
                                                        })
                                                        .filter(Boolean)}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic font-normal">None Assigned</span>
                                            )}
                                        </td>
                                        {/* New Column Displaying Dynamic Team Counts Display */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm border-b border-slate-200/60">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                                                panel.assignedTeamsCount > 0 
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-150 shadow-sm' 
                                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                            }`}>
                                                {panel.assignedTeamsCount || 0} {panel.assignedTeamsCount === 1 ? 'Team' : 'Teams'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold space-x-4 border-b border-slate-200/60">
                                            <button
                                                onClick={() => handleEdit(panel)}
                                                className="text-indigo-600 hover:text-indigo-900 transition-colors duration-150"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(panel._id)}
                                                className="text-rose-600 hover:text-rose-900 transition-colors duration-150"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Form Container */}
            {showPanelForm && (
                <div id="panel-form-section" className="border-2 border-indigo-100 p-6 rounded-lg bg-indigo-50/30 transition-all duration-300">
                    <div className="flex justify-between items-center mb-4 border-b pb-2 border-indigo-100">
                        <h3 className="text-xl font-semibold text-indigo-900">
                            {editingPanelId ? `Modifying ${panelType === 'viva' ? 'Viva Panel' : 'Review Panel'} Configuration (${panels.find(p => p._id === editingPanelId)?.name})` : `Configure New ${panelType === 'viva' ? 'Viva Panel' : 'Review Panel'} Structure`}
                        </h3>
                        <button 
                            type="button" 
                            onClick={handleClearForm}
                            className="text-gray-400 hover:text-gray-600 font-bold text-lg"
                        >
                            &times;
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Available Panel Faculty</label>
                                <div className="border bg-white rounded-md p-2 max-h-60 overflow-y-auto">
                                    {availableFacultyForSelection.length === 0 ? (
                                        <p className="text-gray-500 text-center py-2">No available faculty</p>
                                    ) : (
                                        availableFacultyForSelection.map(member => (
                                            <div key={member._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                                <span className="text-sm">{member.name} ({member.memberType})</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddMemberToForm(member)}
                                                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Selected Panel Members & Role Structure</label>
                                <div className="border bg-white rounded-md max-h-60 overflow-y-auto">
                                    {selectedMembersForForm.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">No members selected for panel</p>
                                    ) : (
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Coordinator</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Asst. Coord.</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {selectedMembersForForm.map(member => (
                                                    <tr key={member._id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-sm">{member.name} ({member.memberType})</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <input 
                                                                type="radio" 
                                                                name="coordinatorGroup" 
                                                                checked={selectedCoordinator === member._id}
                                                                onChange={() => {
                                                                    setSelectedCoordinator(member._id);
                                                                    setSelectedAssistantCoordinators(prev => prev.filter(id => id !== member._id));
                                                                }}
                                                                disabled={member.memberType === 'external' || selectedAssistantCoordinators.includes(member._id)}
                                                                className={`h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 ${member.memberType === 'external' ? 'hidden' : ''}`}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedAssistantCoordinators.includes(member._id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedAssistantCoordinators([...selectedAssistantCoordinators, member._id]);
                                                                        if (selectedCoordinator === member._id) setSelectedCoordinator(null);
                                                                    } else {
                                                                        setSelectedAssistantCoordinators(selectedAssistantCoordinators.filter(id => id !== member._id));
                                                                    }
                                                                }}
                                                                disabled={member.memberType === 'external' || selectedCoordinator === member._id}
                                                                className={`h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 ${member.memberType === 'external' ? 'hidden' : ''}`}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveMemberFromForm(member._id)}
                                                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t flex items-center justify-end">
                            <button
                                type="button"
                                onClick={handleClearForm}
                                className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Cancel / Close
                            </button>
                            <button
                                type="submit"
                                disabled={selectedMembersForForm.length === 0}
                                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                                    selectedMembersForForm.length === 0
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                                }`}
                            >
                                {editingPanelId ? 'Commit Modification' : 'Save New Panel Configuration'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default PanelManagement;