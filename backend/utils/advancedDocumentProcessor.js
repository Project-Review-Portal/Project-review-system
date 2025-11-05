const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

class AdvancedDocumentProcessor {
    constructor() {
        this.templatesPath = path.join(__dirname, '..', 'uploads', 'templates');
        this.outputPath = path.join(__dirname, '..', 'uploads', 'generated');
        
        // Ensure directories exist
        this.ensureDirectoriesExist();
    }

    ensureDirectoriesExist() {
        [this.templatesPath, this.outputPath].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    // Auto-generate template structure by analyzing the document
    analyzeTemplateStructure(templatePath) {
        try {
            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            const documentXml = zip.files['word/document.xml'].asText();
            
            // Extract existing variables
            const variablePattern = /\{([^}]+)\}/g;
            const variables = new Set();
            let match;
            
            while ((match = variablePattern.exec(documentXml)) !== null) {
                const variable = match[1];
                // Skip table loop variables
                if (!variable.startsWith('#') && !variable.startsWith('/')) {
                    variables.push(variable);
                }
            }
            
            // Extract table structures
            const tableLoopPattern = /\{#(\w+)\}([\s\S]*?)\{\/\1\}/g;
            const tables = [];
            
            while ((match = tableLoopPattern.exec(documentXml)) !== null) {
                const tableName = match[1];
                const tableContent = match[2];
                
                // Extract column variables from table content
                const columnPattern = /\{(\w+)\}/g;
                const columns = new Set();
                let columnMatch;
                
                while ((columnMatch = columnPattern.exec(tableContent)) !== null) {
                    columns.add(columnMatch[1]);
                }
                
                tables.push({
                    name: tableName,
                    columns: Array.from(columns)
                });
            }
            
            return {
                variables: Array.from(variables),
                tables
            };
        } catch (error) {
            console.error('Error analyzing template structure:', error);
            return { variables: [], tables: [] };
        }
    }

    // Generate document with advanced features
    async generateAdvancedDocument(templatePath, data, options = {}) {
        try {
            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                ...options
            });

            // Pre-process data
            const processedData = this.preprocessData(data);
            
            // Set the template variables
            doc.setData(processedData);

            // Render the document
            doc.render();

            return doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            });

        } catch (error) {
            console.error('Error generating document:', error);
            throw new Error(`Document generation failed: ${error.message}`);
        }
    }

    // Pre-process data to handle common formatting needs
    preprocessData(data) {
        const processed = { ...data };

        // Format dates
        Object.keys(processed).forEach(key => {
            if (key.includes('date') || key.includes('Date')) {
                if (processed[key] && processed[key] instanceof Date) {
                    processed[key] = this.formatDate(processed[key]);
                } else if (processed[key] && typeof processed[key] === 'string') {
                    const date = new Date(processed[key]);
                    if (!isNaN(date.getTime())) {
                        processed[key] = this.formatDate(date);
                    }
                }
            }
        });

        // Format numbers with proper currency/decimal formatting
        Object.keys(processed).forEach(key => {
            if ((key.includes('amount') || key.includes('honorarium') || key.includes('allowance')) && 
                processed[key] && !isNaN(processed[key])) {
                processed[key] = this.formatCurrency(processed[key]);
            }
        });

        // Auto-number table rows
        Object.keys(processed).forEach(key => {
            if (Array.isArray(processed[key])) {
                processed[key] = processed[key].map((row, index) => ({
                    ...row,
                    slNo: row.slNo || (index + 1).toString()
                }));
            }
        });

        return processed;
    }

    formatDate(date) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-IN', options);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }

    // Create sample template with proper structure
    createSampleTemplate(templateType) {
        const templates = {
            'viva-internal': {
                content: `
VIVA EXAMINATION CLAIM FORM - INTERNAL EXAMINER

Date: {date}

Dear Sir/Madam,

I hereby claim the examination fee for conducting viva examination as Internal Examiner.

Personal Details:
Name: {examinerName}
Designation: {designation}
Department: {department}
College/Institution: {college}

Examination Details:
Date of Examination: {examDate}
Time: {examTime}
Venue: {venue}
Course: {course}
Semester: {semester}
Subject: {subject}

Student Details:
Name: {studentName}
Roll Number: {rollNumber}
Project Title: {projectTitle}

Signature: _________________
Date: {date}
                `,
                filename: 'Viva_claim_Internal_Examiner.docx'
            },
            'viva-external': {
                content: `
VIVA EXAMINATION CLAIM FORM - EXTERNAL EXAMINER

Date: {date}

Dear Sir/Madam,

I hereby claim the examination fee for conducting viva examination as External Examiner.

Personal Details:
Name: {examinerName}
Designation: {designation}
Organization: {organization}
Address: {address}
Phone: {phone}
Email: {email}

Examination Details:
Date of Examination: {examDate}
Time: {examTime}
Venue: {venue}
Travel Distance: {travelDistance} km
Honorarium: {honorarium}
Travel Allowance: {travelAllowance}

Students Examined:
{#students}
{slNo}. {studentName} (Roll No: {rollNumber})
    Project: {projectTitle}
    Marks: {marks}

{/students}

Total Students: {students.length}

Signature: _________________
Date: {date}
                `,
                filename: 'Viva_claim_External_Examiner.docx'
            }
        };

        return templates[templateType] || null;
    }

    // Validate template data against structure
    validateTemplateData(structure, data) {
        const errors = [];

        // Check required fields
        if (structure.fields) {
            structure.fields.forEach(field => {
                if (field.required && (!data[field.name] || data[field.name].trim() === '')) {
                    errors.push(`Required field missing: ${field.label}`);
                }
            });
        }

        // Check table data
        if (structure.tables) {
            structure.tables.forEach(table => {
                if (data[table.name] && Array.isArray(data[table.name])) {
                    data[table.name].forEach((row, index) => {
                        table.columns.forEach(column => {
                            if (column.required && (!row[column.name] || row[column.name].toString().trim() === '')) {
                                errors.push(`Table ${table.label}, Row ${index + 1}: ${column.label} is required`);
                            }
                        });
                    });
                }
            });
        }

        return errors;
    }

    // Backup and version control for templates
    backupTemplate(templatePath) {
        const backupDir = path.join(this.templatesPath, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const filename = path.basename(templatePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `${timestamp}_${filename}`);
        
        fs.copyFileSync(templatePath, backupPath);
        return backupPath;
    }
}

module.exports = AdvancedDocumentProcessor;
