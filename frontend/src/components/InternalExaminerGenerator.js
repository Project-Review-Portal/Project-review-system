import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InternalExaminerGenerator = () => {
    const [formData, setFormData] = useState({});
    const [templateStructure, setTemplateStructure] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [templateStatus, setTemplateStatus] = useState(null);
    const [showGuide, setShowGuide] = useState(false);
    const [preparationGuide, setPreparationGuide] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);

    useEffect(() => {
        fetchTemplateStructure();
        checkTemplateStatus();
    }, []);

    const fetchTemplateStructure = async () => {
        try {
            const response = await axios.get('/api/internal-examiner/structure', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            setTemplateStructure(response.data.structure);
            
            // Initialize form data with default values
            const initialData = {};
            response.data.structure.fields.forEach(field => {
                initialData[field.name] = field.defaultValue || '';
            });
            setFormData(initialData);
            
        } catch (error) {
            setError('Error fetching template structure: ' + (error.response?.data?.message || error.message));
        }
    };

    const checkTemplateStatus = async () => {
        try {
            const response = await axios.get('/api/internal-examiner/status', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setTemplateStatus(response.data);
        } catch (error) {
            console.error('Error checking template status:', error);
        }
    };

    const loadSampleData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/internal-examiner/sample-data', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setFormData(response.data.sampleData);
            setSuccess('Sample data loaded successfully!');
        } catch (error) {
            setError('Error loading sample data: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const showPreparationGuide = async () => {
        try {
            const response = await axios.get('/api/internal-examiner/guide', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            setPreparationGuide(response.data.guide);
            setShowGuide(true);
        } catch (error) {
            setError('Error loading preparation guide: ' + (error.response?.data?.message || error.message));
        }
    };

    const validateFormData = () => {
        const errors = [];
        
        if (templateStructure?.fields) {
            templateStructure.fields.forEach(field => {
                if (field.required && (!formData[field.name] || formData[field.name].toString().trim() === '')) {
                    errors.push(`${field.label} is required`);
                }
            });
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleFieldChange = (fieldName, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
        
        // Clear validation errors when user starts typing
        if (validationErrors.length > 0) {
            setValidationErrors([]);
        }
    };

    const generateDocument = async () => {
        if (!validateFormData()) {
            setError('Please fix the validation errors before generating the document.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const response = await axios.post('/api/internal-examiner/generate', {
                data: formData
            }, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const filename = `Viva_Claim_Internal_Examiner_${formData.studentName?.replace(/\s+/g, '_') || 'Document'}_${new Date().toISOString().split('T')[0]}.docx`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setSuccess('Document generated and downloaded successfully!');
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            setError('Error generating document: ' + errorMessage);
            
            if (error.response?.data?.solution) {
                setError(prev => prev + '\n\nSolution: ' + error.response.data.solution);
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ready': return 'text-green-600 bg-green-100';
            case 'needs_preparation': return 'text-yellow-600 bg-yellow-100';
            case 'missing': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusMessage = (status) => {
        switch (status) {
            case 'ready': return '✅ Template is ready for use';
            case 'needs_preparation': return '⚠️ Template needs preparation';
            case 'missing': return '❌ Template file not found';
            default: return '🔄 Checking template status...';
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Viva Claim - Internal Examiner
                </h1>
                <p className="text-gray-600 mb-6">
                    Generate examination claim documents for internal examiners
                </p>

                {/* Template Status */}
                {templateStatus && (
                    <div className={`mb-6 p-4 rounded-lg ${getStatusColor(templateStatus.status)}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-medium">
                                {getStatusMessage(templateStatus.status)}
                            </span>
                            {templateStatus.status === 'needs_preparation' && (
                                <button
                                    onClick={showPreparationGuide}
                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Show Guide
                                </button>
                            )}
                        </div>
                        
                        {templateStatus.missingVariables?.length > 0 && (
                            <div className="mt-3 text-sm">
                                <p className="font-medium">Missing variables in template:</p>
                                <ul className="list-disc list-inside mt-1">
                                    {templateStatus.missingVariables.map(variable => (
                                        <li key={variable} className="text-red-700">{variable}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}



                {/* Error Messages */}
                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded whitespace-pre-line">
                        {error}
                    </div>
                )}

                {/* Success Messages */}
                {success && (
                    <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                        {success}
                    </div>
                )}

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                        <h4 className="font-semibold mb-2">Please fix the following errors:</h4>
                        <ul className="list-disc list-inside">
                            {validationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Form Fields */}
                {templateStructure && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Document Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templateStructure.fields.map(field => (
                                <div key={field.name} className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            value={formData[field.name] || ''}
                                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="3"
                                            placeholder={field.placeholder}
                                            required={field.required}
                                        />
                                    ) : (
                                        <input
                                            type={field.type}
                                            value={formData[field.name] || ''}
                                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder={field.placeholder}
                                            required={field.required}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Generate Button */}
                <div className="mt-6">
                    <button
                        onClick={generateDocument}
                        disabled={loading || templateStatus?.status !== 'ready'}
                        className={`w-full md:w-auto px-6 py-3 font-semibold rounded-md focus:outline-none focus:ring-2 ${
                            templateStatus?.status === 'ready' 
                                ? 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {loading ? 'Generating...' : 'Generate Document'}
                    </button>
                    
                    {templateStatus?.status !== 'ready' && (
                        <p className="mt-2 text-sm text-gray-600">
                            Template must be prepared before generating documents
                        </p>
                    )}
                </div>

                {/* Preparation Guide Modal */}
                {showGuide && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-4xl max-h-96 overflow-y-auto m-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Template Preparation Guide</h3>
                                <button
                                    onClick={() => setShowGuide(false)}
                                    className="text-gray-500 hover:text-gray-700 text-xl"
                                >
                                    ✕
                                </button>
                            </div>
                            <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded overflow-auto">
                                {preparationGuide}
                            </pre>
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => setShowGuide(false)}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InternalExaminerGenerator;
