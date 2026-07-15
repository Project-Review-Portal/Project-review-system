import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

const UserManagement = ({ programme, globalOnly, studentsOnly }) => {
    const [facultyFile, setFacultyFile] = useState(null);
    const [studentFile, setStudentFile] = useState(null);
    const [facultyData, setFacultyData] = useState([]);
    const [studentData, setStudentData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [editingFaculty, setEditingFaculty] = useState(null);
    const [editingStudent, setEditingStudent] = useState(null);
    const [newFaculty, setNewFaculty] = useState({
        seniority: '',
        name: '',
        email_id: '',
        designation: '',
        memberType: 'internal'
    });

    const [designationLimits, setDesignationLimits] = useState([]);
    const [editingLimitIndex, setEditingLimitIndex] = useState(null);
    const [newLimit, setNewLimit] = useState({ designation: '', ugLimit: '', pgLimit: '' });
    const [limitsSaved, setLimitsSaved] = useState(true);
    const [showLimitsPanel, setShowLimitsPanel] = useState(false);
    const [limitMessage, setLimitMessage] = useState('');
    const [limitMessageType, setLimitMessageType] = useState('');
    const [limitCsvFileName, setLimitCsvFileName] = useState('');

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // Auto-fetch saved designation limits on mount so CSV/manual entries merge against DB state
    useEffect(() => {
        const fetchLimitsOnMount = async () => {
            try {
                const response = await axios.get(`${SERVER_API_KEY}/api/admin/designation-team-limits`, { headers });
                const limits = response.data.map((item) => ({
                    designation: item.designation,
                    ugLimit: item.ugLimit,
                    pgLimit: item.pgLimit
                }));
                setDesignationLimits(limits);
            } catch (error) {
                // Silently fail on mount
            }
        };
        fetchLimitsOnMount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-dismiss general message (only success messages auto-dismiss)
    useEffect(() => {
        if (message && messageType === 'success') {
            const timer = setTimeout(() => {
                setMessage('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message, messageType]);

    // Auto-dismiss designation limit message (only success messages auto-dismiss)
    useEffect(() => {
        if (limitMessage && limitMessageType === 'success') {
            const timer = setTimeout(() => {
                setLimitMessage('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [limitMessage, limitMessageType]);

    // CSV Template structure (email-based login)
    const facultyTemplate = [
        'seniority,name,email_id,designation,memberType',
        '1,Dr. John Doe,john.doe@univ.edu,Assistant Professor,internal',
        '2,Dr. Jane Smith,jane.smith@univ.edu,Industry Expert,external'
    ];

    const studentTemplate = [
        'regno,name,email_id',
        '2021CS001,Alice Johnson,alice@univ.edu',
        '2021CS002,Bob Brown,bob@univ.edu'
    ];

    const teamLimitTemplate = [
        'designation,ug_limit,pg_limit',
        'Assistant Professor,3,2',
        'Associate Professor,4,3',
        'Professor,5,4'
    ];

    const handleManualFacultySubmit = async () => {
        if (!newFaculty.name || !newFaculty.email_id) {
            setMessage('Name and Email ID are required.');
            setMessageType('error');
            return;
        }

        setLoading(true);
        try {
            const payload = [{
                username: newFaculty.email_id,
                email_id: newFaculty.email_id,
                name: newFaculty.name,
                designation: newFaculty.designation || '',
                memberType: newFaculty.memberType,
                seniority: newFaculty.seniority ? Number(newFaculty.seniority) : null
            }];

            await axios.post(`${SERVER_API_KEY}/api/admin/upload-faculty`, { facultyData: payload }, { headers });
            setMessage('Faculty member added successfully!');
            setMessageType('success');
            
            // Reset manual entry form
            setNewFaculty({
                seniority: '',
                name: '',
                email_id: '',
                designation: '',
                memberType: 'internal'
            });

            await fetchFacultyList();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error registering faculty member');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = (type) => {
        const template = type === 'faculty' ? facultyTemplate : type === 'teamLimit' ? teamLimitTemplate : studentTemplate;
        const csvContent = template.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type === 'teamLimit' ? 'team_limit' : type}_template.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const mergeDesignationLimits = (existing, incoming) => {
        const map = new Map();

        existing.forEach((row) => {
            const designation = String(row.designation || '').trim();
            const ugLimit = Number(row.ugLimit ?? row.ug_limit);
            const pgLimit = Number(row.pgLimit ?? row.pg_limit);
            if (designation && !Number.isNaN(ugLimit) && !Number.isNaN(pgLimit)) {
                map.set(designation.toLowerCase(), { designation, ugLimit, pgLimit });
            }
        });

        incoming.forEach((row) => {
            const designation = String(row.designation || '').trim();
            const ugLimit = Number(row.ugLimit ?? row.ug_limit);
            const pgLimit = Number(row.pgLimit ?? row.pg_limit);
            if (designation && !Number.isNaN(ugLimit) && !Number.isNaN(pgLimit)) {
                map.set(designation.toLowerCase(), { designation, ugLimit, pgLimit });
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
            const csvHeaders = lines[0].split(',').map((header) => header.trim().toLowerCase());
            const parsedRows = [];
            const skippedDesignations = [];

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;

                const values = lines[i].split(',').map((value) => value.trim());
                const row = {};
                csvHeaders.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                const ugLimitVal = Number(row.ug_limit ?? row.uglimit ?? row['ug limit']);
                const pgLimitVal = Number(row.pg_limit ?? row.pglimit ?? row['pg limit']);
                const designationName = (row.designation || '').trim();

                if (Number.isNaN(ugLimitVal) || ugLimitVal < 1 || !Number.isInteger(ugLimitVal) ||
                    Number.isNaN(pgLimitVal) || pgLimitVal < 1 || !Number.isInteger(pgLimitVal)) {
                    skippedDesignations.push(designationName || `Row ${i + 1}`);
                } else {
                    parsedRows.push({
                        designation: designationName,
                        ugLimit: ugLimitVal,
                        pgLimit: pgLimitVal
                    });
                }
            }

           if (parsedRows.length > 0) {
               setDesignationLimits((prev) => mergeDesignationLimits(prev, parsedRows));
               setLimitsSaved(false);
               setShowLimitsPanel(true);
           }

            if (skippedDesignations.length > 0) {
                setLimitMessage(`CSV parsed: skipped designations [${skippedDesignations.join(', ')}] due to invalid limit. Other valid limits loaded. Click Save to persist.`);
                setLimitMessageType('error');
            } else {
                setLimitMessage(`CSV "${file.name}" parsed successfully (${parsedRows.length} rows loaded). Review the table and click Save to persist.`);
                setLimitMessageType('success');
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    const fetchDesignationLimits = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${SERVER_API_KEY}/api/admin/designation-team-limits`, { headers });
            const limits = response.data.map((item) => ({
                designation: item.designation,
                ugLimit: item.ugLimit,
                pgLimit: item.pgLimit
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

    const handleViewDesignationLimits = async () => {
        if (!showLimitsPanel) {
            await fetchDesignationLimits();
        }
        setShowLimitsPanel(prev => !prev);
    };

    const deleteAllDesignationLimits = async () => {
        if (!window.confirm("Are you sure you want to delete all designation team limits? This cannot be undone.")) {
            return;
        }
        setLoading(true);
        setLimitMessage('');
        setLimitMessageType('');
        try {
            await axios.delete(`${SERVER_API_KEY}/api/admin/designation-team-limits/all`, { headers });
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
            (item) => !item.designation.trim() || 
                      Number.isNaN(Number(item.ugLimit)) || Number(item.ugLimit) < 1 || !Number.isInteger(Number(item.ugLimit)) ||
                      Number.isNaN(Number(item.pgLimit)) || Number(item.pgLimit) < 1 || !Number.isInteger(Number(item.pgLimit))
        );

        if (invalidRow) {
            setLimitMessage('Each row must have a designation and valid UG/PG limits starting from 1');
            setLimitMessageType('error');
            return;
        }

        setLoading(true);
        try {
            const payload = designationLimits.map((item) => ({
                designation: item.designation.trim(),
                ugLimit: Number(item.ugLimit),
                pgLimit: Number(item.pgLimit)
            }));

            await axios.post(`${SERVER_API_KEY}/api/admin/designation-team-limits`, { limits: payload }, { headers });
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
        const ugLimit = Number(newLimit.ugLimit);
        const pgLimit = Number(newLimit.pgLimit);

        if (!designation || Number.isNaN(ugLimit) || ugLimit < 1 || !Number.isInteger(ugLimit) ||
            Number.isNaN(pgLimit) || pgLimit < 1 || !Number.isInteger(pgLimit)) {
            setLimitMessage('Enter a valid designation and UG/PG limits starting from 1');
            setLimitMessageType('error');
            return;
        }

        setDesignationLimits((prev) => mergeDesignationLimits(prev, [{ designation, ugLimit, pgLimit }]));
        setNewLimit({ designation: '', ugLimit: '', pgLimit: '' });
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
                await axios.delete(`${SERVER_API_KEY}/api/admin/designation-team-limits/${encodeURIComponent(row.designation)}`, { headers });
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

    const handleFileUpload = (file, type) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            const data = [];

            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    const values = lines[i].split(',').map(v => v.trim());
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index] || '';
                    });
                    data.push(row);
                }
            }

            if (type === 'faculty') {
                setFacultyData(data);
            } else {
                setStudentData(data);
            }
        };
        reader.readAsText(file);
    };

    const handleFacultyFileChange = (e) => {
        const file = e.target.files[0];
        setFacultyFile(file);
        handleFileUpload(file, 'faculty');
    };

    const handleStudentFileChange = (e) => {
        const file = e.target.files[0];
        setStudentFile(file);
        handleFileUpload(file, 'student');
    };

    const uploadFaculty = async () => {
        if (facultyData.length === 0) {
            setMessage('Please upload a faculty CSV file first');
            setMessageType('error');
            return;
        }

        setLoading(true);
        try {
            // Include username mapped from email for backend compatibility
            const payload = facultyData.map(f => ({ ...f, username: f.email_id }));
            const response = await axios.post(`${SERVER_API_KEY}/api/admin/upload-faculty`, { facultyData: payload }, { headers });
            setMessage(`Successfully uploaded ${response.data.count} faculty members`);
            setMessageType('success');
            // Refresh list from server so the page shows the new faculty
            await fetchFacultyList();
            // Clear local CSV data after successful upload
            setFacultyData([]);
            setFacultyFile(null);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error uploading faculty data');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const uploadStudents = async () => {
        if (studentData.length === 0) {
            setMessage('Please upload a student CSV file first');
            setMessageType('error');
            return;
        }

        setLoading(true);
        try {
            // Include email for students and also provide username if backend expects it
            const payload = studentData.map(s => ({ ...s, username: s.regno, email: s.email_id }));
            // Pass the programme context so backend tags students correctly
            const response = await axios.post(`${SERVER_API_KEY}/api/admin/upload-students`, { studentData: payload, programme: programme || 'UG' }, { headers });
            setMessage(`Successfully uploaded ${response.data.count} students`);
            setMessageType('success');
            // Refresh list from server so the page shows the new students
            await fetchStudentList();
            // Clear local CSV data after successful upload
            setStudentData([]);
            setStudentFile(null);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error uploading student data');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const updateFaculty = async (index) => {
        setLoading(true);
        try {
            const response = await axios.put(`${SERVER_API_KEY}/api/admin/update-faculty/${facultyData[index].email_id}`, 
                facultyData[index], { headers });
            setMessage('Faculty member updated successfully');
            setMessageType('success');
            setEditingFaculty(null);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error updating faculty member');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const updateStudent = async (index) => {
        setLoading(true);
        try {
            const response = await axios.put(`${SERVER_API_KEY}/api/admin/update-student/${studentData[index].regno}`, 
                studentData[index], { headers });
            setMessage('Student updated successfully');
            setMessageType('success');
            setEditingStudent(null);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error updating student');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const deleteFaculty = async (emailId) => {
        if (!window.confirm('Are you sure you want to delete this faculty member?')) return;

        setLoading(true);
        try {
            await axios.delete(`${SERVER_API_KEY}/api/admin/delete-faculty/${emailId}`, { headers });
            setFacultyData(facultyData.filter(f => f.email_id !== emailId));
            setMessage('Faculty member deleted successfully');
            setMessageType('success');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error deleting faculty member');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    // Delete all faculty
    const deleteAllFaculty = async () => {
        if (!window.confirm('Are you sure you want to DELETE ALL faculty users? This action cannot be undone.')) return;
        setLoading(true);
        try {
            await axios.delete(`${SERVER_API_KEY}/api/admin/faculty`, { headers });
            setFacultyData([]);
            setMessage('All faculty users deleted successfully');
            setMessageType('success');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error deleting all faculty');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const deleteStudent = async (regno) => {
        if (!window.confirm('Are you sure you want to delete this student?')) return;

        setLoading(true);
        try {
            await axios.delete(`${SERVER_API_KEY}/api/admin/delete-student/${regno}`, { headers });
            setStudentData(studentData.filter(s => s.regno !== regno));
            setMessage('Student deleted successfully');
            setMessageType('success');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error deleting student');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    // Delete all students
    const deleteAllStudents = async () => {
        if (!window.confirm('Are you sure you want to DELETE ALL student users? This action cannot be undone.')) return;
        setLoading(true);
        try {
            await axios.delete(`${SERVER_API_KEY}/api/admin/students`, { headers });
            setStudentData([]);
            setMessage('All student users deleted successfully');
            setMessageType('success');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error deleting all students');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const fetchFacultyList = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${SERVER_API_KEY}/api/admin/faculty-list?includeExternal=true`, { headers });
            setFacultyData(response.data.map(f => ({
                seniority: f.seniority || '',
                email_id: f.email || f.username || '',
                name: f.name,
                designation: f.designation || '',
                memberType: f.memberType || 'internal'
            })));
            if (!response.data || response.data.length === 0) {
                setMessage('No faculty registered yet');
                setMessageType('success');
            } else {
                setMessage('');
                setMessageType('');
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error fetching faculty list');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentList = async () => {
        setLoading(true);
        try {
            const progParam = programme ? `?programme=${encodeURIComponent(programme)}` : '';
            const response = await axios.get(`${SERVER_API_KEY}/api/admin/student-list${progParam}`, { headers });
            setStudentData(response.data.map(s => ({ 
                regno: s.username, 
                name: s.name,
                // Use the explicit email returned by backend; don't fallback to username (regno)
                email_id: s.email || s.email_id || ''
            })));
            if (!response.data || response.data.length === 0) {
                setMessage('No student registered yet');
                setMessageType('success');
            } else {
                setMessage('');
                setMessageType('');
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error fetching student list');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">
                {studentsOnly ? `Student Management — ${programme || 'UG'}` : 'User Management'}
            </h2>
            
            {/* General message alert replaced with sticky toasts */}

            {/* Faculty + Designation Limits — hidden in studentsOnly mode */}
            {!studentsOnly && (            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Faculty Management</h3>
                
                <div className="mb-4">
                    <button
                        onClick={() => downloadTemplate('faculty')}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4 font-semibold text-sm"
                    >
                        Download Faculty Template
                    </button>
                </div>

                <div className="mb-4 flex items-center">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFacultyFileChange}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <button
                        onClick={uploadFaculty}
                        disabled={loading || facultyData.length === 0}
                        className="ml-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 font-semibold text-sm"
                    >
                        {loading ? 'Uploading...' : 'Upload Faculty CSV'}
                    </button>
                </div>

                {/* Manual Faculty Registration Form */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm">Add Faculty Member Manually</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">S.No. (Seniority)</label>
                            <input
                                type="number"
                                min="1"
                                value={newFaculty.seniority}
                                onChange={(e) => setNewFaculty({ ...newFaculty, seniority: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="e.g. 1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
                            <input
                                type="text"
                                value={newFaculty.name}
                                onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Dr. John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Email ID</label>
                            <input
                                type="email"
                                value={newFaculty.email_id}
                                onChange={(e) => setNewFaculty({ ...newFaculty, email_id: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="john.doe@univ.edu"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Designation</label>
                            <input
                                type="text"
                                value={newFaculty.designation}
                                onChange={(e) => setNewFaculty({ ...newFaculty, designation: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="e.g. Professor"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Member Type</label>
                            <select
                                value={newFaculty.memberType}
                                onChange={(e) => setNewFaculty({ ...newFaculty, memberType: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                            >
                                <option value="internal">Internal</option>
                                <option value="external">External</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleManualFacultySubmit}
                            disabled={loading || !newFaculty.name || !newFaculty.email_id}
                            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
                        >
                            Add Faculty Member
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <button
                        onClick={fetchFacultyList}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4 font-semibold text-sm"
                    >
                        View Faculty
                    </button>
                    <button
                        onClick={deleteAllFaculty}
                        disabled={loading}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-semibold text-sm"
                    >
                        {loading ? 'Processing...' : 'Delete All Faculty'}
                    </button>
                </div>

                {facultyData.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border px-4 py-2">S.No.</th>
                                    <th className="border px-4 py-2">Email</th>
                                    <th className="border px-4 py-2">Name</th>
                                    <th className="border px-4 py-2">Designation</th>
                                    <th className="border px-4 py-2">Member Type</th>
                                    <th className="border px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {facultyData.map((faculty, index) => (
                                    <tr key={index}>
                                        <td className="border px-4 py-2 text-center">
                                            {editingFaculty === index ? (
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={faculty.seniority || ''}
                                                    onChange={(e) => {
                                                        const newData = [...facultyData];
                                                        newData[index].seniority = e.target.value;
                                                        setFacultyData(newData);
                                                    }}
                                                    className="w-20 px-2 py-1 border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                faculty.seniority || '—'
                                            )}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {editingFaculty === index ? (
                                                <input
                                                    type="text"
                                                    value={faculty.email_id}
                                                    onChange={(e) => {
                                                        const newData = [...facultyData];
                                                        newData[index].email_id = e.target.value;
                                                        setFacultyData(newData);
                                                    }}
                                                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                faculty.email_id
                                            )}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {editingFaculty === index ? (
                                                <input
                                                    type="text"
                                                    value={faculty.name}
                                                    onChange={(e) => {
                                                        const newData = [...facultyData];
                                                        newData[index].name = e.target.value;
                                                        setFacultyData(newData);
                                                    }}
                                                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                faculty.name
                                            )}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {editingFaculty === index ? (
                                                <input
                                                    type="text"
                                                    value={faculty.designation || ''}
                                                    onChange={(e) => {
                                                        const newData = [...facultyData];
                                                        newData[index].designation = e.target.value;
                                                        setFacultyData(newData);
                                                    }}
                                                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                faculty.designation || ''
                                            )}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {editingFaculty === index ? (
                                                <select
                                                    value={faculty.memberType}
                                                    onChange={(e) => {
                                                        const newData = [...facultyData];
                                                        newData[index].memberType = e.target.value;
                                                        setFacultyData(newData);
                                                    }}
                                                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                >
                                                    <option value="internal">internal</option>
                                                    <option value="external">external</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${faculty.memberType === 'external' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                                                    {faculty.memberType}
                                                </span>
                                            )}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {editingFaculty === index ? (
                                                <div>
                                                    <button
                                                        onClick={() => updateFaculty(index)}
                                                        className="bg-green-500 text-white px-2 py-1 rounded mr-2 text-xs font-semibold"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingFaculty(null)}
                                                        className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-semibold"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <button
                                                        onClick={() => setEditingFaculty(index)}
                                                        className="bg-blue-500 text-white px-2 py-1 rounded mr-2 text-xs font-semibold"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteFaculty(faculty.email_id)}
                                                        className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold"
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

                {/* Designation limits settings block */}
                <hr className="my-8 border-gray-200" />
                <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h4 className="text-lg font-bold text-gray-800">Designation Team Limits Configuration</h4>
                        <p className="text-xs text-gray-500 mt-1">
                            Set maximum teams a guide can handle based on their designation. Different limits can be defined for UG and PG teams.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleViewDesignationLimits}
                            className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800 font-semibold text-sm transition-colors"
                        >
                            {showLimitsPanel ? 'Hide Designation Limits' : 'Manage Designation Limits'}
                        </button>
                        {showLimitsPanel && (
                            <button
                                onClick={deleteAllDesignationLimits}
                                disabled={loading}
                                className="bg-rose-600 text-white px-4 py-2 rounded hover:bg-rose-700 font-semibold text-sm transition-colors"
                            >
                                Delete All Limits
                            </button>
                        )}
                    </div>
                </div>

                {showLimitsPanel && (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/80 shadow-inner mt-4 space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-end bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                            <div className="flex-1 space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Designation Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Professor, Assistant Professor"
                                    value={newLimit.designation}
                                    onChange={(e) => setNewLimit(prev => ({ ...prev, designation: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700 bg-white"
                                />
                            </div>
                            <div className="w-full sm:w-32 space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">UG Team Limit</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="UG Limit"
                                    value={newLimit.ugLimit}
                                    onChange={(e) => setNewLimit(prev => ({ ...prev, ugLimit: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 bg-white"
                                />
                            </div>
                            <div className="w-full sm:w-32 space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">PG Team Limit</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="PG Limit"
                                    value={newLimit.pgLimit}
                                    onChange={(e) => setNewLimit(prev => ({ ...prev, pgLimit: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 bg-white"
                                />
                            </div>
                            <button
                                onClick={addDesignationLimitRow}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors w-full sm:w-auto"
                            >
                                Add Limit
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t pt-4">
                            <div className="flex gap-2 items-center">
                                <button
                                    onClick={() => downloadTemplate('teamLimit')}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors"
                                >
                                    Download CSV Template
                                </button>
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="teamLimitCsvUpload"
                                        accept=".csv"
                                        onChange={handleTeamLimitFileChange}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="teamLimitCsvUpload"
                                        className="cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors inline-block"
                                    >
                                        Upload CSV File
                                    </label>
                                </div>
                                {limitCsvFileName && (
                                    <span className="text-xs text-slate-500 font-medium">Selected: {limitCsvFileName}</span>
                                )}
                            </div>
                            <button
                                onClick={saveDesignationLimits}
                                disabled={loading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow transition-colors w-full sm:w-auto"
                            >
                                {loading ? 'Saving...' : 'Save Designation Limits'}
                            </button>
                        </div>

                        {designationLimits.length === 0 ? (
                            <div className="text-center p-8 border border-dashed rounded-lg text-slate-400 text-sm font-medium">
                                No designation limits configured yet. Add limits manually or upload a CSV file.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Designation</th>
                                            <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-36">Max Teams (UG)</th>
                                            <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-36">Max Teams (PG)</th>
                                            <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {designationLimits.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50/50">
                                                <td className="py-3 px-4 text-sm text-slate-700 font-semibold">
                                                    {editingLimitIndex === index ? (
                                                        <input
                                                            type="text"
                                                            value={item.designation}
                                                            onChange={(e) => {
                                                                const copy = [...designationLimits];
                                                                copy[index].designation = e.target.value;
                                                                setDesignationLimits(copy);
                                                                setLimitsSaved(false);
                                                            }}
                                                            className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-semibold"
                                                        />
                                                    ) : (
                                                        item.designation
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {editingLimitIndex === index ? (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.ugLimit}
                                                            onChange={(e) => {
                                                                const copy = [...designationLimits];
                                                                copy[index].ugLimit = e.target.value;
                                                                setDesignationLimits(copy);
                                                                setLimitsSaved(false);
                                                            }}
                                                            className="w-20 px-2 py-1 border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold"
                                                        />
                                                    ) : (
                                                        <span className="font-bold text-slate-800">{item.ugLimit}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {editingLimitIndex === index ? (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.pgLimit}
                                                            onChange={(e) => {
                                                                const copy = [...designationLimits];
                                                                copy[index].pgLimit = e.target.value;
                                                                setDesignationLimits(copy);
                                                                setLimitsSaved(false);
                                                            }}
                                                            className="w-20 px-2 py-1 border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold"
                                                        />
                                                    ) : (
                                                        <span className="font-bold text-slate-800">{item.pgLimit}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center space-x-2">
                                                    {editingLimitIndex === index ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingLimitIndex(null);
                                                                    setLimitMessage('Deduplicated row limits and updated view. Click Save to persist.');
                                                                    setLimitMessageType('success');
                                                                }}
                                                                className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
                                                            >
                                                                OK
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingLimitIndex(index)}
                                                                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => deleteDesignationLimitRow(index)}
                                                                className="text-rose-600 hover:text-rose-800 text-xs font-bold"
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
                            </div>
                        )}
                    </div>
                )}
            </div>
            )}

            {/* Student Management — hidden in globalOnly mode */}
            {!globalOnly && (
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">
                    Student Management {programme ? <span className="text-sm font-normal text-indigo-600 ml-2">({programme})</span> : ''}
                </h3>
                
                <div className="mb-4">
                    <button
                        onClick={() => downloadTemplate('student')}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
                    >
                        Download Student Template
                    </button>
                </div>

                <div className="mb-4">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleStudentFileChange}
                        className="border border-gray-300 rounded px-3 py-2"
                    />
                    <button
                        onClick={uploadStudents}
                        disabled={loading || studentData.length === 0}
                        className="ml-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                    >
                        {loading ? 'Uploading...' : 'Upload Students'}
                    </button>
                </div>
                <div className="mb-4">
                    <button
                        onClick={fetchStudentList}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
                    >
                        View Students
                    </button>
                    <button
                        onClick={deleteAllStudents}
                        disabled={loading}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        {loading ? 'Processing...' : 'Delete All Students'}
                    </button>
                </div>

                {studentData.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border px-4 py-2">Reg No</th>
                                    <th className="border px-4 py-2">Name</th>
                                    <th className="border px-4 py-2">Email</th>
                                    <th className="border px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentData.map((student, index) => (
                                    <tr key={index}>
                                        <td className="border px-4 py-2">
                                            {editingStudent === index ? (
                                                <input
                                                    type="text"
                                                    value={student.regno}
                                                    onChange={(e) => {
                                                        const newData = [...studentData];
                                                        newData[index].regno = e.target.value;
                                                        setStudentData(newData);
                                                    }}
                                                    className="w-full px-2 py-1 border rounded"
                                                />
                                            ) : (
                                                student.regno
                                            )}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {editingStudent === index ? (
                                                <input
                                                    type="text"
                                                    value={student.name}
                                                    onChange={(e) => {
                                                        const newData = [...studentData];
                                                        newData[index].name = e.target.value;
                                                        setStudentData(newData);
                                                    }}
                                                    className="w-full px-2 py-1 border rounded"
                                                />
                                            ) : (
                                                student.name
                                            )}
                                        </td>
                                        <td className="border px-4 py-2">
                                            {editingStudent === index ? (
                                                <input
                                                    type="email"
                                                    value={student.email_id || ''}
                                                    onChange={(e) => {
                                                        const newData = [...studentData];
                                                        newData[index].email_id = e.target.value;
                                                        setStudentData(newData);
                                                    }}
                                                    className="w-full px-2 py-1 border rounded"
                                                />
                                            ) : (
                                                student.email_id || ''
                                            )}
                                        </td>

                                        <td className="border px-4 py-2">
                                            {editingStudent === index ? (
                                                <div>
                                                    <button
                                                        onClick={() => updateStudent(index)}
                                                        className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingStudent(null)}
                                                        className="bg-gray-500 text-white px-2 py-1 rounded"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <button
                                                        onClick={() => setEditingStudent(index)}
                                                        className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteStudent(student.regno)}
                                                        className="bg-red-500 text-white px-2 py-1 rounded"
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
            )}

            {/* Sticky Notification Container */}
            <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                {message && (
                    <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 bg-white pointer-events-auto transition-all duration-300 animate-in slide-in-from-top-4 ${messageType === 'success' ? 'border-emerald-100 bg-emerald-50/10' : 'border-rose-100 bg-rose-50/10'}`}>
                        <div className={`p-2 rounded-full ${messageType === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {messageType === 'success' ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm">{messageType === 'success' ? 'Success' : 'Error'}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{message}</p>
                        </div>
                        <button 
                            onClick={() => setMessage('')}
                            className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                )}

                {limitMessage && (
                    <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 bg-white pointer-events-auto transition-all duration-300 animate-in slide-in-from-top-4 ${limitMessageType === 'success' ? 'border-emerald-100 bg-emerald-50/10' : 'border-rose-100 bg-rose-50/10'}`}>
                        <div className={`p-2 rounded-full ${limitMessageType === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {limitMessageType === 'success' ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm">{limitMessageType === 'success' ? 'Success' : 'Error'}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{limitMessage}</p>
                        </div>
                        <button 
                            onClick={() => setLimitMessage('')}
                            className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement; 