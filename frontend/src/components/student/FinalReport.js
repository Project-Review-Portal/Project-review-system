import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY= process.env.REACT_APP_SERVER_API_KEY ||"http://localhost:3626";

const FinalReport = () => {
    const [file, setFile] = useState(null);
    const [reportStatus, setReportStatus] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchTeamAndReport = async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
            
            try {
                const teamRes = await axios.get(`${SERVER_API_KEY}/api/teams/my-team`, { headers });
                setTeam(teamRes.data);
            } catch (err) {
                // Ignore if team not found
            }

            try {
                const res = await axios.get(`${SERVER_API_KEY}/api/teams/report/status`, { headers });
                setReportStatus(res.data);
            } catch (err) {
                if (err.response && err.response.status !== 404) {
                    setError('Error fetching report status');
                }
                setReportStatus(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamAndReport();
    }, []);

    const onFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('report', file);

        try {
            const res = await axios.post(`${SERVER_API_KEY}/api/teams/report/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setMessage('Report uploaded successfully!');
            setError('');
            fetchTeamAndReport();
        } catch (err) {
            setError(err.response?.data?.message || 'Error uploading report');
            setMessage('');
        }
    };

    if (loading) {
        return <div className="text-center mt-10">Loading...</div>;
    }

    if (!team) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Notice: </strong>
                    <span className="block sm:inline">You are not part of any team. Please form or join a team first.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Final Report Submission</h2>
            {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{message}</div>}
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            {reportStatus ? (
                <div>
                    <h3 className="text-xl font-semibold mb-3">Report Status</h3>
                    <div className={`p-4 rounded-lg mb-6 ${
                        reportStatus.status === 'approved' 
                            ? 'bg-green-50 border border-green-200 text-green-800' 
                            : reportStatus.status === 'rejected'
                                ? 'bg-red-50 border border-red-200 text-red-800'
                                : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                    }`}>
                        <p className="mb-2"><strong>File Name:</strong> {reportStatus.fileName}</p>
                        <p className="mb-2"><strong>Status:</strong> <span className="capitalize font-bold">{reportStatus.status}</span></p>
                        <p className="mb-2"><strong>Uploaded At:</strong> {new Date(reportStatus.createdAt).toLocaleString()}</p>
                        {reportStatus.status === 'rejected' && reportStatus.rejectedAt && (
                            <p className="mb-2"><strong>Rejected At:</strong> {new Date(reportStatus.rejectedAt).toLocaleString()}</p>
                        )}
                        {reportStatus.status === 'rejected' && reportStatus.remarks && (
                            <div className="mt-3 bg-white p-3 rounded-lg border border-red-200 text-red-800 shadow-sm text-sm">
                                <strong>Rejection Remarks from Guide:</strong> {reportStatus.remarks}
                            </div>
                        )}
                    </div>
                    {reportStatus.status === 'rejected' && (
                        <div className="mt-6 border-t pt-6">
                            <h4 className="text-lg font-semibold mb-4 text-gray-900">Upload Revised Report</h4>
                            {!team.isLocked ? (
                                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                                    <strong className="font-bold">Notice: </strong>
                                    <span className="block sm:inline">Your team must be locked to upload a revised report.</span>
                                </div>
                            ) : (
                                <form onSubmit={onSubmit}>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="report">
                                            Select Revised Report (PDF only)
                                        </label>
                                        <input
                                            type="file"
                                            id="report"
                                            onChange={onFileChange}
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white"
                                            accept="application/pdf"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                    >
                                        Upload Revised Report
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Rejection History List for Students */}
                    {reportStatus.rejections && reportStatus.rejections.length > 0 && (
                        <div className="mt-8 border-t pt-6 bg-white p-5 rounded-lg shadow-sm">
                            <h4 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-1.5 border-b pb-2">
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Rejection History Log
                            </h4>
                            <div className="space-y-3">
                                {reportStatus.rejections.map((rej, idx) => (
                                    <div key={idx} className="border-l-4 border-red-200 pl-4 py-2 bg-gray-50/50 rounded-r-lg">
                                        <div className="flex flex-wrap justify-between items-center text-xs text-gray-500 mb-1 gap-1">
                                            <span className="font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                Attempt #{idx + 1}
                                            </span>
                                            <span className="font-medium text-gray-400">
                                                {new Date(rej.rejectedAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-1">
                                            <strong>File:</strong> <span className="text-gray-600 font-mono text-xs">{rej.fileName}</span>
                                        </p>
                                        <p className="text-sm text-gray-700 italic bg-white p-2.5 rounded border border-gray-150">
                                            "{rej.remarks || 'No remarks provided.'}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : !team.isLocked ? (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Notice: </strong>
                    <span className="block sm:inline">Your team must be locked before you can upload the final report.</span>
                </div>
            ) : (
                <form onSubmit={onSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="report">
                            Upload Report (PDF only)
                        </label>
                        <input
                            type="file"
                            id="report"
                            onChange={onFileChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            accept="application/pdf"
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                        Upload
                    </button>
                </form>
            )}
        </div>
    );
};

export default FinalReport; 