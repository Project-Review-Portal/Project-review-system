import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const DocumentGeneratorPage = () => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [templateStructure, setTemplateStructure] = useState(null);
    const [formData, setFormData] = useState({});
    const [tableData, setTableData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showGuide, setShowGuide] = useState(false);
    const [preparationGuide, setPreparationGuide] = useState('');
    const [validationErrors, setValidationErrors] = useState([]);

    // Check if user is coordinator
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Fetch available templates on component mount
    useEffect(() => {
        fetchTemplates();
    }, []);
    
    // Redirect if not coordinator
    if (!token || !user || user.role !== 'coordinator') {
        return <Navigate to="/coordinator-dashboard/dashboard" replace />;
    }

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/documents/templates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            setTemplates(response.data.templates);
        } catch (error) {
            setError('Error fetching templates: ' + (error.response?.data?.message || error.message));
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch template structure when template is selected
    const handleTemplateSelect = async (templateId) => {
        if (!templateId) {
            setSelectedTemplate('');
            setTemplateStructure(null);
            setFormData({});
            setTableData({});
            setShowGuide(false);
            setValidationErrors([]);
            return;
        }

        try {
            setLoading(true);
            setSelectedTemplate(templateId);
            setError('');
            setSuccess('');
            setValidationErrors([]);
            
            const response = await axios.get(`/api/documents/templates/${templateId}/structure`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            setTemplateStructure(response.data.structure);
            
            // Initialize form data
            const initialFormData = {};
            if (response.data.structure.fields) {
                response.data.structure.fields.forEach(field => {
                    initialFormData[field.name] = field.type === 'date' ? new Date().toISOString().split('T')[0] : '';
                });
            }
            setFormData(initialFormData);

            // Initialize table data
            const initialTableData = {};
            if (response.data.structure.tables) {
                response.data.structure.tables.forEach(table => {
                    const initialRow = {};
                    // Initialize nested tables if they exist
                    if (table.nested_tables) {
                        table.nested_tables.forEach(nestedTable => {
                            initialRow[nestedTable.name] = [{}];
                        });
                    }
                    initialTableData[table.name] = [initialRow];
                });
            }
            setTableData(initialTableData);

        } catch (error) {
            setError('Error fetching template structure: ' + (error.response?.data?.message || error.message));
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load sample data for testing
    const loadSampleData = async () => {
        if (!selectedTemplate) return;

        try {
            setLoading(true);
            const response = await axios.get(`/api/documents/templates/${selectedTemplate}/sample-data`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const sampleData = response.data.sampleData;
            
            // Load form data
            const newFormData = { ...formData };
            Object.keys(sampleData).forEach(key => {
                if (!Array.isArray(sampleData[key])) {
                    newFormData[key] = sampleData[key];
                }
            });
            setFormData(newFormData);

            // Load table data
            const newTableData = { ...tableData };
            Object.keys(sampleData).forEach(key => {
                if (Array.isArray(sampleData[key])) {
                    newTableData[key] = sampleData[key];
                }
            });
            setTableData(newTableData);

            setSuccess('Sample data loaded successfully!');
        } catch (error) {
            setError('Error loading sample data: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Show preparation guide
    const showPreparationGuide = async () => {
        if (!selectedTemplate) return;

        try {
            setLoading(true);
            const response = await axios.get(`/api/documents/templates/${selectedTemplate}/guide`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            setPreparationGuide(response.data.guide);
            setShowGuide(true);
        } catch (error) {
            setError('Error loading preparation guide: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Validate form data
    const validateFormData = () => {
        const errors = [];
        
        if (templateStructure?.fields) {
            templateStructure.fields.forEach(field => {
                if (field.required && (!formData[field.name] || formData[field.name].toString().trim() === '')) {
                    errors.push(`${field.label} is required`);
                }
            });
        }

        if (templateStructure?.tables) {
            templateStructure.tables.forEach(table => {
                if (tableData[table.name] && tableData[table.name].length > 0) {
                    tableData[table.name].forEach((row, index) => {
                        table.columns.forEach(column => {
                            if (column.required && (!row[column.name] || row[column.name].toString().trim() === '')) {
                                errors.push(`${table.label}, Row ${index + 1}: ${column.label} is required`);
                            }
                        });
                    });
                }
            });
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    // Handle form field changes
    const handleFieldChange = (fieldName, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    // Handle table data changes
    const handleTableChange = (tableName, rowIndex, columnName, value) => {
        setTableData(prev => ({
            ...prev,
            [tableName]: prev[tableName].map((row, index) => 
                index === rowIndex 
                    ? { ...row, [columnName]: value }
                    : row
            )
        }));
    };

    // Handle nested table data changes
    const handleNestedTableChange = (parentTableName, parentRowIndex, nestedTableName, nestedRowIndex, columnName, value) => {
        setTableData(prev => ({
            ...prev,
            [parentTableName]: prev[parentTableName].map((parentRow, parentIndex) => {
                if (parentIndex === parentRowIndex) {
                    const nestedData = parentRow[nestedTableName] || [{}];
                    return {
                        ...parentRow,
                        [nestedTableName]: nestedData.map((nestedRow, nestedIndex) =>
                            nestedIndex === nestedRowIndex
                                ? { ...nestedRow, [columnName]: value }
                                : nestedRow
                        )
                    };
                }
                return parentRow;
            })
        }));
    };

    // Add row to table
    const addTableRow = (tableName) => {
        setTableData(prev => ({
            ...prev,
            [tableName]: [...prev[tableName], {}]
        }));
    };

    // Add row to nested table
    const addNestedTableRow = (parentTableName, parentRowIndex, nestedTableName) => {
        setTableData(prev => ({
            ...prev,
            [parentTableName]: prev[parentTableName].map((parentRow, parentIndex) => {
                if (parentIndex === parentRowIndex) {
                    const nestedData = parentRow[nestedTableName] || [];
                    return {
                        ...parentRow,
                        [nestedTableName]: [...nestedData, {}]
                    };
                }
                return parentRow;
            })
        }));
    };

    // Remove row from table
    const removeTableRow = (tableName, rowIndex) => {
        setTableData(prev => ({
            ...prev,
            [tableName]: prev[tableName].filter((_, index) => index !== rowIndex)
        }));
    };

    // Remove row from nested table
    const removeNestedTableRow = (parentTableName, parentRowIndex, nestedTableName, nestedRowIndex) => {
        setTableData(prev => ({
            ...prev,
            [parentTableName]: prev[parentTableName].map((parentRow, parentIndex) => {
                if (parentIndex === parentRowIndex) {
                    const nestedData = parentRow[nestedTableName] || [];
                    return {
                        ...parentRow,
                        [nestedTableName]: nestedData.filter((_, nestedIndex) => nestedIndex !== nestedRowIndex)
                    };
                }
                return parentRow;
            })
        }));
    };

    // Generate document
    const generateDocument = async () => {
        if (!selectedTemplate) {
            setError('Please select a template');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            // Prepare data for document generation
            const documentData = {
                ...formData,
                ...tableData
            };

            const response = await axios.post('/api/documents/generate', {
                templateId: selectedTemplate,
                data: documentData,
                filename: `${selectedTemplate}_${new Date().toISOString().split('T')[0]}.docx`
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
            link.setAttribute('download', `${selectedTemplate}_${new Date().toISOString().split('T')[0]}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setSuccess('Document generated successfully!');
        } catch (error) {
            setError('Error generating document: ' + (error.response?.data?.message || error.message));
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Document Generator</h1>

                {/* Template Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Template
                    </label>
                    <select
                        value={selectedTemplate}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                    >
                        <option value="">Select a template...</option>
                        {templates.map(template => (
                            <option key={template.id} value={template.id}>
                                {template.name}
                            </option>
                        ))}
                    </select>
                </div>



                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                        <h4 className="font-semibold mb-2">Validation Errors:</h4>
                        <ul className="list-disc list-inside">
                            {validationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Preparation Guide Modal */}
                {showGuide && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-4xl max-h-96 overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Template Preparation Guide</h3>
                                <button
                                    onClick={() => setShowGuide(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                            <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded overflow-auto">
                                {preparationGuide}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Error/Success Messages */}
                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                        {success}
                    </div>
                )}

                {/* Loading Spinner */}
                {loading && (
                    <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <p className="mt-2 text-gray-600">Loading...</p>
                    </div>
                )}

                {/* Form Fields */}
                {templateStructure && templateStructure.fields && (
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
                                            required={field.required}
                                        />
                                    ) : (
                                        <input
                                            type={field.type}
                                            value={formData[field.name] || ''}
                                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required={field.required}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tables */}
                {templateStructure && templateStructure.tables && templateStructure.tables.map(table => (
                    <div key={table.name} className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">{table.label}</h3>
                            <button
                                onClick={() => addTableRow(table.name)}
                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                Add Row
                            </button>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {table.columns.map(column => (
                                            <th key={column.name} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                                {column.label}
                                            </th>
                                        ))}
                                        {table.nested_tables && (
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                                {table.nested_tables.map(nt => nt.label).join(' / ')}
                                            </th>
                                        )}
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData[table.name] && tableData[table.name].map((row, rowIndex) => (
                                        <tr key={rowIndex} className="border-b">
                                            {table.columns.map(column => (
                                                <td key={column.name} className="px-4 py-2">
                                                    <input
                                                        type={column.type}
                                                        value={row[column.name] || ''}
                                                        onChange={(e) => handleTableChange(table.name, rowIndex, column.name, e.target.value)}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder={column.label}
                                                    />
                                                </td>
                                            ))}
                                            {table.nested_tables && (
                                                <td className="px-4 py-2">
                                                    {table.nested_tables.map(nestedTable => (
                                                        <div key={nestedTable.name} className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <h4 className="text-sm font-medium text-gray-700">{nestedTable.label}</h4>
                                                                <button
                                                                    onClick={() => addNestedTableRow(table.name, rowIndex, nestedTable.name)}
                                                                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                                                >
                                                                    Add
                                                                </button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {(row[nestedTable.name] || [{}]).map((nestedRow, nestedRowIndex) => (
                                                                    <div key={nestedRowIndex} className="flex items-center space-x-2">
                                                                        {nestedTable.columns.map(nestedColumn => (
                                                                            <div key={nestedColumn.name} className="flex-1">
                                                                                <input
                                                                                    type={nestedColumn.type}
                                                                                    value={nestedRow[nestedColumn.name] || ''}
                                                                                    onChange={(e) => handleNestedTableChange(table.name, rowIndex, nestedTable.name, nestedRowIndex, nestedColumn.name, e.target.value)}
                                                                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                                                                                    placeholder={nestedColumn.label}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                        <button
                                                                            onClick={() => removeNestedTableRow(table.name, rowIndex, nestedTable.name, nestedRowIndex)}
                                                                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                                                            disabled={(row[nestedTable.name] || []).length <= 1}
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </td>
                                            )}
                                            <td className="px-4 py-2">
                                                <button
                                                    onClick={() => removeTableRow(table.name, rowIndex)}
                                                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                                                    disabled={tableData[table.name].length <= 1}
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

                {/* Generate Button */}
                {templateStructure && (
                    <div className="mt-6">
                        <button
                            onClick={generateDocument}
                            disabled={loading}
                            className="w-full md:w-auto px-6 py-3 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Generating...' : 'Generate Document'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentGeneratorPage;
