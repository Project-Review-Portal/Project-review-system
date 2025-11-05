const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

class InternalExaminerDocumentController {
    constructor() {
        this.templatesPath = path.join(__dirname, '..', 'uploads', 'templates');
        this.outputPath = path.join(__dirname, '..', 'uploads', 'generated');
        this.templateName = 'Viva claim - Internal Examiner.docx';
        
        // Ensure output directory exists
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, { recursive: true });
        }
    }

    // Get template structure for Internal Examiner
    getTemplateStructure(req, res) {
        try {
            const structure = {
                templateName: 'Viva Claim - Internal Examiner',
                description: 'Document for internal examiners to claim examination fees',
                fields: [
                    { name: 'examinerName', label: 'Examiner Name', type: 'text', required: true, placeholder: 'Dr. John Smith' },
                    { name: 'designation', label: 'Designation', type: 'text', required: true, placeholder: 'Associate Professor' },
                    { name: 'department', label: 'Department', type: 'text', required: true, placeholder: 'Computer Science' },
                    { name: 'college', label: 'College/Institution', type: 'text', required: true, placeholder: 'ABC Engineering College' },
                    { name: 'date', label: 'Current Date', type: 'date', required: true, defaultValue: new Date().toISOString().split('T')[0] },
                    { name: 'examDate', label: 'Examination Date', type: 'date', required: true },
                    { name: 'examTime', label: 'Examination Time', type: 'time', required: true, placeholder: '10:00 AM' },
                    { name: 'venue', label: 'Examination Venue', type: 'text', required: true, placeholder: 'Lab 101' },
                    { name: 'studentName', label: 'Student Name', type: 'text', required: true, placeholder: 'Alice Johnson' },
                    { name: 'rollNumber', label: 'Roll Number', type: 'text', required: true, placeholder: 'CS2023001' },
                    { name: 'course', label: 'Course', type: 'text', required: true, placeholder: 'B.Tech Computer Science' },
                    { name: 'semester', label: 'Semester', type: 'text', required: true, placeholder: '8th Semester' },
                    { name: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'Final Year Project' },
                    { name: 'projectTitle', label: 'Project Title', type: 'text', required: true, placeholder: 'Machine Learning Based Recommendation System' },
                    { name: 'honorariumAmount', label: 'Honorarium Amount (Rs.)', type: 'number', required: true, placeholder: '500' },
                    { name: 'honorariumAmountWords', label: 'Honorarium Amount (in words)', type: 'text', required: true, placeholder: 'Five Hundred Rupees Only' },
                    { name: 'tdsAmount', label: 'TDS Amount (Rs.)', type: 'number', required: true, placeholder: '50' },
                    { name: 'tdsAmountWords', label: 'TDS Amount (in words)', type: 'text', required: true, placeholder: 'Fifty Rupees Only' }
                ]
            };

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

    // Generate sample data for testing
    getSampleData(req, res) {
        try {
            const sampleData = {
                examinerName: 'Dr. John Smith',
                designation: 'Associate Professor',
                department: 'Computer Science',
                college: 'ABC Engineering College',
                date: new Date().toISOString().split('T')[0],
                examDate: '2025-08-15',
                examTime: '10:00 AM',
                venue: 'Lab 101',
                studentName: 'Alice Johnson',
                rollNumber: 'CS2023001',
                course: 'B.Tech Computer Science',
                semester: '8th Semester',
                subject: 'Final Year Project',
                projectTitle: 'Machine Learning Based Recommendation System',
                honorariumAmount: '500',
                honorariumAmountWords: 'Five Hundred Rupees Only',
                tdsAmount: '50',
                tdsAmountWords: 'Fifty Rupees Only'
            };

            res.json({
                success: true,
                sampleData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error generating sample data'
            });
        }
    }

    // Generate document
    async generateDocument(req, res) {
        try {
            const { data, filename } = req.body;

            if (!data) {
                return res.status(400).json({
                    success: false,
                    message: 'Data is required'
                });
            }

            const templatePath = path.join(this.templatesPath, this.templateName);
            
            if (!fs.existsSync(templatePath)) {
                return res.status(404).json({
                    success: false,
                    message: `Template not found: ${this.templateName}. Please ensure the template file exists in the templates folder.`
                });
            }

            // Validate and sanitize input data
            const validationErrors = [];
            
            // Check field lengths (security measure)
            const maxFieldLength = 1000; // Reasonable limit
            const maxFileNameLength = 100; // For filename generation
            
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'string' && data[key].length > maxFieldLength) {
                    validationErrors.push(`Field '${key}' is too long (max ${maxFieldLength} characters)`);
                }
            });
            
            // Validate examiner name length for filename generation
            if (data.examinerName && data.examinerName.length > maxFileNameLength) {
                validationErrors.push(`Examiner name too long for filename generation (max ${maxFileNameLength} characters)`);
            }
            
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Input validation failed',
                    errors: validationErrors
                });
            }

            // Validate required fields
            const requiredFields = ['examinerName', 'designation', 'department', 'college', 'date', 'examDate', 'examTime', 'venue', 'studentName', 'rollNumber', 'course', 'semester', 'subject', 'projectTitle', 'honorariumAmount', 'honorariumAmountWords', 'tdsAmount', 'tdsAmountWords'];
            const missingFields = requiredFields.filter(field => !data[field] || data[field].toString().trim() === '');
            
            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields',
                    missingFields
                });
            }

            // Process data
            const processedData = this.processData(data);

            // Read and process template
            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            // Set the template variables (using newer API)
            try {
                doc.render(processedData);
            } catch (renderError) {
                console.error('Render error:', renderError);
                return res.status(400).json({
                    success: false,
                    message: 'Error rendering document. This usually means the template is not properly prepared with template variables.',
                    details: renderError.properties,
                    solution: 'Please check the template preparation guide and ensure all placeholders are replaced with {variableName} format.'
                });
            }

            // Generate the document buffer
            const buf = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            });

            // Save the document
            const outputFilename = filename || `Viva_Claim_Internal_Examiner_${processedData.studentName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
            const outputFilePath = path.join(this.outputPath, outputFilename);
            fs.writeFileSync(outputFilePath, buf);

            console.log(`Document generated: ${outputFilePath}`);

            // Send the file
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
            res.send(buf);

        } catch (error) {
            console.error('Error generating document:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating document: ' + error.message
            });
        }
    }

    // Process and format data
    processData(data) {
        const processed = { ...data };

        // Format dates
        if (processed.date) {
            const date = new Date(processed.date);
            processed.date = date.toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }

        if (processed.examDate) {
            const examDate = new Date(processed.examDate);
            processed.examDate = examDate.toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }

        // Ensure all required fields are strings
        Object.keys(processed).forEach(key => {
            if (processed[key] === null || processed[key] === undefined) {
                processed[key] = '';
            } else {
                processed[key] = processed[key].toString();
            }
        });

        return processed;
    }

    // Get preparation guide
    getPreparationGuide(req, res) {
        try {
            const guide = `
