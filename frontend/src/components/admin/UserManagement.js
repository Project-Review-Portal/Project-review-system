import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserManagement = () => {
    const [facultyFile, setFacultyFile] = useState(null);
    const [studentFile, setStudentFile] = useState(null);
    const [facultyData, setFacultyData] = useState([]);
    const [studentData, setStudentData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [editingFaculty, setEditingFaculty] = useState(null);
    const [editingStudent, setEditingStudent] = useState(null);

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

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
            const response = await axios.post('/api/admin/upload-students', { studentData: payload }, { headers });
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

    const downloadTemplate = (type) => {
        const template = type === 'faculty' ? facultyTemplate : studentTemplate;
        const csvContent = template.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_template.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Add these functions:
    const fetchFacultyList = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/faculty-list?includeExternal=true', { headers });
            // Map backend fields to frontend fields (prefer email)
            setFacultyData(response.data.map(f => ({ 
                // Use explicit email field returned by backend; fallback to username only if email not present
                email_id: f.email || f.username || '',
                name: f.name,
                // The backend currently doesn't store a 'designation' field by default.
                // Keep designation empty (or editable) so we don't accidentally display the email in the designation column.
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
            const response = await axios.get('/api/admin/student-list', { headers });
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
            <h2 className="text-2xl font-bold mb-6">User Management</h2>
            
            {message && (
                <div className={`mb-4 p-4 rounded ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}

            {/* Faculty Management */}
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

            {/* Student Management */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Student Management</h3>
                
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
        </div>
    );
};

export default UserManagement; 