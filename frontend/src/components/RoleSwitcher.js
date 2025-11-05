import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RoleSwitcher = ({ currentRole, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Get all available faculty roles
  const facultyRoles = user?.roles?.filter(r => ['guide', 'panel', 'coordinator'].includes(r.role)) || [];

  const handleRoleSwitch = (newRole) => {
    // Update the user's current role in localStorage
    const updatedUser = { ...user, role: newRole };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('selectedRole', JSON.stringify({ role: newRole }));

    // Navigate to the appropriate dashboard
    if (newRole === 'guide') {
      navigate('/guide-dashboard');
    } else if (newRole === 'panel') {
      navigate('/panel-dashboard');
    } else if (newRole === 'coordinator') {
      navigate('/coordinator-dashboard/review-schedule');
    }

    setIsOpen(false);
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'guide': return 'Guide';
      case 'panel': return 'Panel Member';
      case 'coordinator': return 'Coordinator';
      default: return role;
    }
  };

  if (facultyRoles.length <= 1) {
    return null; // Don't show switcher if user only has one role
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span>Switch Role</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
          <div className="py-1">
            {facultyRoles.map((roleObj) => {
              const role = roleObj.role;
              const isCurrentRole = role === currentRole;
              
              return (
                <button
                  key={role}
                  onClick={() => handleRoleSwitch(role)}
                  disabled={isCurrentRole}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    isCurrentRole
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{getRoleLabel(role)}</span>
                    {isCurrentRole && (
                      <span className="text-xs bg-gray-300 text-gray-600 px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;
