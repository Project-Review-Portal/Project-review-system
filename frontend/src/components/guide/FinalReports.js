import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const SERVER_URL = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

// Rejection Modal Sub-component
const RejectionModal = ({ isOpen, onClose, onSubmit }) => {
    const [remarks, setRemarks] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!remarks.trim()) {
            alert('Please provide remarks for rejection.');
            return;
        }
        onSubmit(remarks);
        setRemarks('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject Submission</h3>
                <p className="text-sm text-gray-500 mb-4">Please provide a reason or constructive remarks for this rejection.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <textarea
                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                        rows="3"
                        placeholder="Type rejection remarks here..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        required
                    />
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={() => { setRemarks(''); onClose(); }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded"
                        >
                            Confirm Rejection
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// 1. Isolated Sub-component to prevent parent re-renders on keystrokes
const UploadActionCard = ({ setting, upload, onAction, onDownload }) => {
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    const handleApprove = () => {
        onAction(upload._id, 'approved', '');
    };

    const handleRejectSubmit = (remarks) => {
        onAction(upload._id, 'rejected', remarks);
        setIsRejectModalOpen(false);
    };

    // Determine if the item is currently in a state that requires admin review
    const needsAction = upload && (upload.status === 'pending' || upload.status === 'uploaded' || !upload.status);

    return (
        <div className="bg-white border rounded p-4 shadow-sm flex flex-col justify-between min-h-[160px]">
            <div>
                <div className="font-semibold mb-1 text-gray-800">{setting.name}</div>
                <div className="text-xs text-gray-400 mb-3">
                    Required: {setting.isRequired ? 'Yes' : 'No'} | Types: {Array.isArray(setting.fileType) ? setting.fileType.map(t => `.${t}`).join(', ') : setting.fileType}
                </div>
                
                {upload ? (
                    <div>
                        <div className="text-xs font-semibold mb-3">
                            Status: <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide ${
                                upload.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                upload.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {upload.status || 'uploaded'}
                            </span>
                        </div>
                        
                        {/* More focused Download UI */}
                        <div className="mb-3">
                            <button 
                                onClick={() => onDownload(upload)}
                                className="inline-flex items-center text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors w-full sm:w-auto justify-center"
                            >
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Document
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 italic my-4">
                        Not uploaded yet
                    </div>
                )}
            </div>

            {/* FIXED: Action panel now shows up for 'pending', 'uploaded', or undefined/empty status strings */}
            {needsAction && (
                <div className="flex space-x-2 mt-2 pt-2 border-t border-gray-50">
                    <button 
                        onClick={handleApprove}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium px-2 py-1.5 rounded w-1/2 transition-colors"
                    >
                        Approve
                    </button>
                    <button 
                        onClick={() => setIsRejectModalOpen(true)}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-2 py-1.5 rounded w-1/2 transition-colors"
                    >
                        Reject
                    </button>
                </div>
            )}

            {upload && upload.status === 'approved' && (
                <div className="text-[11px] text-green-600 bg-green-50 rounded p-1.5 text-center font-medium mt-2">
                    ✓ Approved. No further actions needed.
                </div>
            )}

            {upload && upload.status === 'rejected' && (
                <div className="text-[11px] text-red-600 bg-red-50 rounded p-1.5 text-center font-medium mt-2">
                    ✕ Rejected. Awaiting re-submission.
                    {upload.remarks && <div className="text-[10px] text-gray-500 font-normal mt-1 italic">Reason: "{upload.remarks}"</div>}
                </div>
            )}

            <RejectionModal 
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                onSubmit={handleRejectSubmit}
            />
        </div>
    );
};

const FinalReports = () => {
    const [teams, setTeams] = useState([]);
    const [settings, setSettings] = useState([]);
    const [uploads, setUploads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all'); // 'all' | 'uploaded' | 'not_uploaded'

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            let userProgramme = 'UG';
            let userRole = '';
            const rawUser = localStorage.getItem('user');
            
            if (rawUser) {
                try {
                    const storedUser = JSON.parse(rawUser);
                    userProgramme = storedUser.programme || storedUser.user?.programme || 'UG';
                    userRole = storedUser.role || storedUser.user?.role || '';
                } catch (_) {}
            }

            const res = await axios.get(`${SERVER_URL}/api/materials/review/teams`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    programme: userProgramme,
                    role: userRole
                }
            });
            setTeams(res.data.teams || []);
            setSettings(res.data.settings || []);
            setUploads(res.data.uploads || []);
        } catch (error) {
            console.error('Error fetching material uploads', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (uploadId, status, remarks) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${SERVER_URL}/api/materials/review/${uploadId}/status`, {
                status,
                remarks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setUploads(prev => prev.map(u => u._id === uploadId ? res.data : u));
        } catch (error) {
            console.error('Error updating status', error);
            alert('Error updating status');
        }
    };

    const handleDownload = async (upload) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${SERVER_URL}/api/materials/download/${upload._id}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', upload.fileName);
            document.body.appendChild(link);
            link.click();
            
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Failed to download file. It may have been removed from the server.');
        }
    };

    // 4. Memoize lookups for massive performance gains over nested .find() loops
    const uploadMap = useMemo(() => {
        const map = {};
        uploads.forEach(u => {
            if (u.team?._id && u.materialSetting?._id) {
                map[`${u.team._id}_${u.materialSetting._id}`] = u;
            }
        });
        return map;
    }, [uploads]);

    // Apply Upload Status Filtering before grouping data
    const filteredTeams = useMemo(() => {
        return teams.filter(team => {
            const teamSettings = settings.filter(s => s.programme === (team.programme || 'UG'));
            const hasAnyUpload = teamSettings.some(setting => !!uploadMap[`${team._id}_${setting._id}`]);

            if (filterType === 'uploaded') return hasAnyUpload;
            if (filterType === 'not_uploaded') return !hasAnyUpload;
            return true; 
        });
    }, [teams, settings, uploadMap, filterType]);

    // 3. Memoize team grouping data so it doesn't recalculate unless filtered changes
    const grouped = useMemo(() => {
        const data = {};
        filteredTeams.forEach(team => {
            const prog = team.programme || 'Unknown Programme';
            const panelName = team.panel?.name || 'Unassigned Panel';
            if (!data[prog]) data[prog] = {};
            if (!data[prog][panelName]) data[prog][panelName] = [];
            data[prog][panelName].push(team);
        });
        return data;
    }, [filteredTeams]);

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow mb-6 mx-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">Review Materials / Uploads</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Manage and audit team artifact requirements.</p>
                </div>
                
                <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                    <label htmlFor="uploadFilter" className="text-xs font-medium text-gray-600">Filter Status:</label>
                    <select
                        id="uploadFilter"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="text-xs border rounded p-1.5 bg-gray-50 text-gray-700 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                        <option value="all">All Assigned Teams ({teams.length})</option>
                        <option value="uploaded">Has Uploads</option>
                        <option value="not_uploaded">No Uploads Yet</option>
                    </select>
                </div>
            </div>

            {filteredTeams.length === 0 ? (
                <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded text-center">
                    No teams found matching the selected filter layout.
                </p>
            ) : (
                <div className="space-y-8">
                    {Object.keys(grouped).map(prog => (
                        <div key={prog} className="mb-8">
                            <h2 className="text-2xl font-bold border-b-2 border-indigo-200 pb-2 mb-6 text-indigo-800">
                                {prog}
                            </h2>
                            {Object.keys(grouped[prog]).map(panelName => (
                                <div key={panelName} className="mb-6 ml-4">
                                    <h3 className="text-xl font-semibold text-gray-700 mb-4 bg-gray-100 p-2 rounded">
                                        Panel: {panelName}
                                    </h3>
                                    <div className="space-y-6">
                                        {grouped[prog][panelName].map(team => {
                                            const filteredSettings = settings.filter(s => s.programme === (team.programme || 'UG'));
                                            
                                            return (
                                                <div key={team._id} className="border border-indigo-100 p-4 rounded bg-gray-50 shadow-sm ml-4">
                                                    <h4 className="text-lg font-medium text-indigo-700 mb-4 flex items-center">
                                                        <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded mr-2">TEAM</span>
                                                        {team.teamName || 'Unnamed Team'}
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                        {filteredSettings.map(setting => {
                                                            const upload = uploadMap[`${team._id}_${setting._id}`];
                                                            
                                                            return (
                                                                <UploadActionCard 
                                                                    key={setting._id}
                                                                    setting={setting}
                                                                    upload={upload}
                                                                    onAction={handleAction}
                                                                    onDownload={handleDownload}
                                                                />
                                                            );
                                                        })}
                                                        {filteredSettings.length === 0 && (
                                                            <div className="text-gray-500 italic text-sm p-4 col-span-3">
                                                                No materials configured for this team's programme.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FinalReports;