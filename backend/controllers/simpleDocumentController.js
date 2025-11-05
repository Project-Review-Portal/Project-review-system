const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const officegen = require('officegen');

// A helper function to handle table row generation
const tableRowGenerator = (data, num_rows) => {
    const newRows = [];
    if (num_rows > 0) {
        // Assuming the first row of data is the template for all new rows
        const templateRow = data[0]; 
        const newRow = {};
        // Clear values from the template row to create empty rows
        for (const key in templateRow) {
            newRow[key] = '';
        }
        for (let i = 0; i < num_rows; i++) {
            newRows.push({ ...newRow });
        }
    }
    return newRows;
};


class SimpleDocumentController {
    constructor() {
        this.templatesPath = path.join(__dirname, '..', 'uploads', 'templates');
        this.generatedPath = path.join(__dirname, '..', 'uploads', 'generated');
        if (!fs.existsSync(this.generatedPath)) {
            fs.mkdirSync(this.generatedPath, { recursive: true });
        }
        console.log('Templates path:', this.templatesPath);
    }

    // Get list of available templates
    async getTemplates(req, res) {
        try {
            if (!fs.existsSync(this.templatesPath)) {
                return res.status(500).json({ message: 'Templates directory not found' });
            }
            const files = fs.readdirSync(this.templatesPath);
            const templates = files
                .filter(file => file.endsWith('.docx') && !file.startsWith('~'))
                .map(file => ({
                    id: path.basename(file, '.docx'),
                    name: path.basename(file, '.docx').replace(/_/g, ' '),
                }));
            res.json({ success: true, templates });
        } catch (error) {
            console.error('Error getting templates:', error);
            res.status(500).json({ success: false, message: 'Error retrieving templates' });
        }
    }

    // Get template structure for form generation
    async getTemplateStructure(req, res) {
        const { templateId } = req.params;
        console.log(`Getting structure for template: ${templateId}`);

        // Hardcoded structures for each template as requested.
        const structures = {
            'Viva_claim_Internal_Examiner': {
                fields: [
                    { name: 'department', label: 'Department', type: 'text', value: '' },
                    { name: 'campus', label: 'Campus', type: 'text', value: '' },
                    { name: 'examiner_name', label: 'Internal Examiner Name', type: 'text', value: '' },
                    { name: 'designation', label: 'Designation', type: 'text', value: '' },
                    { name: 'employee_id', label: 'Employee ID', type: 'text', value: '' },
                    { name: 'date', label: 'Date', type: 'date' }
                ],
                tables: [
                    {
                        name: 'exam_entries',
                        label: 'Examination Entries',
                        row_count_field: 'num_rows',
                        default_rows: 1,
                        allow_add_rows: true,
                        columns: [
                            { name: 'sl_no', label: 'Sl. No.', type: 'text' },
                            { name: 'course', label: 'Course', type: 'text' },
                            { name: 'subject_code', label: 'Subject Code', type: 'text' },
                            { name: 'num_candidates', label: 'Number of Candidates', type: 'number' },
                            { name: 'exam_date', label: 'Date of Viva and Session', type: 'date' },
                            { name: 'bank_branch', label: 'Bank and Branch Name', type: 'text' },
                            { name: 'account_no', label: 'Account Number', type: 'text' },
                            { name: 'ifsc_code', label: 'IFSC Code', type: 'text' },
                            { name: 'pan_no', label: 'PAN Number', type: 'text' }
                        ]
                    }
                ]
            },
            'Viva_claim_External_Examiner': {
                fields: [
                    { name: 'examiner_name', label: 'Examiner Name', type: 'text', value: '' },
                    { name: 'designation', label: 'Designation', type: 'text', value: '' },
                    { name: 'department', label: 'Department', type: 'text', value: '' },
                    { name: 'branch', label: 'Branch', type: 'text', value: '' },
                    { name: 'semester', label: 'Semester', type: 'text', value: '' },
                    { name: 'course_name', label: 'Course Name', type: 'text', value: '' },
                    { name: 'course_code', label: 'Course Code', type: 'text', value: '' },
                    { name: 'thesis_rate', label: 'Thesis Evaluation Rate per Student', type: 'number', value: 160 },
                    { name: 'thesis_students', label: 'Number of Students (Thesis)', type: 'number', value: 7 },
                    { name: 'viva_rate', label: 'Viva Voce Rate per Student', type: 'number', value: 160 },
                    { name: 'viva_students', label: 'Number of Students (Viva)', type: 'number', value: 7 },
                    { name: 'ta_da_amount', label: 'TA/DA Amount', type: 'number', value: 10 },
                    { name: 'date', label: 'Date', type: 'date' }
                ]
            },
            'Viva_claim_supervisor': {
                fields: [
                    { name: 'department', label: 'Department', type: 'text', value: '' },
                    { name: 'campus', label: 'Campus', type: 'text', value: '' },
                    { name: 'date', label: 'Date', type: 'date' }
                ],
                tables: [
                    {
                        name: 'supervisor_entries',
                        label: 'Supervisor Entries',
                        row_count_field: 'num_rows',
                        default_rows: 1,
                        allow_add_rows: true,
                        columns: [
                            { name: 'sl_no', label: 'Sl. No.', type: 'text' },
                            { name: 'course', label: 'Course', type: 'text' },
                            { name: 'subject_code', label: 'Subject Code', type: 'text' },
                            { name: 'supervisor_name', label: 'Name of Supervisor', type: 'text' },
                            { name: 'num_candidates', label: 'Number of candidates', type: 'number' },
                            { name: 'bank_branch', label: 'Bank and Branch Name', type: 'text' },
                            { name: 'account_no', label: 'Account No', type: 'text' },
                            { name: 'ifsc_code', label: 'IFSC Code', type: 'text' },
                            { name: 'pan_no', label: 'PAN No.', type: 'text' }
                        ]
                    }
                ]
            },
            'Viva_External_member_choice_-_letter_to_Chairman': {
                fields: [
                    { name: 'chairman_name', label: 'Chairman Name', type: 'text', value: '' },
                    { name: 'chairman_designation', label: 'Chairman Designation', type: 'text', value: '' },
                    { name: 'department_name', label: 'Department', type: 'text', value: '' },
                    { name: 'university_name', label: 'University Name', type: 'text', value: '' },
                    { name: 'sender_name', label: 'Sender Name', type: 'text', value: '' },
                    { name: 'sender_designation', label: 'Sender Designation', type: 'text', value: '' },
                    { name: 'date', label: 'Date', type: 'date' }
                ],
                tables: [
                    {
                        name: 'examiner_batches',
                        label: 'Examiner Batches',
                        row_count_field: 'num_batches',
                        default_rows: 1,
                        allow_add_rows: true,
                        columns: [
                            { name: 'batch_no', label: 'Batch No.', type: 'number' },
                            { name: 'member1_name', label: 'Member 1 Name', type: 'text' },
                            { name: 'member1_affiliation', label: 'Member 1 Affiliation and Address', type: 'textarea' },
                            { name: 'member2_name', label: 'Member 2 Name', type: 'text' },
                            { name: 'member2_affiliation', label: 'Member 2 Affiliation and Address', type: 'textarea' },
                            { name: 'member3_name', label: 'Member 3 Name', type: 'text' },
                            { name: 'member3_affiliation', label: 'Member 3 Affiliation and Address', type: 'textarea' }
                        ],
                        nested_tables: [
                            {
                                name: 'students',
                                label: 'Students in this Batch',
                                row_count_field: 'num_students',
                                default_rows: 1,
                                allow_add_rows: true,
                                columns: [
                                    { name: 'register_number', label: 'Register Number', type: 'text' },
                                    { name: 'student_name', label: 'Student Name', type: 'text' }
                                ]
                            }
                        ]
                    }
                ]
            },
            'Viva_Letter_to_external': {
                fields: [
                    { name: 'sender_name', label: 'Sender Name', type: 'text', value: '', placeholder: '[Sender Name]' },
                    { name: 'sender_designation', label: 'Sender Designation', type: 'text', value: '', placeholder: '[Designation]' },
                    { name: 'examiner_name', label: 'Examiner Name', type: 'text', value: '', placeholder: '[Examiner Name]' },
                    { name: 'examiner_address', label: 'Examiner Address', type: 'textarea', value: '', placeholder: '[Examiner Address]' },
                    { name: 'course_name', label: 'Course Name', type: 'text', value: '', placeholder: '[Course Name]' },
                    { name: 'course_code', label: 'Course Code', type: 'text', value: '', placeholder: '[Course Code]' },
                    { name: 'project_type', label: 'Project Type', type: 'text', value: '', placeholder: '[Project Type]' },
                    { name: 'viva_date', label: 'Viva Date', type: 'date', placeholder: '[Viva Date]' },
                    { name: 'viva_time', label: 'Viva Time', type: 'text', value: '', placeholder: '[Viva Time]' },
                    { name: 'viva_venue', label: 'Viva Venue', type: 'text', value: '', placeholder: '[Viva Venue]' },
                    { name: 'coordinator_name', label: 'Project Co-coordinator Name', type: 'text', value: '', placeholder: '[Project Co-coordinator Name]' },
                    { name: 'hod_name', label: 'Head of Department Name', type: 'text', value: '', placeholder: '[Head of Department Name]' },
                    { name: 'date', label: 'Date', type: 'date', placeholder: '[Date]' }
                ]
            }
        };

        const structure = structures[templateId];

        if (!structure) {
            return res.status(404).json({ success: false, message: 'Template structure not found' });
        }
        res.json({ success: true, structure });
    }

