const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const AdvancedDocumentProcessor = require('../utils/advancedDocumentProcessor');

class DocumentController {
    constructor() {
        this.templatesPath = path.join(__dirname, '..', 'uploads', 'templates');
        this.outputPath = path.join(__dirname, '..', 'uploads', 'generated');
        this.processor = new AdvancedDocumentProcessor();
        
        // Ensure output directory exists
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, { recursive: true });
        }
    }

    // Get list of available templates
    async getTemplates(req, res) {
        try {
            const templates = fs.readdirSync(this.templatesPath)
                .filter(file => file.endsWith('.docx'))
                .map(file => ({
                    id: file.replace('.docx', ''),
                    name: file.replace('.docx', '').replace(/_/g, ' '),
                    filename: file
                }));

            res.json({
                success: true,
                templates
            });
            } catch (error) {
            console.error('Error getting templates:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving templates'
            });
        }
    }

    // Generate document from template
    async generateDocument(req, res) {
        try {
            const { templateId, data, filename } = req.body;

            if (!templateId || !data) {
                return res.status(400).json({
                    success: false,
                    message: 'Template ID and data are required'
                });
            }

            const templatePath = path.join(this.templatesPath, `${templateId}.docx`);
            
            if (!fs.existsSync(templatePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Template not found'
                });
            }

            // Backup template
            const backupPath = this.processor.backupTemplate(templatePath);
            
            // Validate data against template structure
            const structure = this.getTemplateStructureData(templateId);
            const validationErrors = this.processor.validateTemplateData(data, structure);
            
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation errors',
                    errors: validationErrors
                });
            }

            // Generate document
            const generatedBuffer = this.processor.generateAdvancedDocument(templatePath, data);
            
            // Save to file if needed
            const outputFilename = filename || `generated_${templateId}_${Date.now()}.docx`;
            const outputPath = path.join(this.outputPath, outputFilename);
            fs.writeFileSync(outputPath, generatedBuffer);

            // Send the file
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
            res.send(generatedBuffer);

        } catch (error) {
            console.error('Error generating document:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating document'
            });
        }
    }

    getTemplateStructureData(templateId) {
        const templateStructures = {
            'Viva_claim_Internal_Examiner': {
                fields: [
                    { name: 'examinerName', label: 'Examiner Name', type: 'text', required: true },
                    { name: 'designation', label: 'Designation', type: 'text', required: true },
                    { name: 'department', label: 'Department', type: 'text', required: true },
                    { name: 'college', label: 'College/Institution', type: 'text', required: true },
                    { name: 'date', label: 'Date', type: 'date', required: true },
                    { name: 'examDate', label: 'Examination Date', type: 'date', required: true },
                    { name: 'examTime', label: 'Examination Time', type: 'time', required: true },
                    { name: 'venue', label: 'Venue', type: 'text', required: true },
                    { name: 'studentName', label: 'Student Name', type: 'text', required: true },
                    { name: 'rollNumber', label: 'Roll Number', type: 'text', required: true },
                    { name: 'course', label: 'Course', type: 'text', required: true },
                    { name: 'semester', label: 'Semester', type: 'text', required: true },
                    { name: 'subject', label: 'Subject', type: 'text', required: true },
                    { name: 'projectTitle', label: 'Project Title', type: 'text', required: true }
                ]
            },
            'Viva_Claim_External_Examiner': {
    fields: [
        { name: 'passedAmount', label: 'Passed Amount', type: 'number', required: true },
        { name: 'passedAmountWords', label: 'Passed Amount (in words)', type: 'text', required: true },
        { name: 'tdsAmount', label: 'TDS Amount', type: 'number', required: true },
        { name: 'tdsAmountWords', label: 'TDS Amount (in words)', type: 'text', required: true },
        { name: 'totalNetAmount', label: 'Total Net Amount', type: 'number', required: true }
    ],
    tables: [
        {
            name: 'tableRows',
            label: 'Claim Table',
            columns: [
                { name: 'slNo', label: 'Sl.No', type: 'text' },
                { name: 'course', label: 'Course', type: 'text' },
                { name: 'subjectCode', label: 'Subject Code', type: 'text' },
                { name: 'numCandidates', label: 'Number of candidates', type: 'text' },
                { name: 'vivaDateSession', label: 'Date of Viva and session', type: 'text' },
                { name: 'bankBranch', label: 'Bank and Branch Name', type: 'text' },
                { name: 'accountNo', label: 'Account No', type: 'text' },
                { name: 'ifscCode', label: 'IFSC Code', type: 'text' },
                { name: 'panNo', label: 'PAN No', type: 'text' },
                { name: 'claimedAmount', label: 'Claimed Amount', type: 'text' },
                { name: 'tds', label: 'TDS@ 10%', type: 'text' },
                { name: 'netAmount', label: 'Net Amount', type: 'text' },
                { name: 'signature', label: 'Signature', type: 'text' }
            ]
        }
    ]
},

            'Viva_claim_supervisor': {
                fields: [
                    { name: 'supervisorName', label: 'Supervisor Name', type: 'text', required: true },
                    { name: 'designation', label: 'Designation', type: 'text', required: true },
                    { name: 'department', label: 'Department', type: 'text', required: true },
                    { name: 'college', label: 'College/Institution', type: 'text', required: true },
                    { name: 'date', label: 'Date', type: 'date', required: true },
                    { name: 'examDate', label: 'Examination Date', type: 'date', required: true },
                    { name: 'examTime', label: 'Examination Time', type: 'time', required: true },
                    { name: 'venue', label: 'Venue', type: 'text', required: true },
                    { name: 'paymentMode', label: 'Payment Mode', type: 'text', required: true },
                    { name: 'bankDetails', label: 'Bank Details', type: 'textarea', required: true }
                ],
                tables: [
                    {
                        name: 'students',
                        label: 'Students List', 
                        columns: [
                            { name: 'slNo', label: 'Sl. No.', type: 'text' },
                            { name: 'studentName', label: 'Student Name', type: 'text' },
                            { name: 'rollNumber', label: 'Roll Number', type: 'text' },
                            { name: 'projectTitle', label: 'Project Title', type: 'text' },
                            { name: 'marks', label: 'Marks', type: 'number' }
                        ]
                    }
                ]
            },
            'Viva_External_member_choice_-_letter_to_Chairman': {
                fields: [
                    { name: 'chairmanName', label: 'Chairman Name', type: 'text', required: true },
                    { name: 'instituteName', label: 'Institute Name', type: 'text', required: true },
                    { name: 'address', label: 'Address', type: 'textarea', required: true },
                    { name: 'date', label: 'Date', type: 'date', required: true },
                    { name: 'coordinatorName', label: 'Coordinator Name', type: 'text', required: true },
                    { name: 'department', label: 'Department', type: 'text', required: true },
                    { name: 'college', label: 'College', type: 'text', required: true },
                    { name: 'examDate', label: 'Examination Date', type: 'date', required: true },
                    { name: 'examTime', label: 'Examination Time', type: 'time', required: true }
                ],
                tables: [
                    {
                        name: 'examiners',
                        label: 'Suggested External Examiners',
                        columns: [
                            { name: 'slNo', label: 'Sl. No.', type: 'text' },
                            { name: 'examinerName', label: 'Examiner Name', type: 'text' },
                            { name: 'designation', label: 'Designation', type: 'text' },
                            { name: 'organization', label: 'Organization', type: 'text' },
                            { name: 'expertise', label: 'Area of Expertise', type: 'text' }
                        ]
                    }
                ]
            },
            'Internal_Examiner_Claim': {
    fields: [
        { name: 'passedAmount', label: 'Passed Amount', type: 'number', required: true },
        { name: 'passedAmountWords', label: 'Passed Amount (in words)', type: 'text', required: true },
        { name: 'tdsAmount', label: 'TDS Amount', type: 'number', required: true },
        { name: 'tdsAmountWords', label: 'TDS Amount (in words)', type: 'text', required: true },
        { name: 'totalNetAmount', label: 'Total Net Amount', type: 'number', required: true }
    ],
    tables: [
        {
            name: 'tableRows',
            label: 'Claim Table',
            columns: [
                { name: 'slNo', label: 'Sl.No', type: 'text' },
                { name: 'course', label: 'Course', type: 'text' },
                { name: 'subjectCode', label: 'Subject Code', type: 'text' },
                { name: 'numCandidates', label: 'Number of candidates', type: 'text' },
                { name: 'vivaDateSession', label: 'Date of Viva and session', type: 'text' },
                { name: 'bankBranch', label: 'Bank and Branch Name', type: 'text' },
                { name: 'accountNo', label: 'Account No', type: 'text' },
                { name: 'ifscCode', label: 'IFSC Code', type: 'text' },
                { name: 'panNo', label: 'PAN No', type: 'text' },
                { name: 'claimedAmount', label: 'Claimed Amount', type: 'text' },
                { name: 'tds', label: 'TDS@ 10%', type: 'text' },
                { name: 'netAmount', label: 'Net Amount', type: 'text' },
                { name: 'signature', label: 'Signature', type: 'text' }
            ]
        }
    ]
},

            'Viva_Letter_to_external': {
                fields: [
                    { name: 'examinerName', label: 'External Examiner Name', type: 'text', required: true },
                    { name: 'designation', label: 'Designation', type: 'text', required: true },
                    { name: 'organization', label: 'Organization', type: 'text', required: true },
                    { name: 'address', label: 'Address', type: 'textarea', required: true },
                    { name: 'date', label: 'Date', type: 'date', required: true },
                    { name: 'coordinatorName', label: 'Coordinator Name', type: 'text', required: true },
                    { name: 'department', label: 'Department', type: 'text', required: true },
                    { name: 'college', label: 'College', type: 'text', required: true },
                    { name: 'examDate', label: 'Examination Date', type: 'date', required: true },
                    { name: 'examTime', label: 'Examination Time', type: 'time', required: true },
                    { name: 'venue', label: 'Venue', type: 'text', required: true },
                    { name: 'honorarium', label: 'Honorarium Amount', type: 'number', required: true },
                    { name: 'travelAllowance', label: 'Travel Allowance', type: 'number', required: true }
                ],
                tables: [
                    {
                        name: 'students',
                        label: 'Students List',
                        columns: [
                            { name: 'slNo', label: 'Sl. No.', type: 'text' },
                            { name: 'studentName', label: 'Student Name', type: 'text' },
                            { name: 'rollNumber', label: 'Roll Number', type: 'text' },
                            { name: 'projectTitle', label: 'Project Title', type: 'text' },
                            { name: 'guideName', label: 'Guide Name', type: 'text' }
                        ]
                    }
                ]
            }
        };

        return templateStructures[templateId] || null;
    }

    // Get template structure for form generation
    async getTemplateStructure(req, res) {
        try {
            const { templateId } = req.params;
            
            const structure = this.getTemplateStructureData(templateId);
            
            if (!structure) {
                return res.status(404).json({
                    success: false,
                    message: 'Template structure not found'
                });
            }

            res.json({
                success: true,
                structure
            });

        } catch (error) {
            console.error('Error getting template structure:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving template structure'
            });
        }
    }

    // Preview template (extract variables from docx)
    async previewTemplate(req, res) {
        try {
            const { templateId } = req.params;
            const templatePath = path.join(this.templatesPath, `${templateId}.docx`);
            
            if (!fs.existsSync(templatePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Template not found'
                });
            }

            // Read the docx file
            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip);
            
            // Extract variables
            const documentXml = zip.files['word/document.xml'].asText();
            const variables = [];
            const regex = /{([^}]+)}/g;
            let match;
            
            while ((match = regex.exec(documentXml)) !== null) {
                if (!variables.includes(match[1])) {
                    variables.push(match[1]);
                }
            }

            res.json({
                success: true,
                variables,
                templateId
            });

        } catch (error) {
            console.error('Error previewing template:', error);
            res.status(500).json({
                success: false,
                message: 'Error previewing template'
            });
        }
    }

    // Auto-detect template structure from document
    async autoDetectStructure(req, res) {
        try {
            const { templateId } = req.params;
            const templatePath = path.join(this.templatesPath, `${templateId}.docx`);
            
            if (!fs.existsSync(templatePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Template not found'
                });
            }

            const detectedStructure = this.processor.analyzeTemplateStructure(templatePath);

            res.json({
                success: true,
                detectedStructure
            });

        } catch (error) {
            console.error('Error auto-detecting template structure:', error);
            res.status(500).json({
                success: false,
                message: 'Error auto-detecting template structure'
            });
        }
    }
}

module.exports = DocumentController;
