import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

// All supported file type options
const FILE_TYPE_OPTIONS = [
    { value: 'pdf',  label: 'PDF (.pdf)' },
    { value: 'doc',  label: 'Word Document (.doc)' },
    { value: 'docx', label: 'Word Document (.docx)' },
    { value: 'ppt',  label: 'PowerPoint (.ppt)' },
    { value: 'pptx', label: 'PowerPoint (.pptx)' },
    { value: 'txt',  label: 'Plain Text (.txt)' },
    { value: 'xls',  label: 'Excel (.xls)' },
    { value: 'xlsx', label: 'Excel (.xlsx)' },
    { value: 'zip',  label: 'ZIP Archive (.zip)' },
    { value: 'jpg',  label: 'JPEG Image (.jpg)' },
    { value: 'png',  label: 'PNG Image (.png)' },
];

const MaterialSettings = () => {
    const [panels, setPanels] = useState([]);
    const [selectedPanelId, setSelectedPanelId] = useState('');
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ name: '', fileType: ['pdf'], isRequired: true });

    // Helper to get auth config with programme header
    const getRequestConfig = () => {
        const token = localStorage.getItem('token');
        const rawUser = localStorage.getItem('user');
        let userProgramme = 'UG';
        if (rawUser) {
            try {
                const storedUser = JSON.parse(rawUser);
                userProgramme = storedUser.programme || storedUser.user?.programme || 'UG';
                // console.log(userProgramme)
            } catch (_) {}
        }
        return {
            headers: {
                Authorization: `Bearer ${token}`,
                'programme': userProgramme
            }
        };
    };

    // Fetch panels coordinated by this user
    const fetchPanels = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/panel-status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.hasPanel) {
                const panelList = Array.isArray(res.data.panels) ? res.data.panels : [res.data.panel];
                setPanels(panelList.filter(Boolean));
                if (panelList.length > 0) {
                    setSelectedPanelId(panelList[0]._id);
                }
            }
        } catch (error) {
            console.error('Error fetching panels', error);
        }
    };

    useEffect(() => {
        fetchPanels();
    }, []);

    useEffect(() => {
        if (selectedPanelId !== undefined) {
            fetchSettings(selectedPanelId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPanelId]);

    const fetchSettings = async (panelId) => {
        setLoading(true);
        try {
            const config = getRequestConfig();
            const url = panelId
                ? `${SERVER_API_KEY}/api/materials/settings?panelId=${panelId}`
                : `${SERVER_API_KEY}/api/materials/settings`;
            const res = await axios.get(url, config);
            setSettings(res.data);
        } catch (error) {
            console.error('Error fetching settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        setSettings([...settings, { _id: 'new', name: '', fileType: ['pdf'], isRequired: true }]);
        setEditingId('new');
        setEditData({ name: '', fileType: ['pdf'], isRequired: true });
    };

    const handleEdit = (setting) => {
        setEditingId(setting._id);
        setEditData({
            name: setting.name,
            fileType: Array.isArray(setting.fileType) ? [...setting.fileType] : ['pdf'],
            isRequired: setting.isRequired
        });
    };

    const handleCancel = () => {
        if (editingId === 'new') {
            setSettings(settings.filter(s => s._id !== 'new'));
        }
        setEditingId(null);
    };

    // Toggle a file type in the multi-select array
    const toggleFileType = (value) => {
        setEditData(prev => {
            const current = prev.fileType || [];
            if (current.includes(value)) {
                return { ...prev, fileType: current.filter(t => t !== value) };
            } else {
                return { ...prev, fileType: [...current, value] };
            }
        });
    };

    const handleSave = async (id) => {
        if (!editData.name.trim()) {
            alert('Please enter a name for this requirement.');
            return;
        }
        if (!editData.fileType || editData.fileType.length === 0) {
            alert('Please select at least one file type.');
            return;
        }
        try {
            const config = getRequestConfig();
            const payload = {
                ...editData,
                panelId: selectedPanelId || undefined
            };
            if (id === 'new') {
                const res = await axios.post(`${SERVER_API_KEY}/api/materials/settings`, payload, config);
                setSettings(settings.map(s => s._id === 'new' ? res.data : s));
            } else {
                const res = await axios.put(`${SERVER_API_KEY}/api/materials/settings/${id}`, payload, config);
                setSettings(settings.map(s => s._id === id ? res.data : s));
            }
            setEditingId(null);
        } catch (error) {
            console.error('Error saving setting', error);
            alert('Error saving setting');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this requirement? All related student uploads will be removed.')) return;
        try {
            await axios.delete(`${SERVER_API_KEY}/api/materials/settings/${id}`, getRequestConfig());
            setSettings(settings.filter(s => s._id !== id));
        } catch (error) {
            console.error('Error deleting setting', error);
            alert('Error deleting setting');
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold mb-1">Material Request Settings</h2>
            <p className="mb-4 text-gray-500 text-sm">Specify the documents you require from teams in your panel.</p>

            {/* Panel Selector */}
            {panels.length > 1 && (
                <div className="mb-5 flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700">Panel:</label>
                    <select
                        id="panel-selector"
                        value={selectedPanelId}
                        onChange={(e) => setSelectedPanelId(e.target.value)}
                        className="border rounded-md px-3 py-1.5 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    >
                        {panels.map(p => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                    </select>
                    <span className="text-xs text-gray-400">(Settings below are specific to the selected panel)</span>
                </div>
            )}
            {panels.length === 1 && (
                <div className="mb-4 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded">
                    🏛️ Settings for panel: <strong>{panels[0].name}</strong>
                </div>
            )}

            {loading ? (
                <div className="text-gray-500 text-sm py-4">Loading...</div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Document Name</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/2">Allowed File Types</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/8">Required</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/8">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {settings.map((setting) => (
                                    <tr key={setting._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-4 align-top">
                                            {editingId === setting._id ? (
                                                <input
                                                    type="text"
                                                    value={editData.name}
                                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                    placeholder="e.g. Project Report"
                                                    className="border rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none w-full"
                                                />
                                            ) : (
                                                <span className="font-medium text-gray-800">{setting.name}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            {editingId === setting._id ? (
                                                <div className="grid grid-cols-2 gap-2 max-w-md bg-gray-50 p-3 rounded-md border border-gray-200">
                                                    {FILE_TYPE_OPTIONS.map((option) => {
                                                        const isChecked = editData.fileType.includes(option.value);
                                                        return (
                                                            <label 
                                                                key={option.value} 
                                                                className={`flex items-center space-x-2 p-1.5 rounded border text-xs cursor-pointer transition-colors ${
                                                                    isChecked 
                                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' 
                                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => toggleFileType(option.value)}
                                                                    className="h-3.5 w-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-400"
                                                                />
                                                                <span>{option.label}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {(Array.isArray(setting.fileType) ? setting.fileType : [setting.fileType]).map(t => (
                                                        <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100">
                                                            .{t}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            {editingId === setting._id ? (
                                                <label className="flex items-center gap-2 cursor-pointer mt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={editData.isRequired}
                                                        onChange={(e) => setEditData({ ...editData, isRequired: e.target.checked })}
                                                        className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-400"
                                                    />
                                                    <span className="text-xs text-gray-600">Required</span>
                                                </label>
                                            ) : (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${setting.isRequired ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {setting.isRequired ? 'Yes' : 'No'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            {editingId === setting._id ? (
                                                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                                                    <button
                                                        onClick={() => handleSave(setting._id)}
                                                        className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1.5 rounded transition-colors"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancel}
                                                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(setting)}
                                                        className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-3 py-1.5 rounded transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(setting._id)}
                                                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-1.5 rounded transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {settings.length === 0 && editingId !== 'new' && (
                                    <tr>
                                        <td colSpan="4" className="px-5 py-8 text-center text-gray-400 italic text-sm">
                                            No material requirements set yet. Click "Add Requirement" to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4">
                        <button
                            id="add-material-requirement"
                            onClick={handleAddRow}
                            disabled={editingId === 'new'}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            + Add Requirement
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default MaterialSettings;