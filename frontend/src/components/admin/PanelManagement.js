import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PanelManagement = () => {
    const [panels, setPanels] = useState([]);
    const [allFaculty, setAllFaculty] = useState([]); // All potential faculty (guides, panel members)
    const [availableFacultyForSelection, setAvailableFacultyForSelection] = useState([]); // For add/remove lists
    const [selectedMembersForForm, setSelectedMembersForForm] = useState([]); // Members currently chosen for form
    const [showPanelForm, setShowPanelForm] = useState(false); // New state to control form visibility
    const [editingPanelId, setEditingPanelId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [coordinators, setCoordinators] = useState([]); // All coordinators
    const [selectedCoordinator, setSelectedCoordinator] = useState(null); // Selected coordinator for form

    useEffect(() => {
        fetchData();
    }, []);

    // Effect to update available/selected faculty lists when allFaculty or selectedMembersForForm changes
    useEffect(() => {
        const selectedIds = new Set(selectedMembersForForm.map(m => m._id));
        // Allow both existing panel members and guides to be added to a panel
        const newAvailable = allFaculty.filter(f => {
            if (!f) return false;
            // Some users may have roles as an array (new schema) or a single role field (legacy)
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

            // Fetch all panels
            const panelsRes = await axios.get('http://localhost:5000/api/panels', { headers });
            setPanels(panelsRes.data);

            // Fetch all faculty (guides and panel members)
            const facultyRes = await axios.get('http://localhost:5000/api/auth/faculty', { headers });
            setAllFaculty(facultyRes.data);

            // Fetch all faculty for coordinator selection (includes guide, panel, coordinator)
            const facultyListRes = await axios.get('http://localhost:5000/api/admin/faculty-list', { headers });
            setCoordinators(facultyListRes.data);

        } catch (err) {
            console.error('Error fetching panel data:', err);
            setError(err.response?.data?.message || 'Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMemberToForm = (member) => {
        // Prevent adding more than one external member
        if (member.memberType === 'external') {
            const hasExternal = selectedMembersForForm.some(m => m.memberType === 'external');
            if (hasExternal) {
                setError('A panel can only have one external member.');
                setTimeout(() => setError(''), 5000); // Clear error after 5 seconds
                return; // Stop the function
            }
        }
        setSelectedMembersForForm([...selectedMembersForForm, member]);
    };

    const handleRemoveMemberFromForm = (memberId) => {
        setSelectedMembersForForm(selectedMembersForForm.filter(m => m._id !== memberId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const panelData = {
            members: selectedMembersForForm.map(m => m._id),
            coordinator: selectedCoordinator ? selectedCoordinator._id : null
        };

        if (panelData.members.length === 0) {
            setError('Panel must have at least one member.');
            return;
        }
        if (!panelData.coordinator) {
            setError('Panel must have a coordinator.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (editingPanelId) {
                // Update existing panel (send both members and coordinator)
                await axios.put(`http://localhost:5000/api/panels/${editingPanelId}`, panelData, { headers });
                setMessage('Panel updated successfully!');
            } else {
                // Create new panel (name generated by backend)
                await axios.post('http://localhost:5000/api/panels', panelData, { headers });
                setMessage('Panel created successfully!');
            }
            handleClearForm(); // Clear form and hide it
            fetchData(); // Refresh list
        } catch (err) {
            console.error('Error saving panel:', err);
            setError(err.response?.data?.message || 'Failed to save panel.');
        }
    };

    const handleEdit = (panel) => {
        setEditingPanelId(panel._id);
        setSelectedMembersForForm(panel.members);
        setSelectedCoordinator(panel.coordinator || null);
        setShowPanelForm(true);
        setMessage('');
        setError('');
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this panel?')) {
            setError('');
            setMessage('');
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };
                await axios.delete(`http://localhost:5000/api/panels/${id}`, { headers });
                setMessage('Panel deleted successfully!');
                fetchData(); // Refresh list
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
        setShowPanelForm(false);
        setError('');
        setMessage('');
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Panel Management</h2>
            
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

            {/* Existing Panels List - Displayed First */}
            <div className="border p-4 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-4">Existing Panels</h3>
                {panels.length === 0 ? (
                    <p className="text-gray-500">No panels created yet.</p>
                ) : (
                    <ul className="space-y-4">
                        {panels.map((panel, index) => (
                            <li key={panel._id} className="border p-3 rounded-md bg-gray-50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-lg">{index + 1}. {panel.name}</span>
                                    <div>
                                        <button
                                            onClick={() => handleEdit(panel)}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(panel._id)}
                                            className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Members: </span>
                                    <span className="text-sm text-gray-800">
                                        {panel.members.map(member => 
                                            `${member.name} (${member.memberType})`
                                        ).join(', ')}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Coordinator: </span>
                                    <span className="text-sm text-gray-800">
                                        {panel.coordinator ? panel.coordinator.name : 'None'}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Button to create a new panel */}
            <div className="mb-6">
                <button
                    onClick={() => { handleClearForm(); setShowPanelForm(true); }}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Create New Panel
                </button>
            </div>

            {/* Create/Edit Panel Form - Conditionally Rendered */}
            {showPanelForm && (
                <div className="border p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">
                        {editingPanelId ? 'Edit Panel' : 'Create New Panel'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Available Panel Faculty</label>
                                <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Selected Panel Members</label>
                                <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
                                    {selectedMembersForForm.length === 0 ? (
                                        <p className="text-gray-500 text-center py-2">No members selected for panel</p>
                                    ) : (
                                        selectedMembersForForm.map(member => (
                                            <div key={member._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                                <span className="text-sm">{member.name} ({member.memberType})</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMemberFromForm(member._id)}
                                                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">Select Coordinator</label>
    <select
        className="w-full border rounded px-2 py-1"
        value={selectedCoordinator ? selectedCoordinator._id : ''}
        onChange={e => {
            const coord = coordinators.find(c => c._id === e.target.value);
            setSelectedCoordinator(coord || null);
        }}
    >
        <option value="">Select a coordinator</option>
        {coordinators
            .filter(coord => {
                // Exclude external members
                if (coord.memberType === 'external') return false;

                // Exclude members already selected for this panel
                return !selectedMembersForForm.some(m => m._id === coord._id);
            })
            .map(coord => (
                <option key={coord._id} value={coord._id}>
                    {coord.name} ({coord.username})
                </option>
            ))}
    </select>
</div>

                        <div>
                            <button
                                type="submit"
                                disabled={selectedMembersForForm.length === 0}
                                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                                    selectedMembersForForm.length === 0
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                                }`}
                            >
                                {editingPanelId ? 'Update Panel' : 'Create Panel'}
                            </button>
                            {editingPanelId && (
                                <button
                                    type="button"
                                    onClick={handleClearForm}
                                    className="ml-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default PanelManagement; 