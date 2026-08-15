import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../../utils/toast';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const CoordinatorRegistration = () => {
    const [facultyFile, setFacultyFile] = useState(null);
    const [facultyData, setFacultyData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingFaculty, setEditingFaculty] = useState(null); // stores index
    const [newFaculty, setNewFaculty] = useState({
        seniority: '',
        name: '',
        email_id: '',
        affiliation: '',
        contactNumber: '',
        memberType: 'external'
    });
    const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, id: '', data: null });

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchFacultyList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchFacultyList = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${SERVER_API_KEY}/api/admin/faculty-list?includeExternal=true`, { headers });
            const mapped = response.data
                .filter(f => f.memberType === 'external')
                .map(f => ({
                    seniority: f.seniority || '',
                    email_id: f.email || f.username || '',
                    name: f.name,
                    designation: '',
                    affiliation: f.affiliation || '',
                    contactNumber: f.contactNumber || '',
                    memberType: 'external'
                }));
            setFacultyData(mapped);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error fetching external faculty list');
        } finally {
            setLoading(false);
        }
    };

    const handleManualFacultySubmit = async () => {
        if (!newFaculty.name || !newFaculty.email_id || !newFaculty.affiliation || !newFaculty.contactNumber) {
            toast.error('All fields (Name, Email ID, Affiliation, and Contact Number) are required.');
            return;
        }

        setLoading(true);
        try {
            const payload = [{
                username: newFaculty.email_id,
                email_id: newFaculty.email_id,
                name: newFaculty.name,
                designation: '',
                affiliation: newFaculty.affiliation,
                contactNumber: newFaculty.contactNumber,
                memberType: 'external',
                seniority: newFaculty.seniority ? Number(newFaculty.seniority) : null
            }];

            await axios.post(`${SERVER_API_KEY}/api/admin/upload-faculty`, { facultyData: payload }, { headers });
            toast.success('External faculty member added successfully!');
            
            // Reset manual entry form
            setNewFaculty({
                seniority: '',
                name: '',
                email_id: '',
                affiliation: '',
                contactNumber: '',
                memberType: 'external'
            });

            await fetchFacultyList();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error registering faculty member');
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const template = [
            'seniority,name,email_id,affiliation,contactNumber',
            '1,Dr. Jane Smith,jane.smith@univ.edu,MIT Chennai,9876543210',
            '2,Dr. Alice Brown,alice.brown@expert.com,Industry Expert Ltd,9123456789'
        ];
        const csvContent = template.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `external_faculty_template.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleFileUpload = (file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const fileHeaders = lines[0].split(',').map(h => h.trim());
            const data = [];

            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    const values = lines[i].split(',').map(v => v.trim());
                    const row = {};
                    fileHeaders.forEach((header, index) => {
                        row[header] = values[index] || '';
                    });
                    data.push({
                        seniority: row.seniority || '',
                        name: row.name || '',
                        email_id: row.email_id || row.email || '',
                        affiliation: row.affiliation || '',
                        contactNumber: row.contactNumber || '',
                        memberType: 'external',
                        designation: ''
                    });
                }
            }
            setFacultyData(data);
            toast.success(`CSV parsed: ${data.length} rows loaded. Click Upload to save.`);
        };
        reader.readAsText(file);
    };

    const handleFacultyFileChange = (e) => {
        const file = e.target.files[0];
        setFacultyFile(file);
        handleFileUpload(file);
    };

    const uploadFaculty = async () => {
        if (facultyData.length === 0) {
            toast.error('Please upload an external faculty CSV file first');
            return;
        }

        setLoading(true);
        try {
            const payload = facultyData.map(f => ({ ...f, username: f.email_id }));
            const response = await axios.post(`${SERVER_API_KEY}/api/admin/upload-faculty`, { facultyData: payload }, { headers });
            toast.success(`Successfully uploaded ${response.data.count} external faculty members`);
            await fetchFacultyList();
            setFacultyFile(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error uploading external faculty data');
        } finally {
            setLoading(false);
        }
    };

    const updateFaculty = async (index) => {
        setLoading(true);
        try {
            await axios.put(`${SERVER_API_KEY}/api/admin/update-faculty/${facultyData[index].email_id}`, 
                facultyData[index], { headers });
            toast.success('External faculty member updated successfully');
            setEditingFaculty(null);
            await fetchFacultyList();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating faculty member');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestDeleteFaculty = async (emailId) => {
        setLoading(true);
        try {
            const res = await axios.get(`${SERVER_API_KEY}/api/admin/check-faculty-deletion/${emailId}`, { headers });
            setDeleteConfirmModal({
                show: true,
                id: emailId,
                data: res.data
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error checking faculty member status');
        } finally {
            setLoading(false);
        }
    };

    const executeDeleteUser = async () => {
        const { id } = deleteConfirmModal;
        setDeleteConfirmModal({ show: false, id: '', data: null });
        setLoading(true);
        try {
            await axios.delete(`${SERVER_API_KEY}/api/admin/delete-faculty/${id}`, { headers });
            setFacultyData(facultyData.filter(f => f.email_id !== id));
            toast.success('External faculty member deleted successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || `Error deleting faculty member`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">External Faculty Registration</h2>

            {/* Manual and bulk registration forms */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Bulk upload form */}
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-slate-700">Bulk Upload External Faculty (CSV)</h3>
                    <div>
                        <button
                            onClick={downloadTemplate}
                            className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded text-xs font-semibold hover:bg-indigo-200 transition"
                        >
                            Download CSV Template
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFacultyFileChange}
                            className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        {facultyFile && (
                            <button
                                onClick={uploadFaculty}
                                disabled={loading}
                                className="bg-indigo-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
                            >
                                {loading ? 'Uploading...' : 'Upload Faculty'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Manual Register Form */}
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-slate-700">Manual Registration</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Seniority/S.No.</label>
                            <input
                                type="number"
                                value={newFaculty.seniority}
                                onChange={(e) => setNewFaculty({ ...newFaculty, seniority: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="e.g. 1 (Optional)"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
                            <input
                                type="text"
                                value={newFaculty.name}
                                onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="e.g. Dr. Jane Smith"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Email ID</label>
                            <input
                                type="email"
                                value={newFaculty.email_id}
                                onChange={(e) => setNewFaculty({ ...newFaculty, email_id: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="e.g. jane.smith@univ.edu"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Affiliation</label>
                            <input
                                type="text"
                                value={newFaculty.affiliation}
                                onChange={(e) => setNewFaculty({ ...newFaculty, affiliation: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="e.g. MIT, Chennai"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Number</label>
                            <input
                                type="text"
                                value={newFaculty.contactNumber}
                                onChange={(e) => setNewFaculty({ ...newFaculty, contactNumber: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="e.g. 9876543210"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleManualFacultySubmit}
                            disabled={loading || !newFaculty.name || !newFaculty.email_id || !newFaculty.affiliation || !newFaculty.contactNumber}
                            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
                        >
                            Add External Faculty
                        </button>
                    </div>
                </div>
            </div>

            {/* External Faculty Table */}
            <div>
                <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-semibold">Registered External Faculty</span>
                </h3>
                {facultyData.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm border border-dashed rounded-lg">
                        No external faculty members registered yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto border rounded-lg shadow-sm">
                        <table className="min-w-full divide-y divide-slate-100 bg-white">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 text-left text-xs font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3 text-center w-16">S.No.</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Affiliation</th>
                                    <th className="px-4 py-3">Contact No.</th>
                                    <th className="px-4 py-3 text-center w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {facultyData.map((faculty, index) => (
                                    <tr key={index} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-center font-medium">
                                            {editingFaculty === index ? (
                                                <input
                                                    type="number"
                                                    value={faculty.seniority || ''}
                                                    onChange={(e) => {
                                                        const nd = [...facultyData];
                                                        nd[index].seniority = e.target.value;
                                                        setFacultyData(nd);
                                                    }}
                                                    className="w-16 px-1.5 py-1 border rounded text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : (faculty.seniority || '—')}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-500">{faculty.email_id}</td>
                                        <td className="px-4 py-3 font-semibold">
                                            {editingFaculty === index ? (
                                                <input
                                                    type="text"
                                                    value={faculty.name}
                                                    onChange={(e) => {
                                                        const nd = [...facultyData];
                                                        nd[index].name = e.target.value;
                                                        setFacultyData(nd);
                                                    }}
                                                    className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : faculty.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingFaculty === index ? (
                                                <input
                                                    type="text"
                                                    value={faculty.affiliation || ''}
                                                    onChange={(e) => {
                                                        const nd = [...facultyData];
                                                        nd[index].affiliation = e.target.value;
                                                        setFacultyData(nd);
                                                    }}
                                                    className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : (faculty.affiliation || <span className="text-slate-400 italic">none</span>)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingFaculty === index ? (
                                                <input
                                                    type="text"
                                                    value={faculty.contactNumber || ''}
                                                    onChange={(e) => {
                                                        const nd = [...facultyData];
                                                        nd[index].contactNumber = e.target.value;
                                                        setFacultyData(nd);
                                                    }}
                                                    className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : (faculty.contactNumber || <span className="text-slate-400 italic">none</span>)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {editingFaculty === index ? (
                                                <div className="flex gap-1.5 justify-center">
                                                    <button
                                                        onClick={() => updateFaculty(index)}
                                                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingFaculty(null)}
                                                        className="bg-slate-400 hover:bg-slate-500 text-white px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1.5 justify-center">
                                                    <button
                                                        onClick={() => setEditingFaculty(index)}
                                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-semibold text-[10px]"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleRequestDeleteFaculty(faculty.email_id)}
                                                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded font-semibold text-[10px]"
                                                    >
                                                        Delete
                                                    </button>
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

            {/* Cascading Deletion Warning Modal */}
            {deleteConfirmModal.show && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-rose-600">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h3 className="text-lg font-extrabold tracking-tight">Warning: Deletion Cascade</h3>
                        </div>
                        
                        <div className="text-slate-600 text-xs leading-relaxed space-y-2">
                            <p>
                                You are about to delete external faculty member <b>{deleteConfirmModal.data?.facultyName}</b>.
                            </p>
                            <p className="text-rose-500 font-semibold">
                                This action is permanent and will cascade across all connected records:
                            </p>
                            <ul className="list-disc pl-4 space-y-1.5">
                                <li>
                                    <b>{deleteConfirmModal.data?.guidedTeamsCount || 0}</b> teams where they are the assigned Guide will lose their guide mapping.
                                </li>
                                {deleteConfirmModal.data?.isCoordinator && (
                                    <li className="text-rose-600 font-bold">
                                        They coordinate panels (<b>{deleteConfirmModal.data?.coordinatedPanels?.join(', ')}</b>). Deleting them will completely disband these panels and clear all review schedules.
                                    </li>
                                )}
                                {deleteConfirmModal.data?.isMemberOrAssist && (
                                    <li>
                                        They will be removed from panel memberships in: <b>{deleteConfirmModal.data?.memberOrAssistPanels?.join(', ')}</b>.
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t">
                            <button
                                onClick={() => setDeleteConfirmModal({ show: false, id: '', data: null })}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDeleteUser}
                                className="px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
                            >
                                Proceed with Deletion
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoordinatorRegistration;
