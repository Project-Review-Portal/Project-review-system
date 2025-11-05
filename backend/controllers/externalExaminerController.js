const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

class ExternalExaminerDocumentController {
    constructor() {
        this.templatesPath = path.join(__dirname, '..', 'uploads', 'templates');
        this.outputPath = path.join(__dirname, '..', 'uploads', 'generated');
        this.templateName = 'Viva claim External Examiner.docx';
        
        // Ensure output directory exists
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, { recursive: true });
        }
    }

    // Get template structure for External Examiner
    getTemplateStructure = (req, res) => {
        try {
            const structure = {
                templateName: 'Viva Claim - External Examiner',
                description: 'Document for external examiners to claim examination fees with student details table',
                fields: [
                    { name: 'examinerName', label: 'External Examiner Name', type: 'text', required: true, placeholder: 'Dr. Mary Wilson' },
                    { name: 'designation', label: 'Designation', type: 'text', required: true, placeholder: 'Professor' },
                    { name: 'organization', label: 'Organization/University', type: 'text', required: true, placeholder: 'XYZ University' },
                    { name: 'address', label: 'Complete Address', type: 'textarea', required: true, placeholder: '123 University Road, City - 560001' },
                    { name: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '+91-9876543210' },
                    { name: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'mary.wilson@xyz.edu' },
                    { name: 'date', label: 'Current Date', type: 'date', required: true, defaultValue: new Date().toISOString().split('T')[0] },
                    { name: 'examDate', label: 'Examination Date', type: 'date', required: true },
                    { name: 'examTime', label: 'Examination Time', type: 'time', required: true, placeholder: '10:00 AM' },
                    { name: 'venue', label: 'Examination Venue', type: 'text', required: true, placeholder: 'Conference Hall' },
                    { name: 'travelDistance', label: 'Travel Distance (km)', type: 'number', required: true, placeholder: '50' },
                    { name: 'honorarium', label: 'Honorarium Amount (₹)', type: 'number', required: true, placeholder: '5000' },
                    { name: 'honorariumWords', label: 'Honorarium Amount (in words)', type: 'text', required: true, placeholder: 'Five Thousand Rupees Only' },
                    { name: 'travelAllowance', label: 'Travel Allowance (₹)', type: 'number', required: true, placeholder: '1500' },
                    { name: 'tdsAmount', label: 'TDS Amount (₹)', type: 'number', required: true, placeholder: '500' },
                    { name: 'tdsAmountWords', label: 'TDS Amount (in words)', type: 'text', required: true, placeholder: 'Five Hundred Rupees Only' },
                    { name: 'course', label: 'Course', type: 'text', required: true, placeholder: 'B.Tech Computer Science' },
                    { name: 'semester', label: 'Semester', type: 'text', required: true, placeholder: '8th Semester' },
                    { name: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'Final Year Project' }
                ],
                tables: [
                    {
                        name: 'students',
                        label: 'Students to be Examined',
                        description: 'List of students whose viva will be conducted',
                        columns: [
                            { name: 'slNo', label: 'Sl. No.', type: 'text', required: true, autoGenerate: true },
                            { name: 'studentName', label: 'Student Name', type: 'text', required: true, placeholder: 'Alice Johnson' },
                            { name: 'rollNumber', label: 'Roll Number', type: 'text', required: true, placeholder: 'CS2023001' },
                            { name: 'projectTitle', label: 'Project Title', type: 'text', required: true, placeholder: 'Machine Learning Based System' },
                            { name: 'marks', label: 'Marks Obtained', type: 'number', required: false, placeholder: '85' }
                        ],
                        minRows: 1,
                        maxRows: 20
                    }
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
    getSampleData = (req, res) => {
        try {
            const sampleData = {
                examinerName: 'Dr. Mary Wilson',
                designation: 'Professor',
                organization: 'XYZ University',
                address: '123 University Road, Technology Park, Bangalore - 560001',
                phone: '+91-9876543210',
                email: 'mary.wilson@xyz.edu',
                date: new Date().toISOString().split('T')[0],
                examDate: '2025-08-15',
                examTime: '10:00 AM',
                venue: 'Conference Hall, Block A',
                travelDistance: 50,
                honorarium: 5000,
                honorariumWords: 'Five Thousand Rupees Only',
                travelAllowance: 1500,
                tdsAmount: 500,
                tdsAmountWords: 'Five Hundred Rupees Only',
                course: 'B.Tech Computer Science',
                semester: '8th Semester',
                subject: 'Final Year Project',
                students: [
                    {
                        slNo: '1',
                        studentName: 'Alice Johnson',
                        rollNumber: 'CS2023001',
                        projectTitle: 'Machine Learning Based Recommendation System',
                        marks: 85
                    },
                    {
                        slNo: '2',
                        studentName: 'Bob Smith',
                        rollNumber: 'CS2023002',
                        projectTitle: 'Blockchain Based Voting System',
                        marks: 88
                    },
                    {
                        slNo: '3',
                        studentName: 'Carol Davis',
                        rollNumber: 'CS2023003',
                        projectTitle: 'IoT Smart Home Automation',
                        marks: 82
                    }
                ]
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
    generateDocument = async (req, res) => {
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
            const requiredFields = ['examinerName', 'designation', 'organization', 'address', 'phone', 'email', 'date', 'examDate', 'examTime', 'venue', 'travelDistance', 'honorarium', 'honorariumWords', 'travelAllowance', 'tdsAmount', 'tdsAmountWords', 'course', 'semester', 'subject'];
            const missingFields = requiredFields.filter(field => !data[field] || data[field].toString().trim() === '');
            
            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields',
                    missingFields
                });
            }

            // Validate students table
            if (!data.students || !Array.isArray(data.students) || data.students.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one student is required in the students table'
                });
            }

            // Validate each student entry
            const studentErrors = [];
            data.students.forEach((student, index) => {
                const requiredStudentFields = ['studentName', 'rollNumber', 'projectTitle'];
                requiredStudentFields.forEach(field => {
                    if (!student[field] || student[field].toString().trim() === '') {
                        studentErrors.push(`Student ${index + 1}: ${field} is required`);
                    }
                });
            });

            if (studentErrors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Student data validation errors',
                    errors: studentErrors
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
                    solution: 'Please check the template preparation guide and ensure all placeholders are replaced with {variableName} format and table loops are properly set up.'
                });
            }

            // Generate the document buffer
            const buf = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            });

            // Save the document with safe filename
            const safeExaminerName = processedData.examinerName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
            const outputFilename = filename || `Viva_Claim_External_Examiner_${safeExaminerName}_${new Date().toISOString().split('T')[0]}.docx`;
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
    processData = (data) => {
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

        // Format currency amounts
        if (processed.honorarium) {
            processed.honorarium = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(processed.honorarium);
        }

        if (processed.travelAllowance) {
            processed.travelAllowance = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(processed.travelAllowance);
        }

        // Process students table
        if (processed.students && Array.isArray(processed.students)) {
            processed.students = processed.students.map((student, index) => {
                const processedStudent = { ...student };
                
                // Auto-generate serial number if not provided
                if (!processedStudent.slNo) {
                    processedStudent.slNo = (index + 1).toString();
                }

                // Ensure all fields are strings except marks
                Object.keys(processedStudent).forEach(key => {
                    if (key !== 'marks' && processedStudent[key] !== null && processedStudent[key] !== undefined) {
                        processedStudent[key] = processedStudent[key].toString();
                    }
                });

                return processedStudent;
            });

            // Add total count for reference
            processed.totalStudents = processed.students.length;
        }

        // Ensure all required fields are strings
        Object.keys(processed).forEach(key => {
            if (key !== 'students' && processed[key] !== null && processed[key] !== undefined) {
                processed[key] = processed[key].toString();
            }
        });

        return processed;
    }

    // Get preparation guide
    getPreparationGuide = (req, res) => {
        try {
            const guide = `
PREPARATION GUIDE: Viva Claim - External Examiner Template

STEP 1: Open the Word Document
- Open "Viva claim External Examiner.docx" in Microsoft Word

STEP 2: Replace text fields with template variables
Replace the following fields with the exact template variables:

PERSONAL INFORMATION:
1. Find "External Examiner Name:" → Replace with: {examinerName}
2. Find "Designation:" → Replace with: {designation}  
3. Find "Organization:" or "University:" → Replace with: {organization}
4. Find "Address:" → Replace with: {address}
5. Find "Phone:" or "Mobile:" → Replace with: {phone}
6. Find "Email:" → Replace with: {email}

EXAMINATION DETAILS:
7. Find "Date:" fields → Replace with: {date}
8. Find "Examination Date:" → Replace with: {examDate}
9. Find "Time:" or "Examination Time:" → Replace with: {examTime}
10. Find "Venue:" → Replace with: {venue}
11. Find "Course:" → Replace with: {course}
12. Find "Semester:" → Replace with: {semester}
13. Find "Subject:" → Replace with: {subject}

FINANCIAL DETAILS:
14. Find "Travel Distance:" → Replace with: {travelDistance}
15. Find "Honorarium:" → Replace with: {honorarium}
16. Find "Honorarium (in words):" → Replace with: {honorariumWords}
17. Find "Travel Allowance:" → Replace with: {travelAllowance}
18. Find "TDS Amount:" → Replace with: {tdsAmount}
19. Find "TDS Amount (in words):" → Replace with: {tdsAmountWords}

STEP 3: Setup the Students Table (IMPORTANT!)
Find the table that lists students and set it up for dynamic rows:

1. BEFORE the first data row of the table, add: {#students}
2. AFTER the last data row of the table, add: {/students}

3. Replace the table cell contents with:
   - Serial Number column: {slNo}
   - Student Name column: {studentName}
   - Roll Number column: {rollNumber}
   - Project Title column: {projectTitle}
   - Marks column: {marks}

EXAMPLE TABLE SETUP:
┌─────────────────────────────────────────────────────┐
│ {#students}                                         │
│ ┌────┬─────────────┬────────────┬──────────┬────────┐│
│ │{slNo}│{studentName}│{rollNumber}│{projectTitle}│{marks}││
│ └────┴─────────────┴────────────┴──────────┴────────┘│
│ {/students}                                         │
└─────────────────────────────────────────────────────┘

This table setup will generate multiple rows for the {students} data array.

STEP 4: Replace common placeholders
- Replace underscores (___) with appropriate variables
- Replace dots (....) with appropriate variables
- Replace any blank spaces meant for filling with variables

STEP 5: Save the document
- Save the document in the same location
- Keep the same filename: "Viva claim External Examiner.docx"

STEP 6: Test the template
- Use the document generation system to test with sample data
- Verify all variables are replaced correctly
- Check that the table generates multiple rows for multiple students

IMPORTANT NOTES FOR TABLES:
- {#students} and {/students} must be on separate lines
- These tags create a loop that repeats for each student
- The content between the tags will repeat for each student in the array
- Make sure table formatting is preserved around the variables

TROUBLESHOOTING:
- If table doesn't repeat: Check {#students} and {/students} placement
- If variables not replaced: Ensure exact spelling and curly braces
- If formatting is lost: Keep original formatting around variables
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
    checkTemplateStatus = (req, res) => {
        try {
            const templatePath = path.join(__dirname, '..', 'uploads', 'templates', this.templateName);
            
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

            const expectedVariables = [
                'examinerName', 'designation', 'organization', 'address', 'phone', 'email',
                'date', 'examDate', 'examTime', 'venue', 'course', 'semester', 'subject',
                'travelDistance', 'honorarium', 'honorariumWords', 'travelAllowance', 'tdsAmount', 'tdsAmountWords'
            ];

            const expectedTableVariables = ['#students', '/students', 'slNo', 'studentName', 'rollNumber', 'projectTitle', 'marks'];
            
            const allExpectedVariables = [...expectedVariables, ...expectedTableVariables];
            const missingVariables = allExpectedVariables.filter(v => !detectedVariables.includes(v));
            
            // Check specifically for table loop
            const hasTableLoop = detectedVariables.includes('#students') && detectedVariables.includes('/students');
            
            let status;
            let message;
            
            if (missingVariables.length === 0) {
                status = 'ready';
                message = 'Template is ready for use';
            } else if (!hasTableLoop) {
                status = 'needs_table_setup';
                message = 'Template needs table loop setup for students';
            } else {
                status = 'needs_preparation';
                message = 'Template needs preparation';
            }

            res.json({
                success: true,
                status,
                detectedVariables,
                expectedVariables: allExpectedVariables,
                missingVariables,
                hasTableLoop,
                message
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

module.exports = new ExternalExaminerDocumentController();
