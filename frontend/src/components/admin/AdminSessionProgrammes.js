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
        if (sessionId) {
            localStorage.setItem('selectedSessionId', sessionId);
        }
        fetchSessionAndProgrammes();
    }, [sessionId]);

    const fetchSessionAndProgrammes = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                Authorization: `Bearer ${token}`,
                'X-Selected-Session': sessionId
            };

            // Fetch session details
            const sessionRes = await axios.get(`${SERVER_API_KEY}/api/sessions`, { headers });
            const allSessions = sessionRes.data.sessions || [];
            const currentSession = allSessions.find(s => s._id === sessionId);
            setSession(currentSession);
            if (currentSession) {
                localStorage.setItem('selectedSessionName', currentSession.name);
            }

            // Fetch programmes for this session
            const progRes = await axios.get(`${SERVER_API_KEY}/api/programmes?sessionId=${sessionId}`, { headers });
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

    const ListItem = ({ title, subtitle, icon, color, badge, onClick }) => (
        <button
            onClick={onClick}
            className={`group w-full relative flex items-center p-4 rounded-xl shadow border text-left transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${color} mb-3`}
        >
            <div className="text-3xl mr-4">{icon}</div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-800">{title}</span>
                    {badge}
                </div>
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
                            {session.isCurrent && (
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                    ⭐ Current
                                </span>
                            )}
                            {session.isAdvanced && (
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                    🚀 Advanced
                                </span>
                            )}
                            {session.isReadOnly && (
                                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                    🔒 Read-Only
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

                {/* Session Global Configuration */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-500 mb-3">Session Global Management</h2>
                    <ListItem
                        title="Global Management"
                        subtitle="Faculty · Designation Limits · Programs Offered Master List"
                        icon="🌐"
                        color="bg-white border-gray-200 hover:border-indigo-300"
                        onClick={() => navigate(`/admin-dashboard/session/${sessionId}/global-management`)}
                    />
                </div>

                {/* Programmes List */}
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-purple-500 mb-3">Available Programmes</h2>
                    {loading ? (
                        <div className="text-gray-400 text-sm animate-pulse">Loading programmes…</div>
                    ) : programmes.length === 0 ? (
                        <div className="p-8 text-center bg-white border border-dashed border-gray-300 rounded-xl text-gray-500">
                            <div className="text-3xl mb-2">🎓</div>
                            <div className="font-semibold text-gray-700 mb-1">No programmes added yet</div>
                            <p className="text-xs text-gray-400 mb-4">Add programs (B.E. CSE, M.E. Big Data, etc.) via Global Management.</p>
                            <button
                                onClick={() => navigate(`/admin-dashboard/session/${sessionId}/global-management`)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
                            >
                                Open Programs Offered
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {programmes.map(pg => {
                                const isUG = pg.name && pg.name.trim().toLowerCase().includes('b.e');
                                const isPaused = pg.status === 'paused';

                                return (
                                    <ListItem
                                        key={pg._id}
                                        title={pg.name}
                                        subtitle={isUG ? 'Undergraduate Programme' : 'Postgraduate Programme'}
                                        icon={isUG ? '📚' : '🎓'}
                                        color={`bg-white border-gray-200 ${isUG ? 'hover:border-emerald-300' : 'hover:border-purple-300'}`}
                                        badge={
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                                                isPaused
                                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                    : 'bg-green-100 text-green-800 border-green-300'
                                            }`}>
                                                {isPaused ? '⏸️ Paused' : '▶️ Active'}
                                            </span>
                                        }
                                        onClick={() => handleSelectProgramme(pg.name)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSessionProgrammes;
