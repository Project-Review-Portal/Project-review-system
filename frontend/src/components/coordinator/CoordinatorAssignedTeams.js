import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626"; 

const CoordinatorAssignedTeams = () => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                setError('');
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Not authenticated. Please login again.');
                    setLoading(false);
                    return;
                }

                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                const selectedProgramme = storedUser.programme || 'UG';
                const res = await axios.get(`${SERVER_API_KEY}/api/panels/coordinator/coordinated-teams`, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'x-selected-programme': selectedProgramme 
                    }
                });

                setTeams(res.data || []);
            } catch (err) {
                if (err.response?.status === 404) {
                    setTeams([]);
                } else {
                    setError(err.response?.data?.message || 'Failed to load coordinated teams');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, []);

    const handleExportAttendance = async (type) => {
        try {
            setExporting(true);
            const token = localStorage.getItem('token');
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const prog = storedUser.programme || 'UG';
            const endpoint = type === 'zeroth' ? 'export-zeroth-attendance' : 'export-full-attendance';

            const response = await axios.get(
                `${SERVER_API_KEY}/api/panels/coordinator/${endpoint}?programme=${encodeURIComponent(prog)}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob'
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const fileName = type === 'zeroth' ? `Zeroth_Review_Attendance_${prog}.xlsx` : `Full_Review_Attendance_${prog}.xlsx`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading attendance:', err);
            alert('Failed to download attendance sheet.');
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <div className="text-center p-4">Loading assigned teams...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-2xl font-bold">Your Coordinated Teams</h2>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => handleExportAttendance('zeroth')}
                        disabled={exporting}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                        📥 Export Zeroth Attendance (Excel)
                    </button>
                    <button
                        onClick={() => handleExportAttendance('full')}
                        disabled={exporting}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                        📊 Export Full Attendance (Excel)
                    </button>
                </div>
            </div>
            {teams.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 font-medium">No panels or teams have been assigned to your coordinator workspace yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Once an admin assigns teams to your panel, they will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map(team => (
                        <div key={team._id} className="border p-4 rounded-lg shadow-sm">
                            <h3 className="font-semibold text-lg mb-2">Team: {team.teamName}</h3>
                            <p className="text-gray-700">Team Leader: {team.teamLeader?.name || 'N/A'} ({team.teamLeader?.username || 'N/A'})</p>
                            <p className="text-gray-700">Review Panel: {team.panelName || team.panel?.name || 'Not Assigned'}</p>
                            <p className="text-gray-700">Viva Panel: {team.vivaPanel?.name || 'Not Assigned'}</p>
                            <p className="text-gray-700">Guide: {team.guidePreference?.name || 'Not Assigned'}</p>
                            <div className="mt-2">
                                <p className="font-medium">Members:</p>
                                {team.members && team.members.length > 0 ? (
                                    <ul className="list-disc list-inside ml-4 text-gray-700">
                                        {team.members.map(member => (
                                            <li key={member._id}>{member.name || member.username}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500">No members listed.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CoordinatorAssignedTeams;