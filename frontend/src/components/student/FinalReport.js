import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FinalReport = () => {
    const [file, setFile] = useState(null);
    const [reportStatus, setReportStatus] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const fetchReportStatus = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/teams/report/status', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setReportStatus(res.data);
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                setError('Error fetching report status');
            }
            setReportStatus(null);
        }
    };

    useEffect(() => {
        fetchReportStatus();
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
            const res = await axios.post('http://localhost:5000/api/teams/report/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setMessage('Report uploaded successfully!');
            setError('');
            fetchReportStatus();
        } catch (err) {
            setError(err.response?.data?.message || 'Error uploading report');
            setMessage('');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Final Report Submission</h2>
            {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{message}</div>}
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            {reportStatus ? (
                <div>
                    <h3 className="text-xl font-semibold">Report Status</h3>
                    <p><strong>File Name:</strong> {reportStatus.fileName}</p>
                    <p><strong>Status:</strong> <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reportStatus.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{reportStatus.status}</span></p>
                    <p><strong>Uploaded At:</strong> {new Date(reportStatus.createdAt).toLocaleString()}</p>
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