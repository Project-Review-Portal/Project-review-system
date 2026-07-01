import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const MyTeam = () => {
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState('');
    const [noTeamFound, setNoTeamFound] = useState(false);
    
    // Member management states
    const [availableStudents, setAvailableStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [maxTeamSize, setMaxTeamSize] = useState(4);
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');

    const user = JSON.parse(localStorage.getItem('user'));
    const currentUserId = user?._id || user?.id;

    // Memoize fetchMyTeam using useCallback to fix the dependency warning safely
    const fetchMyTeam = useCallback(async () => {
        setLoading(true);
        setApiError('');
        setNoTeamFound(false);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setApiError('Authentication token not found.');
                setLoading(false);
                return;
            }

            const [teamRes, sizeRes, studentsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/teams/my-team', {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(err => {
                    if (err.response && err.response.status === 404) {
                        return { data: null };
                    }
                    throw err;
                }),
                axios.get('http://localhost:5000/api/teams/max-team-size', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('http://localhost:5000/api/teams/available-students', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (teamRes.data) {
                setTeam(teamRes.data);
            } else {
                setNoTeamFound(true);
                setTeam(null);
            }

            if (sizeRes.data && sizeRes.data.maxTeamSize) {
                setMaxTeamSize(sizeRes.data.maxTeamSize);
            }

            if (studentsRes.data) {
                setAvailableStudents(studentsRes.data);
                setFilteredStudents(studentsRes.data);
            }
        } catch (err) {
            console.error('Error fetching team data:', err);
            setApiError(err.response?.data?.message || 'Failed to fetch team data.');
        } finally {
            setLoading(false);
        }
    }, []); // Empty array because it only depends on component state setters

    // Safely add fetchMyTeam to the dependency array now
    useEffect(() => {
        fetchMyTeam();
    }, [fetchMyTeam]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredStudents(availableStudents);
        } else {
            const filtered = availableStudents.filter(student =>
                student.username.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredStudents(filtered);
        }
    }, [searchQuery, availableStudents]);

    const handleInviteMember = async (studentId) => {
        setInviteError('');
        setInviteSuccess('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/teams/invite', {
                studentId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInviteSuccess(res.data.message || 'Invitation sent successfully!');
            setSearchQuery('');
            fetchMyTeam();
        } catch (err) {
            setInviteError(err.response?.data?.message || 'Failed to invite member.');
        }
    };

    const handleRemoveMember = async (studentId) => {
        setInviteError('');
        setInviteSuccess('');
        if (!window.confirm('Are you sure you want to remove or revoke this invitation?')) {
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/teams/remove-member', {
                studentId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInviteSuccess('Member/Invitation cleared successfully!');
            fetchMyTeam();
        } catch (err) {
            setInviteError(err.response?.data?.message || 'Failed to remove member.');
        }
    };

    const handleDeleteTeam = async () => {
        if (!window.confirm('Are you sure you want to disband this team? All members and pending requests will be removed.')) {
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.delete('http://localhost:5000/api/teams/my-team', {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Team disbanded successfully!');
            window.location.reload();
        } catch (err) {
            setApiError(err.response?.data?.message || 'Failed to disband team.');
        }
    };

    const handleRequestLock = async () => {
        setInviteError('');
        setInviteSuccess('');
        
        const isSoloTeam = acceptedMembersOnly.length === 0;
        const confirmationMessage = isSoloTeam
            ? 'Are you sure you want to lock and finalize your solo team? You cannot add members after locking.'
            : 'Are you sure you want to lock the team? Once locked, you cannot modify members.';

        if (!window.confirm(confirmationMessage)) {
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/teams/request-lock', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInviteSuccess(res.data.message || 'Lock operation completed successfully!');
            fetchMyTeam();
        } catch (err) {
            setInviteError(err.response?.data?.message || 'Failed to process lock request.');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-lg text-gray-600">Loading...</div></div>;
    }

    if (apiError) {
        return <div className="bg-white p-6 rounded-lg shadow text-red-600">Error: {apiError}</div>;
    }

    if (noTeamFound || !team) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">My Team</h2>
                <p className="text-gray-600">You are not currently part of any team.</p>
                <p className="text-gray-500 mt-2">
                    Please go to <b>Team Formation</b> to create or join a team.
                </p>
            </div>
        );
    }

    const isLeader = team.teamLeader?._id === currentUserId;
    const memberList = team.memberStatus && team.memberStatus.length > 0
        ? team.memberStatus
        : team.members.map(m => ({ user: m, status: 'accepted' }));

    const activeMembers = memberList.filter(m => m.status === 'accepted' || m.status === 'pending');
    const acceptedMembersOnly = memberList.filter(m => m.status === 'accepted');
    const pendingMembersOnly = memberList.filter(m => m.status === 'pending');
    const rejectedMembers = memberList.filter(m => m.status === 'rejected');

    const canLockTeam = pendingMembersOnly.length === 0;

    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-semibold">My Team</h2>
                <div className="flex gap-2">
                    {team.isLocked && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200">
                            🔒 Team Locked
                        </span>
                    )}
                    {!team.isLocked && !canLockTeam && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200">
                            Has Pending Invites
                        </span>
                    )}
                    {!team.isLocked && canLockTeam && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200">
                            {acceptedMembersOnly.length === 0 ? 'Solo Project Ready' : 'Ready to Lock'}
                        </span>
                    )}
                </div>
            </div>
            
            <div className="p-3 bg-blue-50 text-blue-700 rounded border border-blue-100">
                <h3 className="font-semibold text-lg">Team Name: {team.teamName}</h3>
            </div>

            {inviteError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">{inviteError}</div>}
            {inviteSuccess && <div className="text-sm text-green-600 bg-green-50 p-3 rounded border border-green-200">{inviteSuccess}</div>}

            {team.isLocked && (
                <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-800 rounded shadow-sm">
                    <h4 className="font-bold flex items-center gap-2">
                        <span>🔒 Team is Locked & Finalized</span>
                    </h4>
                    <p className="text-sm mt-1">This team is locked. Members and settings cannot be changed. Only an administrator can unlock or disband this team.</p>
                </div>
            )}

            {!team.isLocked && isLeader && canLockTeam && (
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded shadow-sm space-y-2">
                    <h4 className="font-bold">🔒 Finalize Team Setup</h4>
                    <p className="text-sm">
                        {acceptedMembersOnly.length === 0 
                            ? "You don't have any accepted team members. Locking now will instantly finalize this as a Solo Project." 
                            : "All invited members have accepted. You can lock and finalize this team setup. Once locked, no more members can be added or removed."
                        }
                    </p>
                    <button
                        onClick={handleRequestLock}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors"
                    >
                        {acceptedMembersOnly.length === 0 ? 'Lock Team Instantly' : 'Lock Team'}
                    </button>
                </div>
            )}

            {!team.isLocked && !team.lockRequested && isLeader && !canLockTeam && (
                <div className="p-4 bg-yellow-50 text-yellow-800 border-l-4 border-yellow-400 rounded text-sm space-y-1">
                    <strong>⚠️ Lock Blocked:</strong> You have <b>{pendingMembersOnly.length} pending invitation(s)</b> out to other students.
                    <p className="text-xs text-gray-600">You must wait for them to Accept/Decline, or click "Revoke Invite" below to clear the request before you can lock this team configuration.</p>
                </div>
            )}

            <div className="border p-4 rounded-lg space-y-3 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800">Team Members</h3>
                <ul className="space-y-2">
                    <li className="flex items-center justify-between p-2 rounded-md bg-indigo-50 border border-indigo-100">
                        <span className="font-medium text-indigo-900">Leader: {team.teamLeader?.name} ({team.teamLeader?.username})</span>
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-bold">Leader</span>
                    </li>
                    {activeMembers.map(m => (
                        <li key={m.user?._id} className="flex items-center justify-between p-2 rounded-md bg-white border border-gray-200">
                            <span className="text-sm text-gray-700">{m.user?.name} ({m.user?.username})</span>
                            <div className="flex items-center space-x-3">
                                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                                    m.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                    'bg-yellow-100 text-yellow-800 shadow-sm'
                                }`}>
                                    {m.status === 'pending' ? '⏳ Pending Response' : 'Accepted'}
                                </span>
                                
                                {team.lockRequested && m.status === 'accepted' && (
                                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                                        m.lockApproved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {m.lockApproved ? '✓ Lock Approved' : '⏳ Lock Pending'}
                                    </span>
                                )}

                                {isLeader && !team.isLocked && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveMember(m.user?._id)}
                                        className="text-xs text-red-600 hover:text-red-800 font-semibold focus:outline-none border border-transparent hover:border-red-200 px-1.5 py-0.5 rounded"
                                    >
                                        {m.status === 'pending' ? 'Revoke Invite' : 'Remove'}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {rejectedMembers.length > 0 && (
                <div className="border p-4 rounded-lg space-y-3 bg-red-50/50 border-red-100">
                    <h3 className="text-lg font-semibold text-red-800">Declined Invitations</h3>
                    <ul className="space-y-2">
                        {rejectedMembers.map(m => (
                            <li key={m.user?._id} className="flex items-center justify-between p-2 rounded-md bg-white border border-red-200">
                                <span className="text-sm text-gray-700">{m.user?.name} ({m.user?.username})</span>
                                <div className="flex items-center space-x-3">
                                    <span className="text-xs px-2 py-1 rounded font-semibold bg-red-100 text-red-800">
                                        Declined
                                    </span>
                                    {isLeader && !team.isLocked && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMember(m.user?._id)}
                                            className="text-xs text-red-600 hover:text-red-800 font-semibold focus:outline-none"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isLeader && !team.isLocked && activeMembers.length + 1 < maxTeamSize && (
                <div className="border p-4 rounded-lg space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800">Invite More Members ({activeMembers.length + 1}/{maxTeamSize})</h3>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search available students by username..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                    </div>
                    {searchQuery && (
                        <div className="border rounded-md p-2 max-h-40 overflow-y-auto bg-white shadow-inner">
                            {filteredStudents.length === 0 ? (
                                <p className="text-gray-500 text-center py-2 text-sm">No students found</p>
                            ) : (
                                filteredStudents.map(student => (
                                    <div key={student._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm">
                                        <span className="text-gray-700">{student.name} ({student.username})</span>
                                        <button
                                            type="button"
                                            onClick={() => handleInviteMember(student._id)}
                                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold"
                                        >
                                            Invite
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {team.guidePreference && (
                <div className="border p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-3">Guide</h3>
                    <p className="text-gray-700">
                        Name: <span className="font-medium">{team.guidePreference.name}</span>
                    </p>
                    <p className="text-gray-700">
                        Status: <span className={`font-medium ${team.status === 'approved' ? 'text-green-600' : team.status === 'rejected' ? 'text-red-600' : 'text-orange-600'}`}>
                            {team.status}
                        </span>
                    </p>
                </div>
            )}

            {isLeader && !team.isLocked && (
                <div className="pt-4 border-t flex justify-end">
                    <button
                        onClick={handleDeleteTeam}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors"
                    >
                        Disband Team
                    </button>
                </div>
            )}
        </div>
    );
};

export default MyTeam;