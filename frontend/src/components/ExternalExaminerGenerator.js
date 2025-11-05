import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ExternalExaminerGenerator = () => {
    const [formData, setFormData] = useState({});
    const [templateStructure, setTemplateStructure] = useState(null);
    const [templateStatus, setTemplateStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [students, setStudents] = useState([{ slNo: '1', studentName: '', rollNumber: '', projectTitle: '', marks: '' }]);

    useEffect(() => {
        fetchTemplateStructure();
        checkTemplateStatus();
    }, []);

    const fetchTemplateStructure = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/external-examiner/structure');
            setTemplateStructure(response.data.structure);
            
            // Initialize form data with default values
            const initialData = {};
            response.data.structure.fields.forEach(field => {
                initialData[field.name] = field.defaultValue || '';
            });
            setFormData(initialData);
        } catch (error) {
            console.error('Error fetching template structure:', error);
            setError('Failed to load template structure');
        }
    };

    const checkTemplateStatus = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/external-examiner/status');
            setTemplateStatus(response.data);
        } catch (error) {
            console.error('Error checking template status:', error);
        }
    };

    const loadSampleData = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/external-examiner/sample-data');
            const sampleData = response.data.sampleData;
            
            setFormData({
                examinerName: sampleData.examinerName,
                designation: sampleData.designation,
                organization: sampleData.organization,
                address: sampleData.address,
                phone: sampleData.phone,
                email: sampleData.email,
                date: sampleData.date,
                examDate: sampleData.examDate,
                examTime: sampleData.examTime,
                venue: sampleData.venue,
                travelDistance: sampleData.travelDistance,
                honorarium: sampleData.honorarium,
                travelAllowance: sampleData.travelAllowance,
                course: sampleData.course,
                semester: sampleData.semester,
                subject: sampleData.subject
            });
            
            setStudents(sampleData.students);
            setSuccess('Sample data loaded successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Error loading sample data:', error);
            setError('Failed to load sample data');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleStudentChange = (index, field, value) => {
        const updatedStudents = [...students];
        updatedStudents[index][field] = value;
        
        // Auto-generate serial number
        if (field !== 'slNo') {
            updatedStudents[index].slNo = (index + 1).toString();
        }
        
        setStudents(updatedStudents);
    };

    const addStudent = () => {
        const newStudent = {
            slNo: (students.length + 1).toString(),
            studentName: '',
            rollNumber: '',
            projectTitle: '',
            marks: ''
        };
        setStudents([...students, newStudent]);
    };

    const removeStudent = (index) => {
        if (students.length > 1) {
            const updatedStudents = students.filter((_, i) => i !== index);
            // Re-number the remaining students
            updatedStudents.forEach((student, i) => {
                student.slNo = (i + 1).toString();
            });
            setStudents(updatedStudents);
        }
    };

    const validateForm = () => {
        const errors = [];
        
        // Validate required fields
        if (templateStructure) {
            templateStructure.fields.forEach(field => {
                if (field.required && (!formData[field.name] || formData[field.name].toString().trim() === '')) {
                    errors.push(`${field.label} is required`);
                }
            });
        }

        // Validate students
        if (students.length === 0) {
            errors.push('At least one student is required');
        } else {
            students.forEach((student, index) => {
                if (!student.studentName || student.studentName.trim() === '') {
                    errors.push(`Student ${index + 1}: Name is required`);
                }
                if (!student.rollNumber || student.rollNumber.trim() === '') {
                    errors.push(`Student ${index + 1}: Roll Number is required`);
                }
                if (!student.projectTitle || student.projectTitle.trim() === '') {
                    errors.push(`Student ${index + 1}: Project Title is required`);
                }
            });
        }

        return errors;
    };

    const generateDocument = async () => {
        setError('');
        setSuccess('');

        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            setError(validationErrors.join(', '));
            return;
        }

        setLoading(true);

        try {
            const documentData = {
                ...formData,
                students: students
            };

            const response = await axios.post('http://localhost:5000/api/external-examiner/generate', {
                data: documentData,
                filename: `Viva_Claim_External_Examiner_${formData.examinerName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`
            }, {
                responseType: 'blob'
            });

            // Create blob and download
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Viva_Claim_External_Examiner_${formData.examinerName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setSuccess('Document generated and downloaded successfully!');
        } catch (error) {
            console.error('Error generating document:', error);
            if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError('Failed to generate document. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const renderTemplateStatus = () => {
        if (!templateStatus) return null;

        const getStatusColor = (status) => {
            switch (status) {
                case 'ready': return 'text-green-600 bg-green-50';
                case 'needs_preparation': return 'text-yellow-600 bg-yellow-50';
                case 'needs_table_setup': return 'text-orange-600 bg-orange-50';
                case 'missing': return 'text-red-600 bg-red-50';
                default: return 'text-gray-600 bg-gray-50';
            }
        };

        return (
            <div className={`p-4 rounded-lg mb-6 ${getStatusColor(templateStatus.status)}`}>
                <h3 className="font-semibold mb-2">Template Status: {templateStatus.status.replace('_', ' ').toUpperCase()}</h3>
                <p className="mb-2">{templateStatus.message}</p>
                
                {templateStatus.status !== 'ready' && (
                    <div className="mt-3">
                        <p className="font-medium">Next Steps:</p>
                        <ul className="list-disc list-inside mt-1 text-sm">
                            {templateStatus.status === 'missing' && (
                                <li>Upload the "Viva claim External Examiner.docx" template to the templates folder</li>
                            )}
                            {templateStatus.status === 'needs_table_setup' && (
                                <>
                                    <li>Set up the students table with loop tags: {'{#students}'} and {'{/students}'}</li>
                                    <li>Replace table cell contents with: {'{slNo}'}, {'{studentName}'}, {'{rollNumber}'}, {'{projectTitle}'}, {'{marks}'}</li>
                                </>
                            )}
                            {templateStatus.status === 'needs_preparation' && (
                                <li>Replace placeholder text with template variables as shown in the preparation guide</li>
                            )}
                        </ul>
                        <button
                            onClick={() => window.open('http://localhost:5000/api/external-examiner/guide', '_blank')}
                            className="mt-2 text-sm underline hover:no-underline"
                        >
                            View Preparation Guide
                        </button>
                    </div>
                )}
                
                {templateStatus.detectedVariables && (
                    <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium">Detected Variables ({templateStatus.detectedVariables.length})</summary>
                        <div className="mt-2 text-xs">
                            <div className="grid grid-cols-3 gap-1">
                                {templateStatus.detectedVariables.map(variable => (
                                    <span key={variable} className="bg-white px-2 py-1 rounded text-gray-700">
                                        {'{' + variable + '}'}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </details>
                )}
            </div>
        );
    };

    if (!templateStructure) {
        return <div className="p-6">Loading template structure...</div>;
    }

    return (
        <>
        <div className="max-w-4xl mx-auto p-6 bg-white">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">External Examiner Document Generator</h1>
            
            {renderTemplateStatus()}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                    {success}
                </div>
            )}


            </div>

            <form className="space-y-6">
                {/* Examiner Information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Examiner Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {templateStructure.fields.slice(0, 6).map(field => (
                            <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        name={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={handleInputChange}
                                        placeholder={field.placeholder}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows="3"
                                    />
                                ) : (
                                    <input
                                        type={field.type}
                                        name={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={handleInputChange}
                                        placeholder={field.placeholder}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Examination Details */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Examination Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {templateStructure.fields.slice(6, 12).map(field => (
                            <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type={field.type}
                                    name={field.name}
                                    value={formData[field.name] || ''}
                                    onChange={handleInputChange}
                                    placeholder={field.placeholder}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Financial Details */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Financial Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {templateStructure.fields.slice(12, 15).map(field => (
                            <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type={field.type}
                                    name={field.name}
                                    value={formData[field.name] || ''}
                                    onChange={handleInputChange}
                                    placeholder={field.placeholder}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Course Information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Course Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {templateStructure.fields.slice(15).map(field => (
                            <div key={field.name}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                    type={field.type}
                                    name={field.name}
                                    value={formData[field.name] || ''}
                                    onChange={handleInputChange}
                                    placeholder={field.placeholder}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Students Table */}
                <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-800">Students to be Examined</h3>
                        <button
                            type="button"
                            onClick={addStudent}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        >
                            Add Student
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-3 py-2 text-left">Sl. No.</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Student Name *</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Roll Number *</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Project Title *</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Marks</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student, index) => (
                                    <tr key={index}>
                                        <td className="border border-gray-300 px-3 py-2">
                                            <input
                                                type="text"
                                                value={student.slNo}
                                                onChange={(e) => handleStudentChange(index, 'slNo', e.target.value)}
                                                className="w-full border-none bg-transparent focus:outline-none"
                                                readOnly
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2">
                                            <input
                                                type="text"
                                                value={student.studentName}
                                                onChange={(e) => handleStudentChange(index, 'studentName', e.target.value)}
                                                placeholder="Student Name"
                                                className="w-full border-none bg-transparent focus:outline-none"
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2">
                                            <input
                                                type="text"
                                                value={student.rollNumber}
                                                onChange={(e) => handleStudentChange(index, 'rollNumber', e.target.value)}
                                                placeholder="Roll Number"
                                                className="w-full border-none bg-transparent focus:outline-none"
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2">
                                            <input
                                                type="text"
                                                value={student.projectTitle}
                                                onChange={(e) => handleStudentChange(index, 'projectTitle', e.target.value)}
                                                placeholder="Project Title"
                                                className="w-full border-none bg-transparent focus:outline-none"
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2">
                                            <input
                                                type="number"
                                                value={student.marks}
                                                onChange={(e) => handleStudentChange(index, 'marks', e.target.value)}
                                                placeholder="Marks"
                                                className="w-full border-none bg-transparent focus:outline-none"
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2">
                                            {students.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeStudent(index)}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Generate Button */}
                <div className="text-center">
                    <button
                        type="button"
                        onClick={generateDocument}
                        disabled={loading || templateStatus?.status !== 'ready'}
                        className={`px-8 py-3 rounded-lg font-semibold ${
                            loading || templateStatus?.status !== 'ready'
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {loading ? 'Generating Document...' : 'Generate External Examiner Document'}
                    </button>
                    
                    {templateStatus?.status !== 'ready' && (
                        <p className="mt-2 text-sm text-gray-600">
                            Template must be prepared before generating documents
                        </p>
                    )}
                </div>
            </form>
            </>
        
                );
};

export default ExternalExaminerGenerator;
