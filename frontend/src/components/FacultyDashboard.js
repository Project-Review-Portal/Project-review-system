import React from 'react';
import { useNavigate } from 'react-router-dom';

const roleLabels = {
  guide: 'Guide',
  panel: 'Panel Member',
  coordinator: 'Coordinator',
  'assistant coordinator': 'Assistant Coordinator',
};

const FacultyDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  // Aggregate faculty roles with their programmes
  const seenKeys = new Set();
  const facultyRoles = [];
  (user?.roles || []).forEach(r => {
    if (!['guide','panel','coordinator', 'assistant coordinator'].includes(r.role)) return;
    const programme = r.programme || 'B.E COMPUTER SCIENCE AND ENGINEERING';
    const key = `${r.role}-${programme}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      facultyRoles.push({ role: r.role, programme });
    }
  });

  const handleSelect = (roleObj) => {
    const role = roleObj.role;
    const programme = roleObj.programme;

    // Save selected role and programme in localStorage for use in dashboards
    localStorage.setItem('selectedRole', JSON.stringify({ role, programme }));
    
    // Also update user object in localStorage for ProtectedRoute
    const storedUser = JSON.parse(localStorage.getItem('user')) || {};
    storedUser.role = role;
    storedUser.programme = programme;
    localStorage.setItem('user', JSON.stringify(storedUser));
    
    // Redirect to the appropriate dashboard
    if (role === 'guide') navigate('/guide-dashboard');
    else if (role === 'panel') navigate('/panel-dashboard');
    else if (role === 'coordinator' || role === 'assistant coordinator') navigate('/coordinator-dashboard/review-schedule');
  };

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="brand-lockup">
          <div className="brand-mark">PR</div>
          <div className="auth-aside-copy"><h1>One system, every review role.</h1><p>Move between your assigned responsibilities while keeping the right programme context in view.</p></div>
        </div>
        <div className="auth-aside-meta"><span className="w-2 h-2 rounded-full bg-emerald-300"></span> Faculty workspace</div>
      </aside>
      <div className="auth-panel"><div className="selection-card space-y-8">
        <div className="text-center"><p className="auth-eyebrow">Project review system</p>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-4">
          Welcome, {user?.name || 'Faculty'}
        </h2></div>
        <p className="text-center text-gray-700 mb-6">
          Please select which dashboard you want to access:
        </p>
        <div className="space-y-4">
          {facultyRoles.map((roleObj, index) => (
            <button
              key={index}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:outline-none text-left text-base font-semibold flex justify-between items-center shadow-sm hover:shadow-md"
              onClick={() => handleSelect(roleObj)}
            >
              <span>{roleLabels[roleObj.role]} ({roleObj.programme})</span>
              <svg className="w-5 h-5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div></div>
    </div>
  );
};

export default FacultyDashboard;
