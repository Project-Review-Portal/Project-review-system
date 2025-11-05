import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TeamFormation = () => {
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [maxTeamSize, setMaxTeamSize] = useState(4); // Default value, will be updated from backend
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [existingTeam, setExistingTeam] = useState(null);
    const [teamFormationOpen, setTeamFormationOpen] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        // Filter students based on search query
        if (searchQuery.trim() === '') {
            setFilteredStudents(availableStudents);
        } else {
            const filtered = availableStudents.filter(student =>
                student.username.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredStudents(filtered);
        }
    }, [searchQuery, availableStudents]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError('');
            
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found');
                setLoading(false);
                return;
            }

            // First, ensure team formation is open
            try {
                await axios.post('http://localhost:5000/api/teams/ensure-formation-open');
            } catch (err) {
                console.log('Could not ensure team formation is open:', err);
            }
    
            const [studentsRes, teamRes, configRes] = await Promise.all([
                axios.get('http://localhost:5000/api/teams/available-students', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('http://localhost:5000/api/teams/my-team', {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(err => {
                    if (err.response?.status === 404) {
                        return { data: null }; // Handle 404 gracefully
                    }
                    throw err;
                }),
                axios.get('http://localhost:5000/api/teams/max-team-size', { // Fetch max team size from new public endpoint
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('http://localhost:5000/api/teams/config/public')
            ]);
    
            setAvailableStudents(studentsRes.data);
            setFilteredStudents(studentsRes.data);
            
            if (teamRes.data) {
                setExistingTeam(teamRes.data);
            } else {
                setExistingTeam(null);
            }

            // Update maxTeamSize from backend config
            if (configRes.data && configRes.data.maxTeamSize) {
                setMaxTeamSize(configRes.data.maxTeamSize);
            }

            // Fetch teamFormationOpen from config
            if (configRes.data && typeof configRes.data.teamFormationOpen !== 'undefined') {
                setTeamFormationOpen(configRes.data.teamFormationOpen);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error.response?.data?.message || 'Error fetching data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = (student) => {
        if (selectedMembers.length >= maxTeamSize - 1) {
            setError(`Maximum team size is ${maxTeamSize } members`);
            return;
        }
        setSelectedMembers([...selectedMembers, student]);
        const updatedAvailable = availableStudents.filter(s => s._id !== student._id);
        setAvailableStudents(updatedAvailable);
        setFilteredStudents(updatedAvailable);
        setSearchQuery(''); // Clear search after adding
    };

    const handleRemoveMember = (student) => {
        setSelectedMembers(selectedMembers.filter(s => s._id !== student._id));
        const updatedAvailable = [...availableStudents, student];
        setAvailableStudents(updatedAvailable);
        setFilteredStudents(updatedAvailable);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found');
                return;
            }

            await axios.post('http://localhost:5000/api/teams/create', {
                members: selectedMembers.map(m => m._id)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccess('Team created successfully!');
            setSelectedMembers([]);
            fetchData();
        } catch (error) {
            setError(error.response?.data?.message || 'Error creating team');
        }
    };

    if (!teamFormationOpen) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Team Formation</h2>
                <p className="text-gray-600 text-lg font-medium mb-2">
                    Team formation is now closed.
                </p>
                <p className="text-gray-500 mb-4">
                    You can no longer form or join teams. Please proceed to the next steps as instructed.
                </p>
            </div>
        );
    }

    if (loading) {
        return <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600">Loading...</div>
        </div>;
    }

    if (existingTeam) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Team Formation</h2>
                <p className="text-gray-600 text-lg font-medium mb-2">
                    You are already part of a team.
                </p>
                <p className="text-gray-500 mb-4">
                    Please check <b>My Team</b> for details about your team members and status.
                </p>
                <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded">
                    <strong>Note:</strong> Once a team is formed, you cannot edit or change team members.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Form Your Team</h2>
            <p className="mb-4 text-gray-700">
                You are not currently part of any team. Use the search below to find available students and add them to your team. When ready, click <b>Create Team</b> to form your team. You will become the team leader.
            </p>
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded">
                <strong>Maximum students allowed in a team: {maxTeamSize}</strong>
            </div>
            <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded">
                <strong>Note:</strong> After forming your team, you will not be able to edit or change team members.
            </div>
            {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
                    {success}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Available Students by Roll Number
                    </label>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by username..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Students ({filteredStudents.length})
                    </label>
                    <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
                        {filteredStudents.length === 0 ? (
                            <p className="text-gray-500 text-center py-2">No students found</p>
                        ) : (
                            filteredStudents.map(student => (
                                <div key={student._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                    <span className="text-sm">{student.name} ({student.username})</span>
                                    <button
                                        type="button"
                                        onClick={() => handleAddMember(student)}
                                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Add
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selected Team Members ({selectedMembers.length}/{maxTeamSize - 1})
                    </label>
                    <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
                        {selectedMembers.length === 0 ? (
                            <p className="text-gray-500 text-center py-2">No members selected</p>
                        ) : (
                            selectedMembers.map(member => (
                                <div key={member._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                    <span className="text-sm">{member.name} ({member.username})</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveMember(member)}
                                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div>
                    <button
                        type="submit"
                        disabled={selectedMembers.length === 0}
                        className={`px-4 py-2 text-sm font-medium rounded-md text-white ${
                            selectedMembers.length === 0
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                        }`}
                    >
                        Create Team
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TeamFormation; 