PREPARATION GUIDE: Viva Claim - Internal Examiner Template

STEP 1: Open the Word Document
- Open "Viva claim - Internal Examiner.docx" in Microsoft Word

STEP 2: Replace text fields with template variables
Replace the following fields with the exact template variables:

1. Find "Examiner Name:" or similar text → Replace with: {examinerName}
2. Find "Designation:" or similar text → Replace with: {designation}  
3. Find "Department:" or similar text → Replace with: {department}
4. Find "College:" or "Institution:" → Replace with: {college}
5. Find "Date:" fields → Replace with: {date}
6. Find "Examination Date:" → Replace with: {examDate}
7. Find "Time:" or "Examination Time:" → Replace with: {examTime}
8. Find "Venue:" → Replace with: {venue}
9. Find "Student Name:" → Replace with: {studentName}
10. Find "Roll Number:" → Replace with: {rollNumber}
11. Find "Course:" → Replace with: {course}
12. Find "Semester:" → Replace with: {semester}
13. Find "Subject:" → Replace with: {subject}
14. Find "Project Title:" → Replace with: {projectTitle}
15. Find "Passed for Rs._________________________(Rupees_________________________)." → Replace with: "Passed for Rs.{honorariumAmount}(Rupees{honorariumAmountWords})."
16. Find "TDS amount Rs.__________________(Rupees  _______________________________________________)" → Replace with: "TDS amount Rs.{tdsAmount}(Rupees {tdsAmountWords})"

STEP 3: Replace common placeholders
- Replace underscores (___) with appropriate variables
- Replace dots (....) with appropriate variables
- Replace any blank spaces meant for filling with variables

EXAMPLE TRANSFORMATION:
Before: "Examiner Name: _______________"
After:  "Examiner Name: {examinerName}"

Before: "Date: __/__/____"
After:  "Date: {date}"

STEP 4: Save the document
- Save the document in the same location
- Keep the same filename: "Viva claim - Internal Examiner.docx"

STEP 5: Test the template
- Use the document generation system to test with sample data
- Verify all variables are replaced correctly

IMPORTANT NOTES:
- Use exact curly braces: { }
- Variable names are case-sensitive
- Don't add extra spaces inside braces
- Keep original formatting around the variables
            `;

            res.json({
                success: true,
                guide: guide.trim()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error generating preparation guide'
            });
        }
    }

    // Check if template is ready
    checkTemplateStatus(req, res) {
        try {
            const templatePath = path.join(this.templatesPath, this.templateName);
            
            if (!fs.existsSync(templatePath)) {
                return res.json({
                    success: true,
                    status: 'missing',
                    message: 'Template file not found',
                    templatePath
                });
            }

            // Try to detect variables in template
            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            const documentXml = zip.files['word/document.xml'].asText();
            
            const variablePattern = /\{([^}]+)\}/g;
            const detectedVariables = [];
            let match;
            
            while ((match = variablePattern.exec(documentXml)) !== null) {
                const variable = match[1];
                if (!detectedVariables.includes(variable)) {
                    detectedVariables.push(variable);
                }
            }

            const expectedVariables = ['examinerName', 'designation', 'department', 'college', 'date', 'examDate', 'examTime', 'venue', 'studentName', 'rollNumber', 'course', 'semester', 'subject', 'projectTitle', 'honorariumAmount', 'honorariumAmountWords', 'tdsAmount', 'tdsAmountWords'];
            const missingVariables = expectedVariables.filter(v => !detectedVariables.includes(v));
            
            const status = missingVariables.length === 0 ? 'ready' : 'needs_preparation';

            res.json({
                success: true,
                status,
                detectedVariables,
                expectedVariables,
                missingVariables,
                message: status === 'ready' ? 'Template is ready for use' : 'Template needs preparation'
            });

        } catch (error) {
            console.error('Error checking template status:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking template status'
            });
        }
    }
}

module.exports = new InternalExaminerDocumentController();
