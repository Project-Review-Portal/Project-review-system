import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminViewAttendance = ({ programme }) => {
    const [studentData, setStudentData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchFilters, setSearchFilters] = useState({
        regNo: '',
        studentName: '',
        teamName: '',
        guideName: '',
        panelName: '',
        minAttendance: '',
        maxAttendance: '',
        minMarks: '',
        maxMarks: ''
    });
    const [activeSuggestionField, setActiveSuggestionField] = useState(null);
    const [suggestions, setSuggestions] = useState([]);

    const getSuggestions = (field, value) => {
        if (!value) return [];
        const lowerVal = value.toLowerCase();
        let options = new Set();
        
        studentData.forEach(student => {
            if (field === 'regNo' && student.studentRegNo && student.studentRegNo.toLowerCase().includes(lowerVal)) {
                options.add(student.studentRegNo);
            } else if (field === 'studentName' && student.studentName && student.studentName.toLowerCase().includes(lowerVal)) {
                options.add(student.studentName);
            } else if (field === 'teamName' && student.teamName && student.teamName.toLowerCase().includes(lowerVal)) {
                options.add(student.teamName);
            } else if (field === 'guideName' && student.guideName && student.guideName.toLowerCase().includes(lowerVal)) {
                options.add(student.guideName);
            } else if (field === 'panelName' && student.panelName && student.panelName.toLowerCase().includes(lowerVal)) {
                options.add(student.panelName);
            }
        });
        
        return Array.from(options).slice(0, 8);
    };

    const handleFilterChange = (field, value) => {
        setSearchFilters(prev => ({ ...prev, [field]: value }));
        
        if (['minAttendance', 'maxAttendance', 'minMarks', 'maxMarks'].includes(field)) {
            return;
        }

        const newSuggestions = getSuggestions(field, value);
        if (newSuggestions.length > 0) {
            setActiveSuggestionField(field);
            setSuggestions(newSuggestions);
        } else {
            setActiveSuggestionField(null);
            setSuggestions([]);
        }
    };

    const applySearchFilters = (dataList) => {
        return dataList.filter(student => {
            const matchRegNo = !searchFilters.regNo || (student.studentRegNo || '').toLowerCase().includes(searchFilters.regNo.toLowerCase());
            const matchStudentName = !searchFilters.studentName || (student.studentName || '').toLowerCase().includes(searchFilters.studentName.toLowerCase());
            const matchTeamName = !searchFilters.teamName || (student.teamName || '').toLowerCase().includes(searchFilters.teamName.toLowerCase());
            const matchGuideName = !searchFilters.guideName || (student.guideName || '').toLowerCase().includes(searchFilters.guideName.toLowerCase());
            const matchPanelName = !searchFilters.panelName || (student.panelName || '').toLowerCase().includes(searchFilters.panelName.toLowerCase());
            
            let matchAttendance = true;
            const att = parseFloat(student.attendancePercentage);
            if (!isNaN(att)) {
                if (searchFilters.minAttendance && att < parseFloat(searchFilters.minAttendance)) matchAttendance = false;
                if (searchFilters.maxAttendance && att > parseFloat(searchFilters.maxAttendance)) matchAttendance = false;
            }

            let matchMarks = true;
            if (student.averageMarks !== 'N/A') {
                const marks = parseFloat(student.averageMarks);
                if (!isNaN(marks)) {
                    if (searchFilters.minMarks && marks < parseFloat(searchFilters.minMarks)) matchMarks = false;
                    if (searchFilters.maxMarks && marks > parseFloat(searchFilters.maxMarks)) matchMarks = false;
                }
            } else {
                if (searchFilters.minMarks || searchFilters.maxMarks) matchMarks = false;
            }

            return matchRegNo && matchStudentName && matchTeamName && matchGuideName && matchPanelName && matchAttendance && matchMarks;
        });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const progParam = programme ? `?programme=${encodeURIComponent(programme)}` : '';
            const response = await axios.get(`/api/admin/daily-attendance-records${progParam}`, { headers });
            setStudentData(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.message || 'Failed to fetch data');
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center p-4">Loading attendance and marks records...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Student Attendance & Marks Overview</h2>

            {studentData.length === 0 ? (
                <p>No student records found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Reg. No.</th>
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Student Name</th>
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Team Name</th>
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Guide Name</th>
                                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Panel Name</th>
                                <th className="py-2 px-4 border-b text-center text-sm font-semibold text-gray-600">Attendance %</th>
                                <th className="py-2 px-4 border-b text-center text-sm font-semibold text-gray-600">Average Marks</th>
                            </tr>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="py-2 px-2 relative">
                                    <input 
                                        type="text" placeholder="Search Reg No" 
                                        value={searchFilters.regNo} onChange={(e) => handleFilterChange('regNo', e.target.value)}
                                        onFocus={() => { if(searchFilters.regNo) handleFilterChange('regNo', searchFilters.regNo); }}
                                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                                        className="w-full text-xs p-1 border border-gray-300 rounded font-normal"
                                    />
                                    {activeSuggestionField === 'regNo' && suggestions.length > 0 && (
                                        <ul className="absolute z-50 w-[90%] bg-white border border-gray-200 shadow-lg rounded mt-1 max-h-40 overflow-y-auto">
                                            {suggestions.map((s, i) => <li key={i} className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-xs font-normal" onMouseDown={() => { setSearchFilters(p => ({...p, regNo: s})); setActiveSuggestionField(null); }}>{s}</li>)}
                                        </ul>
                                    )}
                                </th>
                                <th className="py-2 px-2 relative">
                                    <input 
                                        type="text" placeholder="Search Name" 
                                        value={searchFilters.studentName} onChange={(e) => handleFilterChange('studentName', e.target.value)}
                                        onFocus={() => { if(searchFilters.studentName) handleFilterChange('studentName', searchFilters.studentName); }}
                                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                                        className="w-full text-xs p-1 border border-gray-300 rounded font-normal"
                                    />
                                    {activeSuggestionField === 'studentName' && suggestions.length > 0 && (
                                        <ul className="absolute z-50 w-[90%] bg-white border border-gray-200 shadow-lg rounded mt-1 max-h-40 overflow-y-auto">
                                            {suggestions.map((s, i) => <li key={i} className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-xs font-normal" onMouseDown={() => { setSearchFilters(p => ({...p, studentName: s})); setActiveSuggestionField(null); }}>{s}</li>)}
                                        </ul>
                                    )}
                                </th>
                                <th className="py-2 px-2 relative">
                                    <input 
                                        type="text" placeholder="Search Team" 
                                        value={searchFilters.teamName} onChange={(e) => handleFilterChange('teamName', e.target.value)}
                                        onFocus={() => { if(searchFilters.teamName) handleFilterChange('teamName', searchFilters.teamName); }}
                                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                                        className="w-full text-xs p-1 border border-gray-300 rounded font-normal"
                                    />
                                    {activeSuggestionField === 'teamName' && suggestions.length > 0 && (
                                        <ul className="absolute z-50 w-[90%] bg-white border border-gray-200 shadow-lg rounded mt-1 max-h-40 overflow-y-auto">
                                            {suggestions.map((s, i) => <li key={i} className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-xs font-normal" onMouseDown={() => { setSearchFilters(p => ({...p, teamName: s})); setActiveSuggestionField(null); }}>{s}</li>)}
                                        </ul>
                                    )}
                                </th>
                                <th className="py-2 px-2 relative">
                                    <input 
                                        type="text" placeholder="Search Guide" 
                                        value={searchFilters.guideName} onChange={(e) => handleFilterChange('guideName', e.target.value)}
                                        onFocus={() => { if(searchFilters.guideName) handleFilterChange('guideName', searchFilters.guideName); }}
                                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                                        className="w-full text-xs p-1 border border-gray-300 rounded font-normal"
                                    />
                                    {activeSuggestionField === 'guideName' && suggestions.length > 0 && (
                                        <ul className="absolute z-50 w-[90%] bg-white border border-gray-200 shadow-lg rounded mt-1 max-h-40 overflow-y-auto">
                                            {suggestions.map((s, i) => <li key={i} className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-xs font-normal" onMouseDown={() => { setSearchFilters(p => ({...p, guideName: s})); setActiveSuggestionField(null); }}>{s}</li>)}
                                        </ul>
                                    )}
                                </th>
                                <th className="py-2 px-2 relative">
                                    <input 
                                        type="text" placeholder="Search Panel" 
                                        value={searchFilters.panelName} onChange={(e) => handleFilterChange('panelName', e.target.value)}
                                        onFocus={() => { if(searchFilters.panelName) handleFilterChange('panelName', searchFilters.panelName); }}
                                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                                        className="w-full text-xs p-1 border border-gray-300 rounded font-normal"
                                    />
                                    {activeSuggestionField === 'panelName' && suggestions.length > 0 && (
                                        <ul className="absolute z-50 w-[90%] bg-white border border-gray-200 shadow-lg rounded mt-1 max-h-40 overflow-y-auto">
                                            {suggestions.map((s, i) => <li key={i} className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-xs font-normal" onMouseDown={() => { setSearchFilters(p => ({...p, panelName: s})); setActiveSuggestionField(null); }}>{s}</li>)}
                                        </ul>
                                    )}
                                </th>
                                <th className="py-2 px-2 text-center">
                                    <div className="flex gap-1 justify-center">
                                        <input type="number" placeholder="Min%" value={searchFilters.minAttendance} onChange={(e) => handleFilterChange('minAttendance', e.target.value)} className="w-16 text-xs p-1 border border-gray-300 rounded font-normal" />
                                        <input type="number" placeholder="Max%" value={searchFilters.maxAttendance} onChange={(e) => handleFilterChange('maxAttendance', e.target.value)} className="w-16 text-xs p-1 border border-gray-300 rounded font-normal" />
                                    </div>
                                </th>
                                <th className="py-2 px-2 text-center">
                                    <div className="flex gap-1 justify-center">
                                        <input type="number" placeholder="Min" value={searchFilters.minMarks} onChange={(e) => handleFilterChange('minMarks', e.target.value)} className="w-16 text-xs p-1 border border-gray-300 rounded font-normal" />
                                        <input type="number" placeholder="Max" value={searchFilters.maxMarks} onChange={(e) => handleFilterChange('maxMarks', e.target.value)} className="w-16 text-xs p-1 border border-gray-300 rounded font-normal" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {applySearchFilters(studentData).map(student => (
                                <tr key={student.studentId} className="hover:bg-gray-50">
                                    <td className="py-2 px-4 border-b">{student.studentRegNo || 'N/A'}</td>
                                    <td className="py-2 px-4 border-b">{student.studentName}</td>
                                    <td className="py-2 px-4 border-b">{student.teamName}</td>
                                    <td className="py-2 px-4 border-b">{student.guideName}</td>
                                    <td className="py-2 px-4 border-b">{student.panelName}</td>
                                    <td className="py-2 px-4 border-b text-center">{student.attendancePercentage}%</td>
                                    <td className="py-2 px-4 border-b text-center">{student.averageMarks}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminViewAttendance; 