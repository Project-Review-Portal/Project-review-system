import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!token || !user) {
        // Redirect to login if not authenticated
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard if role is not allowed
        switch (user.role) {
            case 'student':
                return <Navigate to="/student-dashboard" replace />;
            case 'guide':
                return <Navigate to="/guide-dashboard" replace />;
            case 'panel':
                return <Navigate to="/panel-dashboard" replace />;
            case 'admin':
                return <Navigate to="/admin-dashboard" replace />;
            case 'coordinator':
                return <Navigate to="/coordinator-dashboard" replace />;
            default:
                return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute; 