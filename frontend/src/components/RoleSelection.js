import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Small sub-component to render a role row (no dropdown, separated by programme)
const RoleRow = ({ roleObj, loading, getRoleDisplayName, handleRoleSelect }) => {
    const onClick = () => {
        handleRoleSelect(roleObj);
    };

    return (
        <div className={`w-full p-4 rounded-lg border-2 ${loading ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-semibold text-gray-900">
                        {getRoleDisplayName(roleObj.role)} ({roleObj.programme})
                    </h3>
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
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const availableRoles = user.roles || [];
    
    // Group by unique (role, programme) pairs
    const seenKeys = new Set();
    const uniqueRoles = [];
    (availableRoles || []).forEach(roleObj => {
        if (!['guide', 'panel', 'coordinator', 'assistant coordinator'].includes(roleObj.role)) return;
        const role = roleObj.role;
        const programme = roleObj.programme || 'B.E COMPUTER SCIENCE AND ENGINEERING';
        const key = `${role}-${programme}`;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueRoles.push({ role, programme });
        }
    });

    const handleRoleSelect = async (roleObj) => {
        setLoading(true);
        try {
            // Update the user's current role and programme in localStorage
            const updatedUser = {
                ...user,
                role: roleObj.role,
                programme: roleObj.programme
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            localStorage.setItem('selectedRole', JSON.stringify({ role: roleObj.role, programme: roleObj.programme }));

            // Navigate based on the selected role
            if (roleObj.role === 'coordinator' || roleObj.role === 'assistant coordinator') {
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
            case 'assistant coordinator':
                return 'Assistant Coordinator';
            default:
                return role.charAt(0).toUpperCase() + role.slice(1);
        }
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