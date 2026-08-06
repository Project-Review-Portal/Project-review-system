import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../../utils/toast';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

const FinalReport = () => {
    const [settings, setSettings] = useState([]);
    const [uploads, setUploads] = useState([]);
    const [files, setFiles] = useState({});
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (error) {
            toast.error(error);
            setError('');
        }
    }, [error]);

    useEffect(() => {
        if (message) {
            toast.success(message);
            setMessage('');
        }
    }, [message]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
            
            try {
                const teamRes = await axios.get(`${SERVER_API_KEY}/api/teams/my-team`, { headers });
                setTeam(teamRes.data);
            } catch (err) {
                // Ignore fallback if team fetch fails
            }

            try {
                const reqsRes = await axios.get(`${SERVER_API_KEY}/api/materials/student/requirements`, { headers });
                setSettings(reqsRes.data.settings || []);
                setUploads(reqsRes.data.uploads || []);
            } catch (err) {
                if (err.response && err.response.status !== 404) {
                    setError('Error fetching requirements');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onFileChange = (settingId, e) => {
        setFiles({ ...files, [settingId]: e.target.files[0] });
    };

    const onSubmit = async (settingId, e) => {
        e.preventDefault();
        const file = files[settingId];
        if (!file) {
            setError('Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('material', file);

        try {
            await axios.post(`${SERVER_API_KEY}/api/materials/student/upload/${settingId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setMessage('Material uploaded successfully as draft!');
            setError('');
            
            // Clear selected file slot
            setFiles(prev => {
                const newFiles = { ...prev };
                delete newFiles[settingId];
                return newFiles;
            });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Error uploading material');
            setMessage('');
        }
    };

    const handleFinalSubmit = async () => {
        if (!window.confirm("Are you sure you want to submit all draft files to the coordinator/guide? Once submitted, you won't be able to edit them unless they are rejected.")) {
            return;
        }
        setSubmitting(true);
        try {
            const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
            const res = await axios.put(`${SERVER_API_KEY}/api/materials/student/submit`, {}, { headers });
            setMessage(res.data.message || 'All drafts submitted successfully!');
            setError('');
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Error submitting materials');
            setMessage('');
        } finally {
            setSubmitting(false);
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

    // Check if there are any current drafts that can be submitted
    const hasDrafts = uploads.some(u => u.status === 'draft');

    // Business Logic Validation: A required file is missing if there is no upload record OR its status is 'rejected'
    const missingRequiredFiles = settings
        .filter(setting => setting.isRequired)
        .some(setting => {
            return !uploads.some(u => {
                const uploadedSettingId = u.materialSetting?._id
                    ? u.materialSetting._id.toString()
                    : u.materialSetting?.toString();
                
                return uploadedSettingId === setting._id.toString() && u.status !== 'rejected';
            });
        });

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <h2 className="text-2xl font-bold mb-4">Required Materials / Uploads</h2>


            {!team.isLocked && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Notice: </strong>
                    <span className="block sm:inline">Your team must be locked before you can upload materials.</span>
                </div>
            )}

            {settings.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded text-blue-700">
                    No materials have been requested by your coordinator yet.
                </div>
            ) : (
                <div className="space-y-6">
                    {settings.map(setting => {
                        const upload = uploads.find(u => {
                            const settingId = u.materialSetting?._id
                                ? u.materialSetting._id.toString()
                                : u.materialSetting?.toString();
                            return settingId === setting._id.toString();
                        });
                        
                        return (
                            <div key={setting._id} className="bg-white border rounded-lg shadow-sm p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {setting.name} 
                                            {setting.isRequired && <span className="text-red-500 ml-1" title="Required">*</span>}
                                        </h3>
                                        <div className="text-sm text-gray-500">
                                            Required: {setting.isRequired ? 'Yes' : 'No'} | Format: {Array.isArray(setting.fileType) ? setting.fileType.map(t => `.${t}`).join(', ') : setting.fileType}
                                        </div>
                                    </div>
                                    {upload && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                            upload.status === 'approved' ? 'bg-green-100 text-green-800' :
                                            upload.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                            upload.status === 'draft' ? 'bg-blue-100 text-blue-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {upload.status}
                                        </span>
                                    )}
                                </div>

                                {upload && (
                                    <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
                                        <div className="mb-1"><strong>File:</strong> {upload.fileName}</div>
                                        <div className="mb-1"><strong>Uploaded:</strong> {new Date(upload.createdAt).toLocaleString()}</div>
                                        
                                        {upload.status === 'rejected' && upload.remarks && (
                                            <div className="mt-2 text-red-700 bg-red-50 p-2 border border-red-200 rounded">
                                                <strong>Rejection Remarks:</strong> {upload.remarks}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(!upload || upload.status === 'draft' || upload.status === 'rejected') && team.isLocked && (
                                    <form onSubmit={(e) => onSubmit(setting._id, e)} className="mt-4 border-t pt-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-grow">
                                                <input
                                                    type="file"
                                                    onChange={(e) => onFileChange(setting._id, e)}
                                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                    accept={Array.isArray(setting.fileType) ? setting.fileType.map(t => `.${t}`).join(',') : `.${setting.fileType}`}
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline whitespace-nowrap"
                                            >
                                                {upload ? 'Upload Revision (Draft)' : 'Upload File (Draft)'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {upload && upload.status === 'approved' && (
                                    <div className="text-green-600 text-sm italic border-t pt-3 mt-3">
                                        This material has been approved and can no longer be modified.
                                    </div>
                                )}

                                {upload && (upload.status === 'uploaded' || upload.status === 'pending') && (
                                    <div className="text-yellow-600 text-sm italic border-t pt-3 mt-3">
                                        Submitted to coordinator. Awaiting review.
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {hasDrafts && (
                        <div className={`mt-8 p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors duration-200 ${
                            missingRequiredFiles 
                                ? 'bg-red-50 border-red-200' 
                                : 'bg-indigo-50 border-indigo-200'
                        }`}>
                            <div>
                                <h3 className={`font-semibold text-base ${missingRequiredFiles ? 'text-red-900' : 'text-indigo-900'}`}>
                                    {missingRequiredFiles ? 'Submission Incomplete' : 'Ready to Submit?'}
                                </h3>
                                {missingRequiredFiles ? (
                                    <p className="text-sm text-red-700 font-medium">
                                        Please re-upload a revision for any rejected file(s) and complete all required documents before final submission.
                                    </p>
                                ) : (
                                    <p className="text-sm text-indigo-700">
                                        You have files saved as draft. Click submit to send them to the coordinator/guide.
                                    </p>
                                )}
                            </div>
                            <button
                                id="submit-materials-btn"
                                onClick={handleFinalSubmit}
                                disabled={submitting || missingRequiredFiles}
                                className={`font-bold py-2.5 px-6 rounded-lg shadow-md transition-all duration-150 whitespace-nowrap text-white ${
                                    missingRequiredFiles || submitting 
                                        ? 'bg-gray-400 cursor-not-allowed opacity-70 shadow-none' 
                                        : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                {submitting ? 'Submitting...' : 'Submit to Coordinator'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FinalReport;