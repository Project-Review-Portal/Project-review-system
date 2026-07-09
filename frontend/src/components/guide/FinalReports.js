import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FinalReports = () => {
    const [reports, setReports] = useState([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [selectedReportForReject, setSelectedReportForReject] = useState(null);
    const [rejectRemarks, setRejectRemarks] = useState('');

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

    const handleReject = async (e) => {
        e.preventDefault();
        if (!selectedReportForReject) return;
        try {
            await axios.put(`/api/guide/reports/${selectedReportForReject}/reject`, { remarks: rejectRemarks }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setMessage('Report rejected successfully');
            setSelectedReportForReject(null);
            setRejectRemarks('');
            fetchReports();
        } catch (err) {
            setError('Error rejecting report');
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
                            <React.Fragment key={report._id}>
                                <tr className="hover:bg-gray-50/50">
                                    <td className="py-3 px-4 border-b font-medium text-gray-900">{report.team.teamName}</td>
                                    <td className="py-3 px-4 border-b text-gray-700">{report.fileName}</td>
                                    <td className="py-3 px-4 border-b">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            report.status === 'approved' 
                                                ? 'bg-green-100 text-green-800' 
                                                : report.status === 'rejected'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 border-b">
                                        <button
                                            onClick={() => handleDownload(report._id, report.fileName)}
                                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs mr-2 transition duration-150"
                                        >
                                            Download
                                        </button>
                                        {report.status !== 'approved' && report.status !== 'rejected' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(report._id)}
                                                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs mr-2 transition duration-150"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => setSelectedReportForReject(report._id)}
                                                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition duration-150"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                                {report.rejections && report.rejections.length > 0 && (
                                    <tr>
                                        <td colSpan="4" className="bg-red-50/30 px-6 py-3 border-b">
                                            <div className="border-l-2 border-red-200 pl-4 space-y-2">
                                                <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider mb-2">Rejection History</h4>
                                                <div className="space-y-1.5">
                                                    {report.rejections.map((rej, idx) => (
                                                        <div key={idx} className="text-xs text-gray-700 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-b border-red-100/50 pb-1 last:border-0 last:pb-0">
                                                            <div className="flex-1">
                                                                <span className="font-semibold text-gray-900">File:</span> <span className="text-red-700 font-medium">{rej.fileName}</span> • <span className="font-semibold text-gray-900">Remarks:</span> <span className="italic text-gray-600">"{rej.remarks}"</span>
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap self-start">
                                                                {new Date(rej.rejectedAt).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Premium Rejection Modal */}
            {selectedReportForReject && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4">
                        <div className="flex items-center space-x-2 text-red-600 mb-4">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h3 className="text-lg font-bold text-gray-900">Reject Final Report</h3>
                        </div>
                        <form onSubmit={handleReject}>
                            <p className="text-sm text-gray-600 mb-4">
                                Please provide remarks explaining the reason for rejection. This feedback will be displayed to the student team.
                            </p>
                            <textarea
                                value={rejectRemarks}
                                onChange={(e) => setRejectRemarks(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
                                rows="4"
                                placeholder="Enter rejection reason..."
                                required
                            />
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedReportForReject(null);
                                        setRejectRemarks('');
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 font-semibold"
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinalReports; 