import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

const GuideTeamLimitsSettings = () => {
    const { programmeName } = useParams();
    const decodedProgramme = decodeURIComponent(programmeName || 'UG');
    const programmeType = decodedProgramme === 'UG' ? 'UG' : 'PG';

    const [designationLimits, setDesignationLimits] = useState([]);
    const [editingLimitIndex, setEditingLimitIndex] = useState(null);
    const [newLimit, setNewLimit] = useState({ designation: '', teamLimit: '' });
    const [limitsSaved, setLimitsSaved] = useState(true);
    const [showLimitsPanel, setShowLimitsPanel] = useState(true);
    const [loading, setLoading] = useState(false);
    const [limitMessage, setLimitMessage] = useState('');
    const [limitMessageType, setLimitMessageType] = useState('');
    const [limitCsvFileName, setLimitCsvFileName] = useState('');

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchDesignationLimits();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [programmeName]);

    // Auto-dismiss messages
    useEffect(() => {
        if (limitMessage && limitMessageType === 'success') {
            const timer = setTimeout(() => {
                setLimitMessage('');
                setLimitMessageType('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [limitMessage, limitMessageType]);

    const teamLimitTemplate = [
        'designation,team_limit',
        'Assistant Professor,3',
        'Associate Professor,4',
        'Professor,5'
    ];

    const mergeDesignationLimits = (existing, incoming) => {
        const map = new Map();
        existing.forEach((row) => {
            const designation = String(row.designation || '').trim();
            const teamLimit = Number(row.teamLimit ?? row.team_limit);
            if (designation && !Number.isNaN(teamLimit)) {
                map.set(designation.toLowerCase(), { designation, teamLimit });
            }
        });

        incoming.forEach((row) => {
            const designation = String(row.designation || '').trim();
            const teamLimit = Number(row.teamLimit ?? row.team_limit);
            if (designation && !Number.isNaN(teamLimit)) {
                map.set(designation.toLowerCase(), { designation, teamLimit });
            }
        });

        return Array.from(map.values()).sort((a, b) => a.designation.localeCompare(b.designation));
    };

    const handleTeamLimitFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLimitCsvFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const csv = event.target.result.replace(/^\uFEFF/, '');
            const lines = csv.split('\n');
            const headersArr = lines[0].split(',').map((header) => header.trim().toLowerCase());
            const parsedRows = [];
            const skippedDesignations = [];

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;

                const values = lines[i].split(',').map((value) => value.trim());
                const row = {};
                headersArr.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                const limitVal = Number(row.team_limit ?? row.teamlimit ?? row['team limit']);
                const designationName = (row.designation || '').trim();

                if (Number.isNaN(limitVal) || limitVal < 1 || !Number.isInteger(limitVal)) {
                    skippedDesignations.push(designationName || `Row ${i + 1}`);
                } else {
                    parsedRows.push({
                        designation: designationName,
                        teamLimit: limitVal
                    });
                }
            }

            if (parsedRows.length > 0) {
                setDesignationLimits((prev) => mergeDesignationLimits(prev, parsedRows));
                setLimitsSaved(false);
            }

            if (skippedDesignations.length > 0) {
                setLimitMessage(`CSV parsed: skipped designations [${skippedDesignations.join(', ')}] due to invalid limits. Click Save to persist.`);
                setLimitMessageType('error');
            } else {
                setLimitMessage(`CSV "${file.name}" parsed successfully (${parsedRows.length} rows loaded). Click Save to persist.`);
                setLimitMessageType('success');
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    const fetchDesignationLimits = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${SERVER_API_KEY}/api/admin/designation-team-limits?programmeType=${programmeType}`, { headers });
            const limits = response.data.map((item) => ({
                designation: item.designation,
                teamLimit: item.teamLimit
            }));
            setDesignationLimits(limits);
            setLimitsSaved(true);
            setLimitMessage('');
            setLimitMessageType('');
        } catch (error) {
            setLimitMessage(error.response?.data?.message || 'Error fetching designation team limits');
            setLimitMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const deleteAllDesignationLimits = async () => {
        if (!window.confirm(`Are you sure you want to delete all designation team limits for ${programmeType}?`)) {
            return;
        }
        setLoading(true);
        setLimitMessage('');
        setLimitMessageType('');
        try {
            await axios.delete(`${SERVER_API_KEY}/api/admin/designation-team-limits/all?programmeType=${programmeType}`, { headers });
            setDesignationLimits([]);
            setLimitMessage('All designation team limits deleted successfully.');
            setLimitMessageType('success');
            setLimitsSaved(true);
        } catch (error) {
            setLimitMessage(error.response?.data?.message || 'Error deleting all designation team limits');
            setLimitMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const saveDesignationLimits = async () => {
        if (designationLimits.length === 0) {
            setLimitMessage('Add at least one designation team limit before saving');
            setLimitMessageType('error');
            return;
        }

        const invalidRow = designationLimits.find(
            (item) => !item.designation.trim() || Number.isNaN(Number(item.teamLimit)) || Number(item.teamLimit) < 1 || !Number.isInteger(Number(item.teamLimit))
        );

        if (invalidRow) {
            setLimitMessage('Each row must have a designation and a valid team limit starting from 1');
            setLimitMessageType('error');
            return;
        }

        setLoading(true);
        try {
            const payload = designationLimits.map((item) => ({
                designation: item.designation.trim(),
                teamLimit: Number(item.teamLimit)
            }));

            await axios.post(`${SERVER_API_KEY}/api/admin/designation-team-limits`, { limits: payload, programmeType }, { headers });
            setLimitsSaved(true);
            setLimitMessage('Designation team limits saved successfully');
            setLimitMessageType('success');
            await fetchDesignationLimits();
        } catch (error) {
            setLimitMessage(error.response?.data?.message || 'Error saving designation team limits');
            setLimitMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const addDesignationLimitRow = () => {
        const designation = newLimit.designation.trim();
        const teamLimit = Number(newLimit.teamLimit);

        if (!designation || Number.isNaN(teamLimit) || teamLimit < 1 || !Number.isInteger(teamLimit)) {
            setLimitMessage('Enter a valid designation and team limit starting from 1');
            setLimitMessageType('error');
            return;
        }

        setDesignationLimits((prev) => mergeDesignationLimits(prev, [{ designation, teamLimit }]));
        setNewLimit({ designation: '', teamLimit: '' });
        setLimitsSaved(false);
        setLimitMessage('');
        setLimitMessageType('');
    };

    const deleteDesignationLimitRow = async (index) => {
        const row = designationLimits[index];
        if (!row) return;

        if (limitsSaved) {
            setLoading(true);
            try {
                await axios.delete(`${SERVER_API_KEY}/api/admin/designation-team-limits/${encodeURIComponent(row.designation)}?programmeType=${programmeType}`, { headers });
                setDesignationLimits((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
                setLimitMessage('Designation team limit deleted successfully');
                setLimitMessageType('success');
            } catch (error) {
                setLimitMessage(error.response?.data?.message || 'Error deleting designation team limit');
                setLimitMessageType('error');
            } finally {
                setLoading(false);
            }
            return;
        }

        setDesignationLimits((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    };

    const downloadTemplate = () => {
        const csvContent = teamLimitTemplate.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team_limit_template_${programmeType.toLowerCase()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold text-slate-800">
                    Guide Team Limit Management ({programmeType})
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                    Set the maximum number of teams a guide of a specific designation can supervise for {programmeType} projects.
                </p>
            </div>

            {limitMessage && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${limitMessageType === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-rose-100 bg-rose-50 text-rose-800'}`}>
                    <span className="text-lg">{limitMessageType === 'success' ? '✅' : '⚠️'}</span>
                    <p className="text-sm font-medium">{limitMessage}</p>
                </div>
            )}

            <div className="flex flex-wrap gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <button
                    onClick={downloadTemplate}
                    className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors"
                >
                    Download CSV Template
                </button>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700">Upload Limits CSV:</label>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleTeamLimitFileChange}
                        className="text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="text"
                    value={newLimit.designation}
                    onChange={(e) => setNewLimit({ ...newLimit, designation: e.target.value })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                    placeholder="Designation (e.g. Professor)"
                />
                <input
                    type="number"
                    min="1"
                    value={newLimit.teamLimit}
                    onChange={(e) => setNewLimit({ ...newLimit, teamLimit: e.target.value })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28"
                    placeholder="Max Teams"
                />
                <button
                    onClick={addDesignationLimitRow}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                    Add / Update Limit
                </button>
                <button
                    onClick={saveDesignationLimits}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors shadow"
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                    onClick={deleteAllDesignationLimits}
                    className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors"
                >
                    Delete All Limits
                </button>
            </div>

            {showLimitsPanel && (
                <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
                    {designationLimits.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm font-medium bg-white">
                            No designation limits set for {programmeType}. Use the fields above or upload a CSV to set limits.
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-100 bg-white">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Designation</th>
                                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Max Teams</th>
                                    <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {designationLimits.map((limit, index) => (
                                    <tr key={`${limit.designation}-${index}`} className="hover:bg-slate-50/50">
                                        <td className="py-3 px-4 text-sm font-semibold text-slate-700">
                                            {editingLimitIndex === index ? (
                                                <input
                                                    type="text"
                                                    value={limit.designation}
                                                    onChange={(e) => {
                                                        const updated = [...designationLimits];
                                                        updated[index].designation = e.target.value;
                                                        setDesignationLimits(updated);
                                                        setLimitsSaved(false);
                                                    }}
                                                    className="w-full px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                limit.designation
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-600 font-semibold">
                                            {editingLimitIndex === index ? (
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={limit.teamLimit}
                                                    onChange={(e) => {
                                                        const updated = [...designationLimits];
                                                        updated[index].teamLimit = e.target.value;
                                                        setDesignationLimits(updated);
                                                        setLimitsSaved(false);
                                                    }}
                                                    className="w-24 px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                limit.teamLimit
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            {editingLimitIndex === index ? (
                                                <button
                                                    onClick={() => setEditingLimitIndex(null)}
                                                    className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md font-semibold text-xs hover:bg-emerald-200 transition-colors mr-2"
                                                >
                                                    Save
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setEditingLimitIndex(index)}
                                                        className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md font-semibold text-xs hover:bg-blue-100 transition-colors mr-2"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteDesignationLimitRow(index)}
                                                        className="bg-rose-50 text-rose-700 px-3 py-1 rounded-md font-semibold text-xs hover:bg-rose-100 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default GuideTeamLimitsSettings;
