import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const GuideAnnouncements = () => {
    const [panels, setPanels] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState(null);
    const [instructions, setInstructions] = useState([]);
    const [myTeams, setMyTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingInstructions, setLoadingInstructions] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchPanels();
    }, []);

    const fetchPanels = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const selectedProgramme = storedUser.programme;

            const res = await axios.get(`${SERVER_API_KEY}/api/guide/assigned-panels`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            let fetchedPanels = res.data || [];
            if (selectedProgramme) {
                const normSelected = selectedProgramme.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                fetchedPanels = fetchedPanels.filter(p => {
                    const normP = p.programme?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || '';
                    return normP === normSelected || 
                           (normSelected.includes('cse') && normP.includes('cse')) ||
                           (normSelected.includes('computerscience') && normP.includes('cse')) ||
                           (normSelected.includes('cse') && normP.includes('computerscience'));
                });
            }

            setPanels(fetchedPanels);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching assigned panels:', err);
            setError('Failed to fetch assigned panels.');
            setLoading(false);
        }
    };

    const handleSelectPanel = async (panel) => {
        setSelectedPanel(panel);
        setLoadingInstructions(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${SERVER_API_KEY}/api/panels/panel/${panel._id}/instructions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInstructions(res.data.data || []);
            setMyTeams(res.data.myTeams || []);
        } catch (err) {
            console.error('Error fetching instructions:', err);
            setError('Failed to fetch announcements for the selected panel.');
        } finally {
            setLoadingInstructions(false);
        }
    };

    const handleDownload = async (templateId, actualFileName) => {
        if (!templateId) return;
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${SERVER_API_KEY}/api/student/download-template/${templateId}`, {
                responseType: 'blob', 
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data.type === "application/json" || response.headers['content-type']?.includes('application/json')) {
                const text = await response.data.text();
                const errorObj = JSON.parse(text);
                alert(`Download Failed: ${errorObj.message}`);
                return;
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', actualFileName || 'instruction_document.txt'); 
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download pipeline failed:", err);
            alert("Could not process your file download. Please try again later.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center text-gray-500 font-medium">Loading review panels...</div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-7xl mx-auto font-sans">
            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {!selectedPanel ? (
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Assigned Panels</h2>
                    {panels.length === 0 ? (
                        <div className="p-6 bg-gray-50 border rounded-lg text-center text-gray-500 font-semibold">
                            No panels have been assigned to your teams yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {panels.map(panel => (
                                <div 
                                    key={panel._id} 
                                    onClick={() => handleSelectPanel(panel)}
                                    className="border-2 border-indigo-100 hover:border-indigo-500 bg-indigo-50/10 hover:bg-indigo-50/20 p-5 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                >
                                    <div>
                                        <h3 className="text-xl font-bold text-indigo-700">{panel.name}</h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            <strong>Coordinator:</strong> {panel.coordinator?.name || 'N/A'} | <strong>Type:</strong> <span className="capitalize">{panel.panelType}</span>
                                        </p>
                                    </div>
                                    <span className="text-xs uppercase font-extrabold tracking-wider bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{panel.programme}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Panel Header */}
                    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-4 gap-4">
                            <div>
                                <button 
                                    onClick={() => { setSelectedPanel(null); setMyTeams([]); }} 
                                    className="mb-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded text-xs transition uppercase tracking-wider"
                                >
                                    ← Back to Panels
                                </button>
                                <h2 className="text-2xl font-bold text-gray-800">{selectedPanel.name} Announcements</h2>
                                <p className="text-xs text-gray-500 mt-1">Coordinator: {selectedPanel.coordinator?.name || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Guide's Teams list in this panel */}
                        {myTeams && myTeams.length > 0 && (
                            <div className="text-xs text-gray-500 flex flex-wrap gap-2 items-center">
                                <span className="font-semibold text-gray-700">Your Guided Teams:</span>
                                {myTeams.map(t => (
                                    <span 
                                        key={t._id} 
                                        title={`Leader: ${t.teamLeader?.name || 'N/A'}\nMembers: ${t.members?.map(m => m.name).join(', ') || 'None'}`}
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-150 cursor-default transition font-bold"
                                    >
                                        {t.teamName}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {loadingInstructions ? (
                        <div className="text-center text-gray-500 text-sm py-8">Loading announcements...</div>
                    ) : instructions.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-12 bg-white border border-dashed rounded-xl shadow-sm">
                            No announcements found for this Panel.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {instructions.map((template) => (
                                <div 
                                    key={template._id} 
                                    className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4 transition-all hover:shadow-md"
                                >
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            Instructions/Guidelines
                                        </span>
                                        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                                            {new Date(template.createdAt).toLocaleDateString()} • {new Date(template.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="w-full text-gray-700 text-sm leading-relaxed bg-gray-50/50 rounded-lg p-4 border border-gray-100 whitespace-pre-wrap">
                                        {template.reviewInstructions}
                                    </div>

                                    {template.fileName && (
                                        <div className="pt-1">
                                            <button
                                                onClick={() => handleDownload(template._id, template.fileName)}
                                                className="inline-flex items-center justify-center bg-[#583be2] hover:bg-[#472fc5] text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm text-xs"
                                            >
                                                <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"></path>
                                                </svg>
                                                Download Attachment: {template.fileName}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GuideAnnouncements;
