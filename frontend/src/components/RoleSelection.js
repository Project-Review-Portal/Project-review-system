import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Small sub-component to render a role row with teams (no dropdown)
const RoleRow = ({ roleObj, loading, getRoleDisplayName, handleRoleSelect, teamNames }) => {
    // Default to first team id if one or more teams exist
    const defaultTeam = roleObj.teams && roleObj.teams.length > 0 ? roleObj.teams[0] : null;

    const onClick = () => {
        const payload = { role: roleObj.role, team: defaultTeam };
        handleRoleSelect(payload);
    };

    const teamLabel = roleObj.teams && roleObj.teams.length > 0 ? ` (${roleObj.teams.map(t => teamNames[t] ? teamNames[t] : `Team ${t}`).join(', ')})` : '';

    return (
        <div className={`w-full p-4 rounded-lg border-2 ${loading ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-semibold text-gray-900">{getRoleDisplayName(roleObj.role)}{teamLabel}</h3>
                </div>
                <div>
                    <button
                        onClick={onClick}
                        disabled={loading}
                        className={`text-indigo-600 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:underline'}`}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

const RoleSelection = () => {
    const [selectedRole, setSelectedRole] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const availableRoles = user.roles || [];
    
    // Aggregate roles -> teams mapping so we can show role with its teams
    const rolesMap = {};
    (availableRoles || []).forEach(roleObj => {
        const role = roleObj.role;
        const team = roleObj.team || null;
        if (!rolesMap[role]) rolesMap[role] = new Set();
        if (team) rolesMap[role].add(team);
    });
    // Convert to array of { role, teams: [] }
    const uniqueRoles = Object.keys(rolesMap).map(role => ({ role, teams: Array.from(rolesMap[role]) }));

    // Fetch human-friendly team names for any team ids we have in roles
    const [teamNames, setTeamNames] = useState({});
    React.useEffect(() => {
        const allTeamIds = uniqueRoles.flatMap(r => r.teams);
        if (!allTeamIds || allTeamIds.length === 0) return;
        const idsParam = allTeamIds.join(',');
        const fetchNames = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`http://localhost:5000/api/teams/by-ids?ids=${idsParam}`, { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) return;
                const data = await res.json();
                const map = {};
                data.forEach(t => { map[t._id] = t.teamName; });
                setTeamNames(map);
            } catch (e) {
                console.warn('Failed to fetch team names', e);
            }
        };
        fetchNames();
    }, [JSON.stringify(uniqueRoles)]);

    const handleRoleSelect = async (roleObj) => {
        setLoading(true);
        try {
            // Update the user's current role in localStorage
            const updatedUser = {
                ...user,
                role: roleObj.role,
                team: roleObj.team || null
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Navigate based on the selected role
            if (roleObj.role === 'coordinator') {
                navigate('/coordinator-dashboard/review-schedule');
            } else if (roleObj.role === 'guide') {
                navigate('/guide-dashboard');
            } else if (roleObj.role === 'panel') {
                navigate('/panel-dashboard');
            } else {
                // Default to faculty dashboard
                navigate('/faculty-dashboard');
            }
        } catch (error) {
            console.error('Error selecting role:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'guide':
                return 'Guide';
            case 'panel':
                return 'Panel Member';
            case 'coordinator':
                return 'Coordinator';
            default:
                return role.charAt(0).toUpperCase() + role.slice(1);
        }
    };

    // Optional helper kept for future display of team context
    const getTeamDisplayName = (team) => {
        if (!team) return 'No Team Assigned';
        return `Team ${team}`;
    };

    if (uniqueRoles.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Roles Available</h2>
                        <p className="text-gray-600 mb-4">You don't have any assigned roles in the system.</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome</h2>
                    <p className="text-gray-600 mb-6">Please select the role you want to use for this session:</p>
                </div>

                <div className="space-y-4">
                    {uniqueRoles.map((roleObj, index) => (
                        <RoleRow
                            key={index}
                            roleObj={roleObj}
                            loading={loading}
                            getRoleDisplayName={getRoleDisplayName}
                            handleRoleSelect={handleRoleSelect}
                            teamNames={teamNames}
                        />
                    ))}
                </div>

                {loading && (
                    <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-sm text-gray-600">Loading...</p>
                    </div>
                )}

                <div className="text-center">
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            navigate('/login');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        Sign out
                    </button>
                   
                </div>
               <p className="mt-6">
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md text-center font-semibold">
    EXTERNAL MEMBERS! <br /> Choose panel member as your role.
  </div>
</p>

            </div>
        </div>
    );
};

export default RoleSelection; 