const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

class TemplatePreparator {
    constructor() {
        this.templatesPath = path.join(__dirname, '..', 'uploads', 'templates');
        this.preparedPath = path.join(__dirname, '..', 'uploads', 'templates', 'prepared');
        
        if (!fs.existsSync(this.preparedPath)) {
            fs.mkdirSync(this.preparedPath, { recursive: true });
        }
    }

    // Mapping of common text patterns to template variables
    getVariableMappings() {
        return {
            // Personal details
            'Name:': '{examinerName}',
            'Examiner Name:': '{examinerName}',
            'External Examiner Name:': '{examinerName}',
            'Internal Examiner Name:': '{examinerName}',
            'Supervisor Name:': '{supervisorName}',
            'Guide Name:': '{supervisorName}',
            'Student Name:': '{studentName}',
            'Chairman Name:': '{chairmanName}',
            
            // Institutional details
            'Designation:': '{designation}',
            'Department:': '{department}',
            'College:': '{college}',
            'Institution:': '{organization}',
            'Organization:': '{organization}',
            
            // Contact details
            'Address:': '{address}',
            'Phone:': '{phone}',
            'Mobile:': '{phone}',
            'Email:': '{email}',
            'E-mail:': '{email}',
            
            // Academic details
            'Course:': '{course}',
            'Semester:': '{semester}',
            'Subject:': '{subject}',
            'Roll Number:': '{rollNumber}',
            'Project Title:': '{projectTitle}',
            
            // Examination details
            'Date:': '{date}',
            'Examination Date:': '{examDate}',
            'Date of Examination:': '{examDate}',
            'Time:': '{examTime}',
            'Examination Time:': '{examTime}',
            'Venue:': '{venue}',
            'Examination Venue:': '{venue}',
            
            // Financial details
            'Honorarium:': '{honorarium}',
            'Travel Allowance:': '{travelAllowance}',
            'Travel Distance:': '{travelDistance}',
            'Amount:': '{amount}',
            
            // Common placeholders
            '_______________': '{placeholder}',
            '....................': '{placeholder}',
            '_____': '{placeholder}',
            '______': '{placeholder}',
            '_______': '{placeholder}',
            '________': '{placeholder}',
            '_________': '{placeholder}',
            '__________': '{placeholder}',
            '___________': '{placeholder}',
            '____________': '{placeholder}',
            
            // Date placeholders
            'DD/MM/YYYY': '{date}',
            'dd/mm/yyyy': '{date}',
            '__/__/____': '{date}',
            '__/__/__': '{date}',
            'Date: __________': 'Date: {date}',
        };
    }

    // Instructions for manual template preparation
    generateInstructions(templateName) {
        const instructions = {
            'Viva claim - Internal Examiner.docx': {
                title: 'Viva Claim - Internal Examiner Template Preparation',
                variables: [
                    'Replace "Examiner Name:" field with {examinerName}',
                    'Replace "Designation:" field with {designation}',
                    'Replace "Department:" field with {department}',
                    'Replace "College:" field with {college}',
                    'Replace "Date:" field with {date}',
                    'Replace "Examination Date:" field with {examDate}',
                    'Replace "Time:" field with {examTime}',
                    'Replace "Venue:" field with {venue}',
                    'Replace "Student Name:" field with {studentName}',
                    'Replace "Roll Number:" field with {rollNumber}',
                    'Replace "Course:" field with {course}',
                    'Replace "Semester:" field with {semester}',
                    'Replace "Subject:" field with {subject}',
                    'Replace "Project Title:" field with {projectTitle}'
                ],
                tables: []
            },
            'Viva claim External Examiner.docx': {
                title: 'Viva Claim - External Examiner Template Preparation',
                variables: [
                    'Replace "External Examiner Name:" with {examinerName}',
                    'Replace "Designation:" with {designation}',
                    'Replace "Organization:" with {organization}',
                    'Replace "Address:" with {address}',
                    'Replace "Phone:" with {phone}',
                    'Replace "Email:" with {email}',
                    'Replace "Date:" with {date}',
                    'Replace "Examination Date:" with {examDate}',
                    'Replace "Time:" with {examTime}',
                    'Replace "Venue:" with {venue}',
                    'Replace "Travel Distance:" with {travelDistance}',
                    'Replace "Honorarium:" with {honorarium}',
                    'Replace "Travel Allowance:" with {travelAllowance}'
                ],
                tables: [
                    {
                        name: 'students',
                        description: 'For the students table, add {#students} before the first row and {/students} after the last row',
                        columns: [
                            'Replace serial number column with {slNo}',
                            'Replace student name column with {studentName}',
                            'Replace roll number column with {rollNumber}',
                            'Replace project title column with {projectTitle}',
                            'Replace marks column with {marks}'
                        ]
                    }
                ]
            },
            'Viva claim supervisor.docx': {
                title: 'Viva Claim - Supervisor Template Preparation',
                variables: [
                    'Replace "Supervisor Name:" with {supervisorName}',
                    'Replace "Designation:" with {designation}',
                    'Replace "Department:" with {department}',
                    'Replace "College:" with {college}',
                    'Replace "Date:" with {date}',
                    'Replace "Examination Date:" with {examDate}',
                    'Replace "Time:" with {examTime}',
                    'Replace "Venue:" with {venue}',
                    'Replace "Course:" with {course}',
                    'Replace "Semester:" with {semester}',
                    'Replace "Subject:" with {subject}'
                ],
                tables: [
                    {
                        name: 'supervisedStudents',
                        description: 'For the supervised students table, add {#supervisedStudents} before the first row and {/supervisedStudents} after the last row',
                        columns: [
                            'Replace serial number with {slNo}',
                            'Replace student name with {studentName}',
                            'Replace roll number with {rollNumber}',
                            'Replace project title with {projectTitle}',
                            'Replace marks with {marks}'
                        ]
                    }
                ]
            },
            'Viva External member choice - letter to Chairman.docx': {
                title: 'Letter to Chairman for External Member Choice',
                variables: [
                    'Replace "Chairman Name:" with {chairmanName}',
                    'Replace "Department:" with {department}',
                    'Replace "College:" with {college}',
                    'Replace "Date:" with {date}',
                    'Replace "Course:" with {course}',
                    'Replace "Semester:" with {semester}',
                    'Replace "Subject:" with {subject}',
                    'Replace "Examination Date:" with {examDate}',
                    'Replace "Time:" with {examTime}'
                ],
                tables: [
                    {
                        name: 'suggestedExaminers',
                        description: 'For the suggested examiners table, add {#suggestedExaminers} before the first row and {/suggestedExaminers} after the last row',
                        columns: [
                            'Replace serial number with {slNo}',
                            'Replace examiner name with {examinerName}',
                            'Replace designation with {designation}',
                            'Replace organization with {organization}',
                            'Replace specialization with {specialization}',
                            'Replace experience with {experience}'
                        ]
                    }
                ]
            },
            'Viva Letter to external.docx': {
                title: 'Letter to External Examiner',
                variables: [
                    'Replace "External Examiner Name:" with {examinerName}',
                    'Replace "Designation:" with {designation}',
                    'Replace "Organization:" with {organization}',
                    'Replace "Address:" with {address}',
                    'Replace "Date:" with {date}',
                    'Replace "Course:" with {course}',
                    'Replace "Semester:" with {semester}',
                    'Replace "Subject:" with {subject}',
                    'Replace "Examination Date:" with {examDate}',
                    'Replace "Time:" with {examTime}',
                    'Replace "Venue:" with {venue}',
                    'Replace "Contact Person:" with {contactPerson}',
                    'Replace "Contact Phone:" with {contactPhone}',
                    'Replace "Contact Email:" with {contactEmail}'
                ],
                tables: [
                    {
                        name: 'students',
                        description: 'For the students table, add {#students} before the first row and {/students} after the last row',
                        columns: [
                            'Replace serial number with {slNo}',
                            'Replace student name with {studentName}',
                            'Replace roll number with {rollNumber}',
                            'Replace project title with {projectTitle}',
                            'Replace supervisor with {supervisor}'
                        ]
                    }
                ]
            }
        };

        return instructions[templateName] || null;
    }

    // Generate detailed preparation guide for a specific template
    generatePreparationGuide(templateName) {
        const instructions = this.generateInstructions(templateName);
        
        if (!instructions) {
            return `No specific instructions available for ${templateName}`;
        }

        let guide = `\n=== ${instructions.title} ===\n\n`;
        
        guide += 'STEP 1: Open the Word document\n';
        guide += `Open "${templateName}" in Microsoft Word.\n\n`;
        
        guide += 'STEP 2: Replace text fields with template variables\n';
        instructions.variables.forEach((instruction, index) => {
            guide += `${index + 1}. ${instruction}\n`;
        });
        
        if (instructions.tables && instructions.tables.length > 0) {
            guide += '\nSTEP 3: Prepare dynamic tables\n';
            instructions.tables.forEach((table, index) => {
                guide += `\nTable ${index + 1}: ${table.name}\n`;
                guide += `${table.description}\n`;
                table.columns.forEach((column, colIndex) => {
                    guide += `  ${colIndex + 1}. ${column}\n`;
                });
            });
        }
        
        guide += '\nSTEP 4: Save the document\n';
        guide += 'Save the document in the same location, replacing the original.\n\n';
        
        guide += 'STEP 5: Test the template\n';
        guide += 'Use the document generation system to test your prepared template.\n\n';
        
        return guide;
    }

    // Generate guides for all templates
    generateAllGuides() {
        const templateFiles = fs.readdirSync(this.templatesPath)
            .filter(file => file.endsWith('.docx'));

        let fullGuide = 'COMPREHENSIVE TEMPLATE PREPARATION GUIDE\n';
        fullGuide += '='.repeat(50) + '\n\n';
        
        fullGuide += 'This guide will help you prepare each Word template for the document generation system.\n';
        fullGuide += 'Follow the instructions for each template carefully.\n\n';

        templateFiles.forEach(templateFile => {
            const guide = this.generatePreparationGuide(templateFile);
            fullGuide += guide + '\n' + '='.repeat(50) + '\n';
        });

        return fullGuide;
    }

    // Create sample data for testing templates
    createSampleData(templateType) {
        const sampleData = {
            'Viva_claim_Internal_Examiner': {
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
                projectTitle: 'Machine Learning Based Recommendation System'
            },
            'Viva_claim_External_Examiner': {
                examinerName: 'Dr. Mary Wilson',
                designation: 'Professor',
                organization: 'XYZ University',
                address: '123 University Road, City - 560001',
                phone: '+91-9876543210',
                email: 'mary.wilson@xyz.edu',
                date: new Date().toISOString().split('T')[0],
                examDate: '2025-08-15',
                examTime: '10:00 AM',
                venue: 'Conference Hall',
                travelDistance: 50,
                honorarium: 5000,
                travelAllowance: 1500,
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
                    }
                ]
            }
        };

        return sampleData[templateType] || {};
    }

    // Save preparation guides to files
    saveGuidesToFiles() {
        try {
            const guidesDir = path.join(__dirname, '..', 'guides');
            if (!fs.existsSync(guidesDir)) {
                fs.mkdirSync(guidesDir, { recursive: true });
            }

            // Save comprehensive guide
            const fullGuide = this.generateAllGuides();
            fs.writeFileSync(path.join(guidesDir, 'COMPLETE_PREPARATION_GUIDE.md'), fullGuide);

            // Save individual guides
            const templateFiles = fs.readdirSync(this.templatesPath)
                .filter(file => file.endsWith('.docx'));

            templateFiles.forEach(templateFile => {
                const guide = this.generatePreparationGuide(templateFile);
                const filename = templateFile.replace('.docx', '_GUIDE.md');
                fs.writeFileSync(path.join(guidesDir, filename), guide);
            });

            console.log(`Preparation guides saved to ${guidesDir}`);
            return guidesDir;

        } catch (error) {
            console.error('Error saving guides:', error);
            throw error;
        }
    }
}

// CLI usage
if (require.main === module) {
    const preparator = new TemplatePreparator();
    
    const command = process.argv[2];
    const templateName = process.argv[3];

    switch (command) {
        case 'guide':
            if (templateName) {
                console.log(preparator.generatePreparationGuide(templateName));
            } else {
                console.log(preparator.generateAllGuides());
            }
            break;
        case 'save-guides':
            preparator.saveGuidesToFiles();
            break;
        case 'sample-data':
            if (templateName) {
                console.log(JSON.stringify(preparator.createSampleData(templateName), null, 2));
            }
            break;
        default:
            console.log('Usage:');
            console.log('  node templatePreparator.js guide [template-name]');
            console.log('  node templatePreparator.js save-guides');
            console.log('  node templatePreparator.js sample-data [template-type]');
    }
}

module.exports = TemplatePreparator;
