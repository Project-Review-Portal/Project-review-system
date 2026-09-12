import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const AdminSessionProgrammes = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [programmes, setProgrammes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessionAndProgrammes();
    }, [sessionId]);

    const fetchSessionAndProgrammes = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch session details
            const sessionRes = await axios.get(`${SERVER_API_KEY}/api/sessions`, { headers });
            const allSessions = sessionRes.data.sessions || [];
            const currentSession = allSessions.find(s => s._id === sessionId);
            setSession(currentSession);

            // Fetch programmes
            const progRes = await axios.get(`${SERVER_API_KEY}/api/programmes`, { headers });
            setProgrammes(progRes.data || []);
        } catch (err) {
            console.error('Error fetching session programmes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProgramme = (progName) => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.programme = progName;
        storedUser.session = sessionId;
        localStorage.setItem('user', JSON.stringify(storedUser));
        localStorage.setItem('selectedSessionId', sessionId);
        if (session) {
            localStorage.setItem('selectedSessionName', session.name);
        }
        navigate(`/admin-dashboard/programme/${encodeURIComponent(progName)}`);
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
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/admin-dashboard')}
                        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-white px-3 py-1.5 rounded-md border shadow-sm transition"
                    >
                        ← Back to Sessions
                    </button>
                    {session && (
                        <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                session.status === 'active' 
                                    ? 'bg-green-100 text-green-800 border border-green-200' 
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                                {session.status === 'active' ? '● Active' : '⏸ Paused'}
                            </span>
                            {session.isCurrent && (
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    ⭐ Current
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-1">
                        {session ? session.name : 'Session Programmes'}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Select a programme to manage student registrations, review panels, marks, and attendance for this session.
                    </p>
                </div>

                {/* Programmes List */}
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-purple-500 mb-3">Available Programmes</h2>
                    {loading ? (
                        <div className="text-gray-400 text-sm animate-pulse">Loading programmes…</div>
                    ) : (
                        <div className="flex flex-col">
                            {/* UG always present */}
                            <ListItem
                                title="B.E. CSE"
                                subtitle="Undergraduate Computer Science and Engineering"
                                icon="📚"
                                color="bg-white border-gray-200 hover:border-emerald-300"
                                onClick={() => handleSelectProgramme('B.E. CSE')}
                            />
                            {programmes.map(pg => (
                                <ListItem
                                    key={pg._id}
                                    title={pg.name}
                                    subtitle="Postgraduate Programme"
                                    icon="🎓"
                                    color="bg-white border-gray-200 hover:border-purple-300"
                                    onClick={() => handleSelectProgramme(pg.name)}
                                />
                            ))}
                            {programmes.length === 0 && (
                                <div className="text-gray-400 text-sm italic mt-2">
                                    No additional PG programmes added yet. You can manage global programmes from <strong>Global Management</strong>.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSessionProgrammes;
