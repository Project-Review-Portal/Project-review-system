import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const MaterialSettings = () => {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ name: '', fileType: '', isRequired: true });

    // Helper to dynamically compile authorization and programme headers
    const getRequestConfig = () => {
        const token = localStorage.getItem('token');
        const rawUser = localStorage.getItem('user');
            let userProgramme = 'UG'; 

            if (rawUser) {
                try {
                    const storedUser = JSON.parse(rawUser);
                    console.log(storedUser.programme , storedUser.user?.programme , 'UG');
                    userProgramme = storedUser.programme || storedUser.user?.programme || 'UG';
                } catch (_) {}
            }
        return {
            headers: { 
                Authorization: `Bearer ${token}`,
                'programme': userProgramme 
            }
        };
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${SERVER_API_KEY}/api/materials/settings`, getRequestConfig());
            setSettings(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching settings', error);
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        setSettings([...settings, { _id: 'new', name: '', fileType: 'pdf', isRequired: true }]);
        setEditingId('new');
        setEditData({ name: '', fileType: 'pdf', isRequired: true });
    };

    const handleEdit = (setting) => {
        setEditingId(setting._id);
        setEditData({ name: setting.name, fileType: setting.fileType, isRequired: setting.isRequired });
    };

    const handleCancel = () => {
        if (editingId === 'new') {
            setSettings(settings.filter(s => s._id !== 'new'));
        }
        setEditingId(null);
    };

    const handleSave = async (id) => {
        try {
            const config = getRequestConfig();
            if (id === 'new') {
                const res = await axios.post(`${SERVER_API_KEY}/api/materials/settings`, editData, config);
                setSettings(settings.map(s => s._id === 'new' ? res.data : s));
            } else {
                const res = await axios.put(`${SERVER_API_KEY}/api/materials/settings/${id}`, editData, config);
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

    if (loading) return <div>Loading...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Material Request Settings</h2>
            <p className="mb-4 text-gray-600">Specify the materials you require from the teams you coordinate.</p>
            
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type (e.g. pdf, zip)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {settings.map((setting) => (
                        <tr key={setting._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {editingId === setting._id ? (
                                    <input 
                                        type="text" 
                                        value={editData.name} 
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })} 
                                        className="border rounded p-1" 
                                    />
                                ) : (
                                    setting.name
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {editingId === setting._id ? (
                                    <input 
                                        type="text" 
                                        value={editData.fileType} 
                                        onChange={(e) => setEditData({ ...editData, fileType: e.target.value })} 
                                        className="border rounded p-1 w-20" 
                                    />
                                ) : (
                                    setting.fileType
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {editingId === setting._id ? (
                                    <input 
                                        type="checkbox" 
                                        checked={editData.isRequired} 
                                        onChange={(e) => setEditData({ ...editData, isRequired: e.target.checked })} 
                                        className="h-4 w-4 text-indigo-600" 
                                    />
                                ) : (
                                    setting.isRequired ? 'Yes' : 'No'
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap space-x-2">
                                {editingId === setting._id ? (
                                    <>
                                        <button onClick={() => handleSave(setting._id)} className="text-green-600 hover:text-green-900">Save</button>
                                        <button onClick={handleCancel} className="text-gray-600 hover:text-gray-900">Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleEdit(setting)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                        <button onClick={() => handleDelete(setting._id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                    {settings.length === 0 && editingId !== 'new' && (
                        <tr>
                            <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No materials required yet.</td>
                        </tr>
                    )}
                </tbody>
            </table>
            
            <div className="mt-4">
                <button 
                    onClick={handleAddRow} 
                    disabled={editingId === 'new'}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
                >
                    Add Requirement
                </button>
            </div>
        </div>
    );
};

export default MaterialSettings;