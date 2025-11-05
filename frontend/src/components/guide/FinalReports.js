import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FinalReports = () => {
    const [reports, setReports] = useState([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const fetchReports = async () => {
        try {
            const res = await axios.get('/api/guide/reports', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setReports(res.data);
        } catch (err) {
            setError('Error fetching reports');
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleApprove = async (reportId) => {
        try {
            await axios.put(`/api/guide/reports/${reportId}/approve`, {}, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setMessage('Report approved successfully');
            fetchReports();
        } catch (err) {
            setError('Error approving report');
        }
    };

    const handleDownload = async (reportId, fileName) => {
        try {
            const res = await axios.get(`/api/guide/reports/${reportId}/download`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError('Error downloading report');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Final Reports</h2>
            {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{message}</div>}
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
            {reports.length === 0 && (
                <div className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded relative mb-4" role="status">
                    No reports uploaded yet
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead>
                        <tr>
                            <th className="py-2 px-4 border-b">Team Name</th>
                            <th className="py-2 px-4 border-b">File Name</th>
                            <th className="py-2 px-4 border-b">Status</th>
                            <th className="py-2 px-4 border-b">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report) => (
                            <tr key={report._id}>
                                <td className="py-2 px-4 border-b">{report.team.teamName}</td>
                                <td className="py-2 px-4 border-b">{report.fileName}</td>
                                <td className="py-2 px-4 border-b">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${report.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {report.status}
                                    </span>
                                </td>
                                <td className="py-2 px-4 border-b">
                                    <button
                                        onClick={() => handleDownload(report._id, report.fileName)}
                                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2"
                                    >
                                        Download
                                    </button>
                                    {report.status !== 'approved' && (
                                        <button
                                            onClick={() => handleApprove(report._id)}
                                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                                        >
                                            Approve
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinalReports; 