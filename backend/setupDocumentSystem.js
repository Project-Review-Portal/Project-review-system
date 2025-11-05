#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const TemplatePreparator = require('./utils/templatePreparator');
const AdvancedDocumentProcessor = require('./utils/advancedDocumentProcessor');

class DocumentSystemSetup {
    constructor() {
        this.basePath = __dirname;
        this.templatesPath = path.join(this.basePath, 'uploads', 'templates');
        this.guidesPath = path.join(this.basePath, 'guides');
        this.outputPath = path.join(this.basePath, 'uploads', 'generated');
    }

    // Setup all necessary directories
    setupDirectories() {
        const directories = [
            this.templatesPath,
            this.guidesPath,
            this.outputPath,
            path.join(this.templatesPath, 'prepared'),
            path.join(this.templatesPath, 'backups')
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`✓ Created directory: ${dir}`);
            }
        });
    }

    // Generate preparation guides
    generateGuides() {
        try {
            const preparator = new TemplatePreparator();
            preparator.saveGuidesToFiles();
            console.log('✓ Generated preparation guides');
        } catch (error) {
            console.error('✗ Error generating guides:', error.message);
        }
    }

    // Analyze existing templates
    analyzeTemplates() {
        try {
            const templateFiles = fs.readdirSync(this.templatesPath)
                .filter(file => file.endsWith('.docx'));

            console.log('\n=== Template Analysis ===');
            console.log(`Found ${templateFiles.length} Word templates:`);
            
            templateFiles.forEach(file => {
                console.log(`  - ${file}`);
            });

            if (templateFiles.length === 0) {
                console.log('\n⚠️  No Word templates found in the templates directory.');
                console.log('   Please add your .docx files to:', this.templatesPath);
            }

        } catch (error) {
            console.error('✗ Error analyzing templates:', error.message);
        }
    }

    // Create sample templates for testing
    createSampleTemplates() {
        const sampleTemplateContent = `
SAMPLE VIVA EXAMINATION FORM

Date: {date}

Personal Details:
Name: {examinerName}
Designation: {designation}
Department: {department}

Examination Details:
Date: {examDate}
Time: {examTime}
Venue: {venue}

Student Information:
Name: {studentName}
Roll No: {rollNumber}
Project: {projectTitle}

Signature: ________________
        `;

        const samplePath = path.join(this.templatesPath, 'SAMPLE_TEMPLATE.txt');
        fs.writeFileSync(samplePath, sampleTemplateContent.trim());
        
        console.log('✓ Created sample template structure');
        console.log('  Note: Convert this to .docx format in Microsoft Word for actual use');
    }

    // Display setup instructions
    displayInstructions() {
        console.log('\n' + '='.repeat(60));
        console.log('DOCUMENT GENERATION SYSTEM SETUP COMPLETE');
        console.log('='.repeat(60));
        
        console.log('\n📁 Directory Structure:');
        console.log(`  Templates: ${this.templatesPath}`);
        console.log(`  Guides: ${this.guidesPath}`);
        console.log(`  Generated: ${this.outputPath}`);
        
        console.log('\n🚀 Next Steps:');
        console.log('1. Add your Word templates (.docx) to the templates folder');
        console.log('2. Prepare templates using the generated guides in the guides folder');
        console.log('3. Start the backend server: npm start');
        console.log('4. Use the Document Generator page in the frontend');
        
        console.log('\n📖 Template Preparation:');
        console.log('- Open COMPLETE_PREPARATION_GUIDE.md in the guides folder');
        console.log('- Follow the instructions for each template');
        console.log('- Replace text with {variableName} format');
        console.log('- Add {#tableName} and {/tableName} for dynamic tables');
        
        console.log('\n🔧 API Endpoints:');
        console.log('GET  /api/documents/templates - List templates');
        console.log('GET  /api/documents/templates/:id/structure - Get template structure');
        console.log('GET  /api/documents/templates/:id/guide - Get preparation guide');
        console.log('POST /api/documents/generate - Generate document');
        
        console.log('\n✨ Features:');
        console.log('- Auto-detection of template variables');
        console.log('- Dynamic table generation');
        console.log('- Sample data loading');
        console.log('- Form validation');
        console.log('- Template preparation guides');
        console.log('- Automatic date and currency formatting');
        
        console.log('\n⚠️  Important Notes:');
        console.log('- Templates must be in .docx format');
        console.log('- Use curly braces {} for variables');
        console.log('- Test templates with sample data first');
        console.log('- Keep backups of original templates');
        
        console.log('\n📞 Need Help?');
        console.log('- Check the preparation guides in the guides folder');
        console.log('- Use the "Show Preparation Guide" button in the UI');
        console.log('- Load sample data to test templates');
        console.log('- Use the validation feature before generating');
    }

    // Main setup function
    async setup() {
        console.log('Setting up Document Generation System...\n');
        
        this.setupDirectories();
        this.analyzeTemplates();
        this.generateGuides();
        this.createSampleTemplates();
        this.displayInstructions();
        
        console.log('\n✅ Setup completed successfully!');
    }

    // Health check
    healthCheck() {
        const checks = [
            {
                name: 'Templates directory',
                check: () => fs.existsSync(this.templatesPath),
                fix: 'Run setup again or create the directory manually'
            },
            {
                name: 'Node modules',
                check: () => fs.existsSync(path.join(this.basePath, 'node_modules', 'docxtemplater')),
                fix: 'Run: npm install'
            },
            {
                name: 'Template files',
                check: () => {
                    const templates = fs.readdirSync(this.templatesPath).filter(f => f.endsWith('.docx'));
                    return templates.length > 0;
                },
                fix: 'Add .docx template files to the templates directory'
            }
        ];

        console.log('🔍 System Health Check:');
        let allPassed = true;

        checks.forEach(({ name, check, fix }) => {
            const passed = check();
            console.log(`  ${passed ? '✅' : '❌'} ${name}`);
            if (!passed) {
                console.log(`     Fix: ${fix}`);
                allPassed = false;
            }
        });

        return allPassed;
    }
}

// CLI interface
if (require.main === module) {
    const setup = new DocumentSystemSetup();
    const command = process.argv[2];

    switch (command) {
        case 'setup':
            setup.setup();
            break;
        case 'health':
        case 'check':
            const healthy = setup.healthCheck();
            process.exit(healthy ? 0 : 1);
            break;
        case 'guides':
            setup.generateGuides();
            break;
        case 'analyze':
            setup.analyzeTemplates();
            break;
        default:
            console.log('Usage:');
            console.log('  node setupDocumentSystem.js setup   - Complete setup');
            console.log('  node setupDocumentSystem.js health  - Health check');
            console.log('  node setupDocumentSystem.js guides  - Generate guides only');
            console.log('  node setupDocumentSystem.js analyze - Analyze templates');
    }
}

module.exports = DocumentSystemSetup;
