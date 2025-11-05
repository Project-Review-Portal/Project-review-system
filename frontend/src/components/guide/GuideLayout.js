import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../Navbar'; // Adjust path if necessary

const GuideLayout = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    // Handle logout from the layout
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    if (!user) {
        // Fallback or loading state, though ProtectedRoute should handle this
        return <div>Loading user data...</div>;
    }

    return (
        <div>
            <Navbar user={user} onLogout={handleLogout} />
            <div className="container mx-auto p-4">
                <Outlet />
            </div>
        </div>
    );
};

export default GuideLayout; 