    // Generate and send the document
    async generateDocument(req, res) {
        try {
            const { templateId, data } = req.body;
            
            if (!templateId || !data) {
                return res.status(400).json({ success: false, message: 'Template ID and data are required' });
            }

            // Special handling for custom document generation
            if (templateId === 'Viva_claim_External_Examiner') {
                return this.generateExternalExaminerClaim(req, res, data);
            }
            
            if (templateId === 'Viva_claim_Internal_Examiner') {
                return this.generateInternalExaminerClaim(req, res, data);
            }

            if (templateId === 'Viva_claim_supervisor') {
                return this.generateSupervisorClaim(req, res, data);
            }

            if (templateId === 'Viva_External_member_choice_-_letter_to_Chairman') {
                return this.generateChairmanLetter(req, res, data);
            }

            if (templateId === 'Viva_Letter_to_external') {
                return this.generateExternalLetter(req, res, data);
            }

            // For other templates, use the existing docxtemplater approach
            const templatePath = path.join(this.templatesPath, `${templateId}.docx`);
            if (!fs.existsSync(templatePath)) {
                return res.status(404).json({ success: false, message: 'Template file not found' });
            }

            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });
            
            const renderData = { ...data };
            doc.render(renderData);

            const buf = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            });

            const generatedFileName = `generated_${templateId}_${Date.now()}.docx`;
            const outputPath = path.join(this.generatedPath, generatedFileName);
            fs.writeFileSync(outputPath, buf);

            console.log(`Document generated: ${outputPath}`);
            
            res.download(outputPath, generatedFileName, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                }
                fs.unlinkSync(outputPath);
            });

        } catch (error) {
            console.error('Error generating document:', error);
            res.status(500).json({ success: false, message: `Error generating document: ${error.message}` });
        }
    }

    // Generate External Examiner Claim document from scratch
    async generateExternalExaminerClaim(req, res, data) {
        try {
            // Calculate amounts based on user input
            const thesisRate = parseInt(data.thesis_rate) || 160;
            const thesisStudents = parseInt(data.thesis_students) || 7;
            const vivaRate = parseInt(data.viva_rate) || 160;
            const vivaStudents = parseInt(data.viva_students) || 7;
            const tadaAmount = parseInt(data.ta_da_amount) || 10;
            
            const thesisAmount = thesisRate * thesisStudents;
            const vivaAmount = vivaRate * vivaStudents;
            const totalAmount = thesisAmount + vivaAmount + tadaAmount;
            
            // Convert amount to words
            const amountInWords = this.convertToWords(totalAmount);

            const docx = officegen('docx');
            
            // Set narrow margins for the document
            docx.docProps = {
                margins: {
                    top: 500,    // 0.5 inch in twips (1 inch = 1440 twips)
                    right: 500,  // 0.5 inch
                    bottom: 500, // 0.5 inch
                    left: 500    // 0.5 inch
                }
            };
            
            // Set document properties
            docx.on('beforegen', () => {
                console.log('Generating External Examiner Claim document...');
            });

            // Header with logo and title - logo centered above header
            const logoPath = path.join(__dirname, '..', 'uploads', 'image.png');
            
            if (fs.existsSync(logoPath)) {
                // Center the logo above the header
                const logoP = docx.createP();
                logoP.options.align = 'center';
                logoP.addImage(logoPath, { cx: 120, cy: 120 }); // Increased size from 80 to 120
                
                // Add the header text centered below the logo
                const headerP = docx.createP();
                headerP.options.align = 'center';
                headerP.addText('OFFICE OF THE ADDITIONAL CONTROLLER OF', { bold: true, font_size: 12, font_face: 'Times New Roman' });
                headerP.addLineBreak();
                headerP.addText('EXAMINATIONS (UNIVERSITY DEPARTMENTS)', { bold: true, font_size: 12, font_face: 'Times New Roman' });
                headerP.addLineBreak();
                headerP.addText('SIKSHA \'O\' ANUSANDHAN', { bold: true, font_size: 12, font_face: 'Times New Roman' });
                headerP.addLineBreak();
                headerP.addLineBreak();
                headerP.addText('Claim Form for Project Work II - External Examiner', { bold: true, font_size: 11, font_face: 'Times New Roman' });
                headerP.addLineBreak();
                headerP.addText('PG End Semester Exam - May 2025', { bold: true, font_size: 11, font_face: 'Times New Roman' });
            } else {
                // Fallback if logo doesn't exist - just center the text
                const pObj = docx.createP();
                pObj.options.align = 'center';
                pObj.addText('OFFICE OF THE ADDITIONAL CONTROLLER OF', { bold: true, font_size: 12, font_face: 'Times New Roman' });
                pObj.addLineBreak();
                pObj.addText('EXAMINATIONS (UNIVERSITY DEPARTMENTS)', { bold: true, font_size: 12, font_face: 'Times New Roman' });
                pObj.addLineBreak();
                pObj.addText('SIKSHA \'O\' ANUSANDHAN', { bold: true, font_size: 12, font_face: 'Times New Roman' });
                pObj.addLineBreak();
                pObj.addText('Claim Form for Project Work II - External Examiner', { bold: true, font_size: 11, font_face: 'Times New Roman' });
                pObj.addLineBreak();
                pObj.addText('PG End Semester Exam - May 2025', { bold: true, font_size: 11, font_face: 'Times New Roman' });
            }

            // Add some spacing
            docx.createP().addLineBreak();

            // Personal Information Table
            const table1 = [
                [
                    { val: 'Name:', opts: { b: true, cellColWidth: 2000 } },
                    { val: data.examiner_name || '', opts: { cellColWidth: 8000 } }
                ],
                [
                    { val: 'Designation:', opts: { b: true } },
                    { val: data.designation || '', opts: {} }
                ],
                [
                    { val: 'Department:', opts: { b: true } },
                    { val: data.department || '', opts: {} }
                ],
                [
                    { val: 'Branch:', opts: { b: true } },
                    { val: data.branch || '', opts: {} }
                ],
                [
                    { val: 'Course Name:', opts: { b: true } },
                    { val: data.course_name || '', opts: {} }
                ],
                [
                    { val: 'Course Code:', opts: { b: true } },
                    { val: data.course_code || '', opts: {} }
                ]
            ];

            docx.createTable(table1, {
                tableColWidth: 10000,
                tableSize: 100,
                tableAlign: 'left',
                borders: true
            });

            // Add spacing
            docx.createP().addLineBreak();

            // Fee Details Table with dynamic calculations
            const feeTable = [
                [
                    { val: 'Sl. No.', opts: { b: true, align: 'center', cellColWidth: 1200 } },
                    { val: 'Description', opts: { b: true, align: 'center', cellColWidth: 4000 } },
                    { val: 'Rate per Student', opts: { b: true, align: 'center', cellColWidth: 2000 } },
                    { val: 'No. of Students', opts: { b: true, align: 'center', cellColWidth: 1800 } },
                    { val: 'Amount (Rs.)', opts: { b: true, align: 'center', cellColWidth: 2000 } }
                ],
                [
                    { val: '1', opts: { align: 'center' } },
                    { val: 'Thesis Evaluation Fee', opts: {} },
                    { val: `Rs.${thesisRate}/-`, opts: { align: 'center' } },
                    { val: thesisStudents.toString(), opts: { align: 'center' } },
                    { val: thesisAmount.toString(), opts: { align: 'center' } }
                ],
                [
                    { val: '2', opts: { align: 'center' } },
                    { val: 'Viva Voce Examination Fee', opts: {} },
                    { val: `Rs.${vivaRate}/-`, opts: { align: 'center' } },
                    { val: vivaStudents.toString(), opts: { align: 'center' } },
                    { val: vivaAmount.toString(), opts: { align: 'center' } }
                ],
                [
                    { val: '3', opts: { align: 'center' } },
                    { val: 'TA/DA', opts: {} },
                    { val: '', opts: { align: 'center' } },
                    { val: '', opts: { align: 'center' } },
                    { val: tadaAmount.toString(), opts: { align: 'center' } }
                ],
                [
                    { val: '', opts: {} },
                    { val: 'Total Amount', opts: { b: true, align: 'right' } },
                    { val: '', opts: {} },
                    { val: '', opts: {} },
                    { val: totalAmount.toString(), opts: { b: true, align: 'center' } }
                ]
            ];

            docx.createTable(feeTable, {
                tableColWidth: 11000,
                tableSize: 100,
                tableAlign: 'left',
                borders: true
            });

            // Amount in words
            docx.createP().addLineBreak();
            const amountP = docx.createP();
            amountP.addText('Received a sum of Rs. ', { font_size: 11, font_face: 'Times New Roman' });
            amountP.addText(totalAmount.toString(), { font_size: 11, bold: true, font_face: 'Times New Roman' });
            amountP.addText(' (Rupees ', { font_size: 11, font_face: 'Times New Roman' });
            amountP.addText(amountInWords, { font_size: 11, bold: true, font_face: 'Times New Roman' });
            amountP.addText(')', { font_size: 11, font_face: 'Times New Roman' });

            // Signature section
            docx.createP().addLineBreak();
            docx.createP().addLineBreak();
            const sigTable = [
                [
                    { val: 'Date:', opts: { b: true, cellColWidth: 2500 } },
                    { val: data.date || new Date().toLocaleDateString(), opts: { cellColWidth: 4000 } },
                    { val: 'Signature of the Examiner', opts: { b: true, align: 'center', cellColWidth: 4500 } }
                ]
            ];

            docx.createTable(sigTable, {
                tableColWidth: 11000,
                tableSize: 100,
                tableAlign: 'left',
                borders: true
            });

            // Office Use Only section
            docx.createP().addLineBreak();
            const officeP = docx.createP();
            officeP.options.align = 'center';
            officeP.addText('Office Use Only', { bold: true, font_size: 12, font_face: 'Times New Roman' });

            // Office use table with certification text
            docx.createP().addLineBreak();
            const officeText = docx.createP();
            officeText.addText('Certified that......................................................................has been approved by the Faculty', { font_size: 10, font_face: 'Times New Roman' });
            officeText.addLineBreak();
            officeText.addText('Chairman, Faculty of..........................................................................to act as External', { font_size: 10, font_face: 'Times New Roman' });
            officeText.addLineBreak();
            officeText.addText('Examiner for....................................................................(Programme & Specialization) held', { font_size: 10, font_face: 'Times New Roman' });
            officeText.addLineBreak();
            officeText.addText('on.........................................................................', { font_size: 10, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();
            const claimText = docx.createP();
            claimText.addText('The above claim by the examiner is approved and the bill may please be passed for', { font_size: 10, font_face: 'Times New Roman' });
            claimText.addLineBreak();
            claimText.addText('payment.', { font_size: 10, bold: true, font_face: 'Times New Roman' });
            claimText.addLineBreak();
            claimText.addText('FAST ORDER', { font_size: 10, bold: true, color: 'red', font_face: 'Times New Roman' });

            docx.createP().addLineBreak();
            const passText = docx.createP();
            passText.addText(`Passed for Rs.${data.honorariumAmount || '..........................'}(Rupees ${data.honorariumAmountWords || '.................................................................................................'})`, { font_size: 10, font_face: 'Times New Roman' });

            // Final signature table
            docx.createP().addLineBreak();
            docx.createP().addLineBreak();
            const finalSigTable = [
                [
                    { val: 'CHIEF SUPERINTENDENT OF PG EXAMS\n(Seal & Signature)', opts: { align: 'center', cellColWidth: 5500 } },
                    { val: 'HEAD OF THE DEPARTMENT\n(Seal & Signature)', opts: { align: 'center', cellColWidth: 5500 } }
                ]
            ];

            docx.createTable(finalSigTable, {
                tableColWidth: 11000,
                tableSize: 100,
                tableAlign: 'left',
                borders: true
            });

            // Generate the document
            const generatedFileName = `External_Examiner_Claim_${Date.now()}.docx`;
            const outputPath = path.join(this.generatedPath, generatedFileName);

            const out = fs.createWriteStream(outputPath);
            out.on('error', (err) => {
                console.error('Error writing file:', err);
                res.status(500).json({ success: false, message: 'Error creating document' });
            });

            out.on('close', () => {
                console.log(`Document generated: ${outputPath}`);
                res.download(outputPath, generatedFileName, (err) => {
                    if (err) {
                        console.error('Error sending file:', err);
                    }
                    // Clean up the generated file after sending
                    fs.unlinkSync(outputPath);
                });
            });

            docx.generate(out);

        } catch (error) {
            console.error('Error generating External Examiner Claim:', error);
            res.status(500).json({ success: false, message: `Error generating document: ${error.message}` });
        }
    }

    // Generate Internal Examiner Claim document from scratch
    async generateInternalExaminerClaim(req, res, data) {
        try {
            const docx = officegen('docx');
            
            // Set narrow margins for the document
            docx.docProps = {
                margins: {
                    top: 500,    // 0.5 inch in twips (1 inch = 1440 twips)
                    right: 500,  // 0.5 inch
                    bottom: 500, // 0.5 inch
                    left: 500    // 0.5 inch
                }
            };
            
            // Set document properties
            docx.on('beforegen', () => {
                console.log('Generating Internal Examiner Claim document...');
            });

            // Header with logo and title - logo centered above header
            const logoPath = path.join(__dirname, '..', 'uploads', 'image.png');
            
            if (fs.existsSync(logoPath)) {
                // Center the logo above the header
                const logoP = docx.createP();
                logoP.options.align = 'center';
                logoP.addImage(logoPath, { cx: 120, cy: 120 });
                
                // Add the header text centered below the logo
                const headerP = docx.createP();
                headerP.options.align = 'center';
                headerP.addText('OFFICE OF THE ADDITIONAL CONTROLLER OF EXAMINATIONS', { bold: true, font_size: 12, font_face: 'Times New Roman' });
                headerP.addLineBreak();
                headerP.addText(`DEPARTMENT: ${data.department || ''}`, { bold: true, font_size: 11, font_face: 'Times New Roman' });
                headerP.addText(`                                    CAMPUS: ${data.campus || ''}`, { bold: true, font_size: 11, font_face: 'Times New Roman' });
                headerP.addLineBreak();
                headerP.addText('HONORARIUM FOR INTERNAL EXAMINER', { bold: true, font_size: 12, font_face: 'Times New Roman' });
            } else {
                // Fallback if logo doesn't exist
                const pObj = docx.createP();
                pObj.options.align = 'center';
                pObj.addText('OFFICE OF THE ADDITIONAL CONTROLLER OF EXAMINATIONS', { bold: true, font_size: 12, font_face: 'Times New Roman' });
                pObj.addLineBreak();
                pObj.addText(`DEPARTMENT: ${data.department || ''}`, { bold: true, font_size: 11, font_face: 'Times New Roman' });
                pObj.addText(`                                    CAMPUS: ${data.campus || ''}`, { bold: true, font_size: 11, font_face: 'Times New Roman' });
                pObj.addLineBreak();
                pObj.addText('HONORARIUM FOR INTERNAL EXAMINER', { bold: true, font_size: 12, font_face: 'Times New Roman' });
            }

            // Add spacing
            docx.createP().addLineBreak();

            // Create the main table with examination details
            const tableRows = [];
            
            // Header row
            tableRows.push([
                { val: 'Sl. No', opts: { b: true, align: 'center', cellColWidth: 800 } },
                { val: 'Course', opts: { b: true, align: 'center', cellColWidth: 1400 } },
                { val: 'Subject Code', opts: { b: true, align: 'center', cellColWidth: 1400 } },
                { val: 'Number of candidates', opts: { b: true, align: 'center', cellColWidth: 1200 } },
                { val: 'Date of Viva and session', opts: { b: true, align: 'center', cellColWidth: 1800 } },
                { val: 'Bank and Branch Name', opts: { b: true, align: 'center', cellColWidth: 2200 } },
                { val: 'Account No', opts: { b: true, align: 'center', cellColWidth: 1600 } },
                { val: 'IFSC Code', opts: { b: true, align: 'center', cellColWidth: 1300 } },
                { val: 'PAN No.', opts: { b: true, align: 'center', cellColWidth: 1300 } },
                { val: 'Claimed Amount (no of candidates X Rs.50)', opts: { b: true, align: 'center', cellColWidth: 1800 } },
                { val: 'TDS@ 10%', opts: { b: true, align: 'center', cellColWidth: 1000 } },
                { val: 'Net Amount', opts: { b: true, align: 'center', cellColWidth: 1100 } },
                { val: 'Signature', opts: { b: true, align: 'center', cellColWidth: 1000 } }
            ]);

            // Get exam entries from data
            const examEntries = data.exam_entries || [{}]; // Default to one empty entry
            
            // Data rows
            examEntries.forEach((entry, index) => {
                const numCandidates = parseInt(entry.num_candidates) || 0;
                const claimedAmount = numCandidates * 50;
                const tdsAmount = Math.round(claimedAmount * 0.1);
                const netAmount = claimedAmount - tdsAmount;
                
                tableRows.push([
                    { val: (index + 1).toString(), opts: { align: 'center' } },
                    { val: entry.course || '', opts: {} },
                    { val: entry.subject_code || '', opts: {} },
                    { val: entry.num_candidates || '', opts: { align: 'center' } },
                    { val: entry.exam_date || '', opts: {} },
                    { val: entry.bank_branch || '', opts: {} },
                    { val: entry.account_no || '', opts: {} },
                    { val: entry.ifsc_code || '', opts: {} },
                    { val: entry.pan_no || '', opts: {} },
                    { val: claimedAmount.toString(), opts: { align: 'center' } },
                    { val: tdsAmount.toString(), opts: { align: 'center' } },
                    { val: netAmount.toString(), opts: { align: 'center' } },
                    { val: '', opts: {} }
                ]);
            });

            // Calculate totals
            let totalClaimed = 0;
            let totalTDS = 0;
            let totalNet = 0;
            
            examEntries.forEach(entry => {
                const numCandidates = parseInt(entry.num_candidates) || 0;
                const claimed = numCandidates * 50;
                const tds = Math.round(claimed * 0.1);
                totalClaimed += claimed;
                totalTDS += tds;
                totalNet += (claimed - tds);
            });

            // Total row
            tableRows.push([
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: 'TOTAL', opts: { b: true, align: 'right' } },
                { val: totalClaimed.toString(), opts: { b: true, align: 'center' } },
                { val: totalTDS.toString(), opts: { b: true, align: 'center' } },
                { val: totalNet.toString(), opts: { b: true, align: 'center' } },
                { val: '', opts: {} }
            ]);

            docx.createTable(tableRows, {
                tableColWidth: 17800,
                tableSize: 100,
                tableAlign: 'left',
                borders: true
            });

            // Add spacing and certification text
            docx.createP().addLineBreak();
            const certText = docx.createP();
            certText.addText(`Certified that the expenses incurred towards Internal Examiner in connection with PG exams conducted`, { font_size: 10, font_face: 'Times New Roman' });
            certText.addLineBreak();
            certText.addText(`${data.date || 'May 2025'}`, { font_size: 10, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();
            const passedText = docx.createP();
            passedText.addText(`Passed for Rs.${data.honorariumAmount || '_________________________'}(Rupees ${data.honorariumAmountWords || '_________________________'}).`, { font_size: 10, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();
            const tdsText = docx.createP();
            tdsText.addText(`TDS amount Rs.${data.tdsAmount || '__________________'}(Rupees ${data.tdsAmountWords || '________________________________________________________________'})`, { font_size: 10, font_face: 'Times New Roman' });

            // Final signature section
            docx.createP().addLineBreak();
            docx.createP().addLineBreak();
            const finalSigTable = [
                [
                    { val: 'Chief Superintendent', opts: { align: 'center', cellColWidth: 8900 } },
                    { val: 'Head of the Department', opts: { align: 'center', cellColWidth: 8900 } }
                ]
            ];

            docx.createTable(finalSigTable, {
                tableColWidth: 17800,
                tableSize: 100,
                tableAlign: 'left',
                borders: true
            });

            // Generate the document
            const generatedFileName = `Internal_Examiner_Claim_${Date.now()}.docx`;
            const outputPath = path.join(this.generatedPath, generatedFileName);

            const out = fs.createWriteStream(outputPath);
            out.on('error', (err) => {
                console.error('Error writing file:', err);
                res.status(500).json({ success: false, message: 'Error creating document' });
            });

            out.on('close', () => {
                console.log(`Document generated: ${outputPath}`);
                res.download(outputPath, generatedFileName, (err) => {
                    if (err) {
                        console.error('Error sending file:', err);
                    }
                    // Clean up the generated file after sending
                    fs.unlinkSync(outputPath);
                });
            });

            docx.generate(out);

        } catch (error) {
            console.error('Error generating Internal Examiner Claim:', error);
            res.status(500).json({ success: false, message: `Error generating document: ${error.message}` });
        }
    }

    // Generate Supervisor Claim document from scratch
    async generateSupervisorClaim(req, res, data) {
        try {
            const docx = officegen('docx');
            
            // Set narrow margins for the document
            docx.docProps = {
                margins: {
                    top: 500,    // 0.5 inch in twips (1 inch = 1440 twips)
                    right: 500,  // 0.5 inch
                    bottom: 500, // 0.5 inch
                    left: 500    // 0.5 inch
                }
            };
            
            // Set document properties
            docx.on('beforegen', () => {
                console.log('Generating Supervisor Claim document...');
            });

            // Header with logo and title
            const logoPath = path.join(__dirname, '..', 'uploads', 'image.png');
            
            if (fs.existsSync(logoPath)) {
                // Center the logo above the header
                const logoP = docx.createP();
                logoP.options.align = 'center';
                logoP.addImage(logoPath, { cx: 120, cy: 120 });
                
                // Add the header text centered below the logo
                const headerP = docx.createP();
                headerP.options.align = 'center';
                headerP.addText('OFFICE OF THE ADDITIONAL CONTROLLER OF EXAMINATIONS', { bold: true, font_size: 12, font_face: 'Times New Roman' });
                headerP.addLineBreak();
                headerP.addText(`DEPARTMENT: ${data.department || ''}`, { bold: true, font_size: 11, font_face: 'Times New Roman' });
                headerP.addText(`                                    CAMPUS: ${data.campus || ''}`, { bold: true, font_size: 11, font_face: 'Times New Roman' });
                headerP.addLineBreak();
                headerP.addText('HONORARIUM FOR GUIDE/SUPERVISOR', { bold: true, font_size: 12, font_face: 'Times New Roman' });
            } else {
                // Fallback if logo doesn't exist
                const pObj = docx.createP();
                pObj.options.align = 'center';
                pObj.addText('OFFICE OF THE ADDITIONAL CONTROLLER OF EXAMINATIONS', { bold: true, font_size: 12, font_face: 'Times New Roman' });
                pObj.addLineBreak();
                pObj.addText(`DEPARTMENT: ${data.department || ''}`, { bold: true, font_size: 11, font_face: 'Times New Roman' });
                pObj.addText(`                                    CAMPUS: ${data.campus || ''}`, { bold: true, font_size: 11, font_face: 'Times New Roman' });
                pObj.addLineBreak();
                pObj.addText('HONORARIUM FOR GUIDE/SUPERVISOR', { bold: true, font_size: 12, font_face: 'Times New Roman' });
            }

            // Add spacing
            docx.createP().addLineBreak();

            // Create the main table with supervisor details
            const tableRows = [];
            
            // Header row
            tableRows.push([
                { val: 'Sl. No', opts: { b: true, align: 'center', cellColWidth: 800 } },
                { val: 'Course', opts: { b: true, align: 'center', cellColWidth: 1400 } },
                { val: 'Subject Code', opts: { b: true, align: 'center', cellColWidth: 1400 } },
                { val: 'Name of Supervisor', opts: { b: true, align: 'center', cellColWidth: 2000 } },
                { val: 'Number of candidates', opts: { b: true, align: 'center', cellColWidth: 1200 } },
                { val: 'Bank and Branch Name', opts: { b: true, align: 'center', cellColWidth: 2200 } },
                { val: 'Account No', opts: { b: true, align: 'center', cellColWidth: 1600 } },
                { val: 'IFSC Code', opts: { b: true, align: 'center', cellColWidth: 1300 } },
                { val: 'PAN No.', opts: { b: true, align: 'center', cellColWidth: 1300 } },
                { val: 'Claimed Amount', opts: { b: true, align: 'center', cellColWidth: 1800 } },
                { val: 'TDS @ 10%', opts: { b: true, align: 'center', cellColWidth: 1000 } },
                { val: 'Net Amount', opts: { b: true, align: 'center', cellColWidth: 1100 } },
                { val: 'Signature', opts: { b: true, align: 'center', cellColWidth: 1000 } }
            ]);

            // Get supervisor entries from data
            const supervisorEntries = data.supervisor_entries || [{}]; // Default to one empty entry
            
            // Data rows
            supervisorEntries.forEach((entry, index) => {
                const numCandidates = parseInt(entry.num_candidates) || 0;
                const claimedAmount = numCandidates * 50; // Assuming Rs.50 per candidate like internal examiner
                const tdsAmount = Math.round(claimedAmount * 0.1);
                const netAmount = claimedAmount - tdsAmount;
                
                tableRows.push([
                    { val: (index + 1).toString(), opts: { align: 'center' } },
                    { val: entry.course || '', opts: {} },
                    { val: entry.subject_code || '', opts: {} },
                    { val: entry.supervisor_name || '', opts: {} },
                    { val: entry.num_candidates || '', opts: { align: 'center' } },
                    { val: entry.bank_branch || '', opts: {} },
                    { val: entry.account_no || '', opts: {} },
                    { val: entry.ifsc_code || '', opts: {} },
                    { val: entry.pan_no || '', opts: {} },
                    { val: claimedAmount.toString(), opts: { align: 'center' } },
                    { val: tdsAmount.toString(), opts: { align: 'center' } },
                    { val: netAmount.toString(), opts: { align: 'center' } },
                    { val: '', opts: {} }
                ]);
            });

            // Calculate totals
            let totalClaimed = 0;
            let totalTDS = 0;
            let totalNet = 0;
            
            supervisorEntries.forEach(entry => {
                const numCandidates = parseInt(entry.num_candidates) || 0;
                const claimed = numCandidates * 50;
                const tds = Math.round(claimed * 0.1);
                totalClaimed += claimed;
                totalTDS += tds;
                totalNet += (claimed - tds);
            });

            // Total row
            tableRows.push([
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: '', opts: {} },
                { val: 'TOTAL', opts: { b: true, align: 'right' } },
                { val: totalClaimed.toString(), opts: { b: true, align: 'center' } },
                { val: totalTDS.toString(), opts: { b: true, align: 'center' } },
                { val: totalNet.toString(), opts: { b: true, align: 'center' } },
                { val: '', opts: {} }
            ]);

            docx.createTable(tableRows, {
                tableColWidth: 17800,
                tableSize: 100,
                tableAlign: 'left',
                borders: true
            });

            // Add spacing and certification text
            docx.createP().addLineBreak();
            const certText = docx.createP();
            certText.addText(`Certified that the expenses incurred towards Supervisor in connection with PG exams conducted`, { font_size: 10, font_face: 'Times New Roman' });
            certText.addLineBreak();
            certText.addText(`${data.date || 'May 2025'}`, { font_size: 10, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();
            const passedText = docx.createP();
            passedText.addText(`Passed for Rs.${data.honorariumAmount || '_________________________'}(Rupees ${data.honorariumAmountWords || '_________________________'}).`, { font_size: 10, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();
            const tdsText = docx.createP();
            tdsText.addText(`TDS amount Rs.${data.tdsAmount || '__________________'}(Rupees ${data.tdsAmountWords || '________________________________________________________________'})`, { font_size: 10, font_face: 'Times New Roman' });

            // Final signature section
            docx.createP().addLineBreak();
            docx.createP().addLineBreak();
            const finalSigTable = [
                [
                    { val: 'Chief Superintendent', opts: { align: 'center', cellColWidth: 8900 } },
                    { val: 'Head of the Department', opts: { align: 'center', cellColWidth: 8900 } }
                ]
            ];

            docx.createTable(finalSigTable, {
                tableColWidth: 17800,
                tableSize: 100,
                tableAlign: 'left',
                borders: true
            });

            // Generate the document
            const generatedFileName = `Supervisor_Claim_${Date.now()}.docx`;
            const outputPath = path.join(this.generatedPath, generatedFileName);

            const out = fs.createWriteStream(outputPath);
            out.on('error', (err) => {
                console.error('Error writing file:', err);
                res.status(500).json({ success: false, message: 'Error creating document' });
            });

            out.on('close', () => {
                console.log(`Document generated: ${outputPath}`);
                res.download(outputPath, generatedFileName, (err) => {
                    if (err) {
                        console.error('Error sending file:', err);
                    }
                    // Clean up the generated file after sending
                    fs.unlinkSync(outputPath);
                });
            });

            docx.generate(out);

        } catch (error) {
            console.error('Error generating Supervisor Claim:', error);
            res.status(500).json({ success: false, message: `Error generating document: ${error.message}` });
        }
    }

    // Generate Chairman Letter document from scratch
    async generateChairmanLetter(req, res, data) {
        try {
            const docx = officegen('docx');
            
            // Set narrow margins for the document
            docx.docProps = {
                margins: {
                    top: 500, right: 500, bottom: 500, left: 500
                }
            };

            // Header with title
            const titleP = docx.createP();
            titleP.options.align = 'center';
            titleP.addText('LIST OF EXAMINERS', { bold: true, font_size: 14, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();

            // Get examiner batches from data
            const examinerBatches = data.examiner_batches || [{}]; // Default to one empty entry
            
            // Create the main table
            const tableRows = [];
            
            // Header row
            tableRows.push([
                { val: 'S.No.', opts: { b: true, align: 'center', cellColWidth: 800 } },
                { val: 'Batch No.', opts: { b: true, align: 'center', cellColWidth: 1200 } },
                { val: 'Register Number', opts: { b: true, align: 'center', cellColWidth: 2000 } },
                { val: 'Name of the Student', opts: { b: true, align: 'center', cellColWidth: 3000 } },
                { val: 'External Panel Members', opts: { b: true, align: 'center', cellColWidth: 4000 } }
            ]);

            let serialNumber = 1;
            
            examinerBatches.forEach((batch, batchIndex) => {
                // Get students from nested structure
                const students = batch.students || [{}]; // Default to one empty student
                
                // Create external panel members text
                const panelMembers = [];
                if (batch.member1_name) {
                    panelMembers.push(`${batch.member1_name}\r\n${batch.member1_affiliation || ''}`);
                }
                if (batch.member2_name) {
                    panelMembers.push(`${batch.member2_name}\r\n${batch.member2_affiliation || ''}`);
                }
                if (batch.member3_name) {
                    panelMembers.push(`${batch.member3_name}\r\n${batch.member3_affiliation || ''}`);
                }
                const panelMembersText = panelMembers.join('\r\n\r\n');
                
                // Create a single row for this batch with all students combined
                const batchNo = batch.batch_no || (batchIndex + 1).toString();
                
                // Create formatted text with proper line breaks for Word document
                let registerNumbersText = '';
                let studentNamesText = '';
                
                students.forEach((student, studentIndex) => {
                    if (studentIndex > 0) {
                        registerNumbersText += '\r\n'; // Use Windows line breaks for Word
                        studentNamesText += '\r\n';
                    }
                    registerNumbersText += student.register_number || '';
                    studentNamesText += student.student_name || '';
                });
                
                tableRows.push([
                    { val: serialNumber.toString(), opts: { align: 'center' } },
                    { val: batchNo, opts: { align: 'center' } },
                    { val: registerNumbersText, opts: { align: 'center' } },
                    { val: studentNamesText, opts: {} },
                    { val: panelMembersText, opts: {} }
                ]);
                
                serialNumber++;
            });

            docx.createTable(tableRows, {
                tableColWidth: 11000,
                tableSize: 100,
                tableAlign: 'left',
                borders: true
            });

            // Add spacing
            docx.createP().addLineBreak();
            docx.createP().addLineBreak();
            docx.createP().addLineBreak();

            // Signature section
            const signatureP = docx.createP();
            signatureP.options.align = 'right';
            signatureP.addText('Chairman – I&CE', { font_size: 11, bold: true, font_face: 'Times New Roman' });

            // Generate the document
            const generatedFileName = `Chairman_Letter_${Date.now()}.docx`;
            const outputPath = path.join(this.generatedPath, generatedFileName);

            const out = fs.createWriteStream(outputPath);
            out.on('error', (err) => {
                console.error('Error writing file:', err);
                res.status(500).json({ success: false, message: 'Error creating document' });
            });

            out.on('close', () => {
                console.log(`Document generated: ${outputPath}`);
                res.download(outputPath, generatedFileName, (err) => {
                    if (err) {
                        console.error('Error sending file:', err);
                    }
                    fs.unlinkSync(outputPath);
                });
            });

            docx.generate(out);

        } catch (error) {
            console.error('Error generating Chairman Letter:', error);
            res.status(500).json({ success: false, message: `Error generating document: ${error.message}` });
        }
    }

    // Generate External Letter document from scratch
    async generateExternalLetter(req, res, data) {
        try {
            const docx = officegen('docx');
            
            // Set narrow margins for the document
            docx.docProps = {
                margins: {
                    top: 500, right: 500, bottom: 500, left: 500
                }
            };

            // Header with sender details and date
            const headerP = docx.createP();
            headerP.addText(`${data.sender_name || '[Sender Name]'}`, { font_size: 12, bold: true, font_face: 'Times New Roman' });
            headerP.addLineBreak();
            headerP.addText(`${data.sender_designation || '[Designation]'}`, { font_size: 11, font_face: 'Times New Roman' });

            // Date on the right side
            const dateP = docx.createP();
            dateP.options.align = 'right';
            dateP.addText(`${data.date || '[Date]'}`, { font_size: 11, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();

            // To Address
            const toP = docx.createP();
            toP.addText('To', { font_size: 11, font_face: 'Times New Roman' });
            toP.addLineBreak();
            toP.addText(`${data.examiner_name || '[Examiner Name]'}`, { font_size: 11, font_face: 'Times New Roman' });
            toP.addLineBreak();
            toP.addText(`${data.examiner_address || '[Examiner Address]'}`, { font_size: 11, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();

            // Salutation
            const salutationP = docx.createP();
            salutationP.addText('Dear Madam,', { font_size: 11, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();

            // Subject with proper indentation
            const subjectP = docx.createP();
            subjectP.addText('Sub: ', { font_size: 11, bold: true, font_face: 'Times New Roman' });
            subjectP.addText(`External Examiner – ${data.course_name || '[Course Name]'} – ${data.course_code || '[Course Code]'} - ${data.project_type || '[Project Type]'} - Viva Voce Examination - Reg.`, { font_size: 11, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();

            // Body paragraph
            const bodyP = docx.createP();
            bodyP.addText(`We are pleased to inform that you are appointed as an External Examiner for ${data.course_name || '[Course Name]'} project viva voce examination. The viva-voce is scheduled on `, { font_size: 11, font_face: 'Times New Roman' });
            bodyP.addText(`${data.viva_date || '[Viva Date]'} at ${data.viva_time || '[Viva Time]'} `, { font_size: 11, bold: true, font_face: 'Times New Roman' });
            bodyP.addText(`in the ${data.viva_venue || '[Viva Venue]'}. Kindly make yourself comfortable to attend the same.`, { font_size: 11, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();

            // Honorarium paragraph
            const honorariumP = docx.createP();
            honorariumP.addText('The honorarium and TA/DA will be paid as per the University norms.', { font_size: 11, font_face: 'Times New Roman' });

            docx.createP().addLineBreak();

            // Closing
            const closingP = docx.createP();
            closingP.addText('Thank You', { font_size: 11, font_face: 'Times New Roman' });

            // Reduced spacing before signatures to fit on one page
            docx.createP().addLineBreak();
            docx.createP().addLineBreak();
            docx.createP().addLineBreak();

            // Signature section with two columns
            const signatureTable = [
                [
                    { val: `(${data.coordinator_name || '[Project Co-coordinator Name]'})\r\nProject Co-coordinator`, opts: { align: 'center', cellColWidth: 5500 } },
                    { val: `(${data.hod_name || '[Head of Department Name]'})\r\nHead of the Department`, opts: { align: 'center', cellColWidth: 5500 } }
                ]
            ];

            docx.createTable(signatureTable, {
                tableColWidth: 11000,
                tableSize: 100,
                tableAlign: 'left',
                borders: false // No borders for signature table
            });

            // Generate the document
            const generatedFileName = `External_Letter_${Date.now()}.docx`;
            const outputPath = path.join(this.generatedPath, generatedFileName);

            const out = fs.createWriteStream(outputPath);
            out.on('error', (err) => {
                console.error('Error writing file:', err);
                res.status(500).json({ success: false, message: 'Error creating document' });
            });

            out.on('close', () => {
                console.log(`Document generated: ${outputPath}`);
                res.download(outputPath, generatedFileName, (err) => {
                    if (err) {
                        console.error('Error sending file:', err);
                    }
                    fs.unlinkSync(outputPath);
                });
            });

            docx.generate(out);

        } catch (error) {
            console.error('Error generating External Letter:', error);
            res.status(500).json({ success: false, message: `Error generating document: ${error.message}` });
        }
    }

    // Helper function to convert numbers to words
    convertToWords(amount) {
        const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
        const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        
        if (amount === 0) return 'zero';
        
        let words = '';
        
        if (amount >= 1000) {
            const thousands = Math.floor(amount / 1000);
            words += this.convertHundreds(thousands) + ' thousand ';
            amount %= 1000;
        }
        
        if (amount >= 100) {
            words += ones[Math.floor(amount / 100)] + ' hundred ';
            amount %= 100;
        }
        
        if (amount >= 20) {
            words += tens[Math.floor(amount / 10)] + ' ';
            amount %= 10;
        } else if (amount >= 10) {
            words += teens[amount - 10] + ' ';
            amount = 0;
        }
        
        if (amount > 0) {
            words += ones[amount] + ' ';
        }
        
        return words.trim() + ' only';
    }
    
    convertHundreds(num) {
        const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
        const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        
        let words = '';
        
        if (num >= 100) {
            words += ones[Math.floor(num / 100)] + ' hundred ';
            num %= 100;
        }
        
        if (num >= 20) {
            words += tens[Math.floor(num / 10)] + ' ';
            num %= 10;
        } else if (num >= 10) {
            words += teens[num - 10] + ' ';
            num = 0;
        }
        
        if (num > 0) {
            words += ones[num] + ' ';
        }
        
        return words.trim();
    }
}

module.exports = SimpleDocumentController;
