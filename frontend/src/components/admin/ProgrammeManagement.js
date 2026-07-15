import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

const ProgrammeManagement = () => {
    const [programmes, setProgrammes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [newName, setNewName] = useState('');
    const [csvFileName, setCsvFileName] = useState('');

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchProgrammes();
    }, []);

    useEffect(() => {
        if (message && messageType === 'success') {
            const t = setTimeout(() => setMessage(''), 4000);
            return () => clearTimeout(t);
        }
    }, [message, messageType]);

    const fetchProgrammes = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${SERVER_API_KEY}/api/programmes`, { headers });
            setProgrammes(res.data || []);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Error fetching programmes');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const csv = 'programme_name\nM.E. Big Data\nM.E. Data Science\nM.Tech. AI';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'programmes_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCsvChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const csv = ev.target.result.replace(/^\uFEFF/, '');
            const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
            // Skip header row if it matches typical headers
            const headerPatterns = /^(programme_name|name|programme)$/i;
            const names = lines.filter(l => !headerPatterns.test(l));
            if (names.length === 0) {
                setMessage('No valid programme names found in CSV');
                setMessageType('error');
                return;
            }
            try {
                setLoading(true);
                const res = await axios.post(`${SERVER_API_KEY}/api/programmes/bulk`, { names }, { headers });
                setMessage(res.data.message);
                setMessageType('success');
                await fetchProgrammes();
            } catch (err) {
                setMessage(err.response?.data?.message || 'Error uploading CSV');
                setMessageType('error');
            } finally {
                setLoading(false);
                e.target.value = '';
                setCsvFileName('');
            }
        };
        reader.readAsText(file);
    };

    const addProgramme = async () => {
        if (!newName.trim()) {
            setMessage('Programme name cannot be empty');
            setMessageType('error');
            return;
        }
        try {
            setLoading(true);
            const res = await axios.post(`${SERVER_API_KEY}/api/programmes`, { name: newName.trim() }, { headers });
            setMessage(res.data.message);
            setMessageType('success');
            setNewName('');
            await fetchProgrammes();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Error adding programme');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (pg) => {
        setEditingId(pg._id);
        setEditingName(pg.name);
    };

    const saveEdit = async () => {
        if (!editingName.trim()) {
            setMessage('Name cannot be empty');
            setMessageType('error');
            return;
        }
        try {
            setLoading(true);
            const res = await axios.put(`${SERVER_API_KEY}/api/programmes/${editingId}`, { name: editingName.trim() }, { headers });
            setMessage(res.data.message);
            setMessageType('success');
            setEditingId(null);
            setEditingName('');
            await fetchProgrammes();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Error updating programme');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const deleteProgramme = async (id, name) => {
        if (!window.confirm(`Delete programme "${name}"? This will NOT delete students already uploaded for it.`)) return;
        try {
            setLoading(true);
            const res = await axios.delete(`${SERVER_API_KEY}/api/programmes/${id}`, { headers });
            setMessage(res.data.message);
            setMessageType('success');
            await fetchProgrammes();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Error deleting programme');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-2">PG Programme Management</h2>
            <p className="text-gray-500 text-sm mb-6">
                Manage the list of PG programmes. Each programme will appear as a separate dashboard button on the admin home page.
            </p>

            {message && (
                <div className={`mb-4 p-3 rounded ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}

            {/* CSV Upload */}
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <h3 className="text-lg font-semibold mb-3 text-indigo-700">CSV Upload</h3>
                <div className="flex flex-wrap gap-3 items-center">
                    <button
                        onClick={downloadTemplate}
                        className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 text-sm"
                    >
                        Download Template
                    </button>
                    <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50">
                        {csvFileName || 'Choose CSV File'}
                        <input type="file" accept=".csv" onChange={handleCsvChange} className="hidden" />
                    </label>
                    {csvFileName && <span className="text-xs text-gray-500 italic">File: {csvFileName}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-2">CSV must have a column named <code>programme_name</code> with one programme per row.</p>
            </div>

            {/* Manual Add */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Add Programme Manually</h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addProgramme()}
                        placeholder="e.g. M.E. Big Data"
                        className="border border-gray-300 rounded px-3 py-2 flex-1 max-w-xs"
                    />
                    <button
                        onClick={addProgramme}
                        disabled={loading}
                        className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Programmes Table */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">Programmes ({programmes.length})</h3>
                    <button onClick={fetchProgrammes} className="text-sm text-indigo-600 hover:underline">
                        Refresh
                    </button>
                </div>
                {loading ? (
                    <div className="text-gray-400 text-sm animate-pulse">Loading…</div>
                ) : programmes.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 border border-dashed rounded">
                        No PG programmes added yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 rounded">
                            <thead>
                                <tr className="bg-gray-50 text-left text-sm font-semibold text-gray-600">
                                    <th className="border px-4 py-2">#</th>
                                    <th className="border px-4 py-2">Programme Name</th>
                                    <th className="border px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {programmes.map((pg, i) => (
                                    <tr key={pg._id} className="hover:bg-gray-50">
                                        <td className="border px-4 py-2 text-gray-500 text-sm">{i + 1}</td>
                                        <td className="border px-4 py-2">
                                            {editingId === pg._id ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                                    className="border border-indigo-400 rounded px-2 py-1 w-full"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="font-medium">{pg.name}</span>
                                            )}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {editingId === pg._id ? (
                                                <div className="flex gap-2">
                                                    <button onClick={saveEdit} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Save</button>
                                                    <button onClick={() => { setEditingId(null); setEditingName(''); }} className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">Cancel</button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button onClick={() => startEdit(pg)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">Edit</button>
                                                    <button onClick={() => deleteProgramme(pg._id, pg.name)} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Delete</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgrammeManagement;
