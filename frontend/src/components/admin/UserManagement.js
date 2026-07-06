import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
    const [designationLimits, setDesignationLimits] = useState([]);
    const [editingLimitIndex, setEditingLimitIndex] = useState(null);
    const [newLimit, setNewLimit] = useState({ designation: '', teamLimit: '' });
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
                const response = await axios.get('/api/admin/designation-team-limits', { headers });
                const limits = response.data.map((item) => ({
                    designation: item.designation,
                    teamLimit: item.teamLimit
                }));
                setDesignationLimits(limits);
            } catch (error) {
                // Silently fail on mount; user can click Load Saved Limits manually
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
        'email_id,name,designation,memberType',
        'john.doe@univ.edu,Dr. John Doe,Assistant Professor,internal',
        'jane.smith@univ.edu,Dr. Jane Smith,Industry Expert,external'
    ];

    const studentTemplate = [
        'regno,name,email_id',
        '2021CS001,Alice Johnson,alice@univ.edu',
        '2021CS002,Bob Brown,bob@univ.edu'
    ];

    const teamLimitTemplate = [
        'designation,team_limit',
        'Assistant Professor,3',
        'Associate Professor,4',
        'Professor,5'
    ];

    const mergeDesignationLimits = (existing, incoming) => {
        // Use a Map keyed by lowercase designation so duplicates always overwrite (last wins)
        const map = new Map();

        // Seed with existing entries
        existing.forEach((row) => {
            const designation = String(row.designation || '').trim();
            const teamLimit = Number(row.teamLimit ?? row.team_limit);
            if (designation && !Number.isNaN(teamLimit)) {
                map.set(designation.toLowerCase(), { designation, teamLimit });
            }
        });

        // Merge incoming entries (overwrites existing for same designation)
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
            // Strip BOM (byte order mark) that some editors/Excel add to CSV files
            const csv = event.target.result.replace(/^\uFEFF/, '');
            const lines = csv.split('\n');
            const headers = lines[0].split(',').map((header) => header.trim().toLowerCase());
            const parsedRows = [];
            const skippedDesignations = [];

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;

                const values = lines[i].split(',').map((value) => value.trim());
                const row = {};
                headers.forEach((header, index) => {
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
                setShowLimitsPanel(true);
            }

            if (skippedDesignations.length > 0) {
                setLimitMessage(`CSV parsed: skipped designations [${skippedDesignations.join(', ')}] due to invalid or <= 0 limit. Other valid limits loaded. Click Save to persist.`);
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
            const response = await axios.get('/api/admin/designation-team-limits', { headers });
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
            await axios.delete('/api/admin/designation-team-limits/all', { headers });
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

            await axios.post('/api/admin/designation-team-limits', { limits: payload }, { headers });
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
                await axios.delete(`/api/admin/designation-team-limits/${encodeURIComponent(row.designation)}`, { headers });
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

    const downloadTemplate = (type) => {
        const template = type === 'faculty'
            ? facultyTemplate
            : type === 'teamLimit'
                ? teamLimitTemplate
                : studentTemplate;
        const csvContent = template.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type === 'teamLimit' ? 'team_limit' : type}_template.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
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
            const response = await axios.post('/api/admin/upload-faculty', { facultyData: payload }, { headers });
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
            const response = await axios.post('/api/admin/upload-students', { studentData: payload, programme: programme || 'UG' }, { headers });
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
            const response = await axios.put(`/api/admin/update-faculty/${facultyData[index].email_id}`, 
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
            const response = await axios.put(`/api/admin/update-student/${studentData[index].regno}`, 
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
            await axios.delete(`/api/admin/delete-faculty/${emailId}`, { headers });
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
            await axios.delete('/api/admin/faculty', { headers });
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
            await axios.delete(`/api/admin/delete-student/${regno}`, { headers });
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
            await axios.delete('/api/admin/students', { headers });
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
            const response = await axios.get('/api/admin/faculty-list?includeExternal=true', { headers });
            setFacultyData(response.data.map(f => ({
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
            const response = await axios.get(`/api/admin/student-list${progParam}`, { headers });
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
            {!studentsOnly && (<>
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Faculty Management</h3>
                
                <div className="mb-4">
                    <button
                        onClick={() => downloadTemplate('faculty')}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
                    >
                        Download Faculty Template
                    </button>
                </div>

                <div className="mb-4">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFacultyFileChange}
                        className="border border-gray-300 rounded px-3 py-2"
                    />
                    <button
                        onClick={uploadFaculty}
                        disabled={loading || facultyData.length === 0}
                        className="ml-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                    >
                        {loading ? 'Uploading...' : 'Upload Faculty'}
                    </button>
                </div>
                <div className="mb-4">
                    <button
                        onClick={fetchFacultyList}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
                    >
                        View Faculty
                    </button>
                    <button
                        onClick={deleteAllFaculty}
                        disabled={loading}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        {loading ? 'Processing...' : 'Delete All Faculty'}
                    </button>
                </div>

                {facultyData.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100">
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
                                                    className="w-full px-2 py-1 border rounded"
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
                                                    className="w-full px-2 py-1 border rounded"
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
                                                    className="w-full px-2 py-1 border rounded"
                                                />
                                            ) : (
                                                faculty.designation || ''
                                            )}
                                        </td>

                                        <td className="border px-4 py-2">
                                            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                                {faculty.memberType}
                                            </span>
                                        </td>

                                        <td className="border px-4 py-2">
                                            {editingFaculty === index ? (
                                                <div>
                                                    <button
                                                        onClick={() => updateFaculty(index)}
                                                        className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingFaculty(null)}
                                                        className="bg-gray-500 text-white px-2 py-1 rounded"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <button
                                                        onClick={() => setEditingFaculty(index)}
                                                        className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteFaculty(faculty.email_id)}
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

            {/* Team Limit Management */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Team Limit Management</h3>
                
                <div className="mb-4">
                    <button
                        onClick={() => downloadTemplate('teamLimit')}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
                    >
                        Download Team Limit Template
                    </button>
                </div>

                <div className="mb-4">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleTeamLimitFileChange}
                        className="border border-gray-300 rounded px-3 py-2"
                    />
                </div>

                <div className="mb-4">
                    <button
                        onClick={handleViewDesignationLimits}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
                    >
                        {showLimitsPanel ? 'Hide Designation and Limits' : 'View Designation and Limits'}
                    </button>
                    <button
                        onClick={deleteAllDesignationLimits}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Delete All Limits
                    </button>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <input
                        type="text"
                        value={newLimit.designation}
                        onChange={(e) => setNewLimit({ ...newLimit, designation: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2"
                        placeholder="Designation"
                    />
                    <input
                        type="number"
                        min="1"
                        value={newLimit.teamLimit}
                        onChange={(e) => setNewLimit({ ...newLimit, teamLimit: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2 w-32"
                        placeholder="Limit"
                    />
                    <button
                        onClick={() => {
                            addDesignationLimitRow();
                            setShowLimitsPanel(true);
                        }}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
                    >
                        Add / Update Limit
                    </button>
                    <button
                        onClick={saveDesignationLimits}
                        disabled={loading}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {showLimitsPanel && (
                    <div className="overflow-x-auto">
                        {designationLimits.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm">
                                No designation limits set. Use CSV upload or the form above to add limits.
                            </div>
                        ) : (
                            <table className="min-w-full border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border px-4 py-2">Designation</th>
                                        <th className="border px-4 py-2">Team Limit</th>
                                        <th className="border px-4 py-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {designationLimits.map((limit, index) => (
                                        <tr key={`${limit.designation}-${index}`}>
                                            <td className="border px-4 py-2">
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
                                                        className="w-full px-2 py-1 border rounded"
                                                    />
                                                ) : (
                                                    limit.designation
                                                )}
                                            </td>
                                            <td className="border px-4 py-2">
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
                                                        className="w-32 px-2 py-1 border rounded"
                                                    />
                                                ) : (
                                                    limit.teamLimit
                                                )}
                                            </td>
                                            <td className="border px-4 py-2">
                                                {editingLimitIndex === index ? (
                                                    <div>
                                                        <button
                                                            onClick={() => setEditingLimitIndex(null)}
                                                            className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <button
                                                            onClick={() => {
                                                                setEditingLimitIndex(index);
                                                                setShowLimitsPanel(true);
                                                            }}
                                                            className="bg-blue-500 text-white px-2 py-1 rounded mr-2"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => deleteDesignationLimitRow(index)}
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
                        )}
                    </div>
                )}
            </div>
            {/* End: Faculty + Designation Limits section */}
            </>)}

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