import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

const AdminHome = () => {
    const [programmes, setProgrammes] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProgrammes();
    }, []);

    const fetchProgrammes = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${SERVER_API_KEY}/api/programmes`, { headers: { Authorization: `Bearer ${token}` } });
            setProgrammes(res.data || []);
        } catch (err) {
            console.error('Error fetching programmes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    const ListItem = ({ title, subtitle, icon, color, onClick }) => (
        <button
            onClick={onClick}
            className={`group w-full relative flex items-center p-4 rounded-xl shadow border text-left transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${color} mb-3`}
        >
            <div className="text-3xl mr-4">{icon}</div>
            <div className="flex-1">
                <div className="text-lg font-bold text-gray-800">{title}</div>
                {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
            </div>
            <div className="text-gray-400 text-xl group-hover:translate-x-1 transition-transform">→</div>
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto py-12 px-6">
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Admin Control Panel</h1>
                        <p className="text-gray-500">Select a context to manage students, panels, and reviews.</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow"
                    >
                        Logout
                    </button>
                </div>

                {/* Global Management */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-500 mb-3">Global Management</h2>
                    <ListItem
                        title="Global Management"
                        subtitle="Faculty · Designation Limits · PG Programmes"
                        icon="🌐"
                        color="bg-white border-gray-200 hover:border-indigo-300"
                        onClick={() => navigate('/admin-dashboard/global-management')}
                    />
                </div>

                {/* Programmes */}
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-purple-500 mb-3">Programmes</h2>
                    {loading ? (
                        <div className="text-gray-400 text-sm animate-pulse">Loading programmes…</div>
                    ) : (
                        <div className="flex flex-col">
                            {/* UG always present */}
                            <ListItem
                                title="UG"
                                subtitle="Undergraduate programme"
                                icon="📚"
                                color="bg-white border-gray-200 hover:border-emerald-300"
                                onClick={() => navigate('/admin-dashboard/programme/UG')}
                            />
                            {programmes.map(pg => (
                                <ListItem
                                    key={pg._id}
                                    title={pg.name}
                                    subtitle="PG programme"
                                    icon="🎓"
                                    color="bg-white border-gray-200 hover:border-purple-300"
                                    onClick={() => navigate(`/admin-dashboard/programme/${encodeURIComponent(pg.name)}`)}
                                />
                            ))}
                            {programmes.length === 0 && (
                                <div className="text-gray-400 text-sm italic mt-2">
                                    No PG programmes added yet. Go to <strong>Global Management</strong> to add them.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminHome;
