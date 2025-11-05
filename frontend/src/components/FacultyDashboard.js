import React from 'react';
import { useNavigate } from 'react-router-dom';

const roleLabels = {
  guide: 'Guide',
  panel: 'Panel Member',
  coordinator: 'Coordinator',
};

const FacultyDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  // Aggregate faculty roles with their teams
  const roleMap = {};
  (user.roles || []).forEach(r => {
    if (!['guide','panel','coordinator'].includes(r.role)) return;
    if (!roleMap[r.role]) roleMap[r.role] = new Set();
    if (r.team) roleMap[r.role].add(r.team);
  });
  const facultyRoles = Object.keys(roleMap).map(role => ({ role, teams: Array.from(roleMap[role]) }));

  // Fetch team names for display
  const [teamNames, setTeamNames] = React.useState({});
  React.useEffect(() => {
    const allTeamIds = facultyRoles.flatMap(r => r.teams);
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
  }, [JSON.stringify(facultyRoles)]);

  const handleSelect = (roleObj) => {
    // roleObj may be a string (legacy) or { role, teams }
    const role = typeof roleObj === 'string' ? roleObj : roleObj.role;
    // If teams array present and exactly one, pick that team; otherwise leave team unset
  // Default to first team id if teams exist
  const team = (roleObj && roleObj.teams && roleObj.teams.length > 0) ? roleObj.teams[0] : null;

    // Save selected role in localStorage for use in dashboards
    localStorage.setItem('selectedRole', JSON.stringify({ role, team }));
    // Also update user object in localStorage for ProtectedRoute
    const storedUser = JSON.parse(localStorage.getItem('user')) || {};
    storedUser.role = role;
    if (team) storedUser.team = team;
    localStorage.setItem('user', JSON.stringify(storedUser));
    // Redirect to the appropriate dashboard
    if (role === 'guide') navigate('/guide-dashboard');
    else if (role === 'panel') navigate('/panel-dashboard');
    else if (role === 'coordinator') navigate('/coordinator-dashboard/review-schedule');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-4">
          Welcome
        </h2>
        <p className="text-center text-gray-700 mb-6">
          You have multiple roles. Please select which dashboard you want to access:
        </p>
        <div className="space-y-4">
          {facultyRoles.map((roleObj) => (
            <button
              key={roleObj.role}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none text-lg font-semibold flex justify-between items-center"
              onClick={() => handleSelect(roleObj)}
            >
              <span>{roleLabels[roleObj.role]}</span>
              {roleObj.teams && roleObj.teams.length > 0 && (
                <span className="text-sm opacity-90">{roleObj.teams.map(t => teamNames[t] ? teamNames[t] : `Team ${t}`).join(', ')}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;