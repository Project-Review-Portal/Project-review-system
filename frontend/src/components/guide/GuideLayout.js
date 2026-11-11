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
        <div className="min-h-screen bg-slate-50">
            <Navbar user={user} onLogout={handleLogout} />
            <main className="lg:pl-72 p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default GuideLayout; 