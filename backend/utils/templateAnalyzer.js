const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

class TemplateAnalyzer {
    constructor() {
        this.templatesPath = path.join(__dirname, '..', 'uploads', 'templates');
    }

    // Analyze a template to find potential variable locations
    analyzeTemplate(templateFilename) {
        try {
            const templatePath = path.join(this.templatesPath, templateFilename);
            
            if (!fs.existsSync(templatePath)) {
                console.log(`Template not found: ${templateFilename}`);
                return;
            }

            // Read the template
            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            
            // Extract document.xml to analyze content
            const documentXml = zip.files['word/document.xml'].asText();
            
            console.log(`\n=== Analysis of ${templateFilename} ===`);
            
            // Find existing template variables
            const existingVariables = this.findExistingVariables(documentXml);
            if (existingVariables.length > 0) {
                console.log('\nExisting template variables found:');
                existingVariables.forEach(variable => {
                    console.log(`  - {${variable}}`);
                });
            } else {
                console.log('\nNo existing template variables found.');
            }

            // Find potential variable locations (common patterns)
            const potentialVariables = this.findPotentialVariables(documentXml);
            if (potentialVariables.length > 0) {
                console.log('\nPotential variable locations found:');
                potentialVariables.forEach(item => {
                    console.log(`  - "${item.text}" could be: {${item.suggested}}`);
                });
            }

            // Analyze tables
            this.analyzeTables(documentXml);
            
        } catch (error) {
            console.error(`Error analyzing template ${templateFilename}:`, error.message);
        }
    }

    findExistingVariables(documentXml) {
        const variablePattern = /\{([^}]+)\}/g;
        const variables = [];
        let match;
        
        while ((match = variablePattern.exec(documentXml)) !== null) {
            const variable = match[1];
            if (!variables.includes(variable)) {
                variables.push(variable);
            }
        }
        
        return variables;
    }

    findPotentialVariables(documentXml) {
        const potentialPatterns = [
            // Date patterns
            { pattern: /Date[:\s]*_+|Date[:\s]*\.\.\.|__\/__\/____|DD\/MM\/YYYY/gi, suggested: 'date' },
            // Name patterns
            { pattern: /Name[:\s]*_+|Name[:\s]*\.\.\.|Examiner[:\s]*_+/gi, suggested: 'examinerName' },
            { pattern: /Student[:\s]*_+|Student[:\s]*\.\.\./gi, suggested: 'studentName' },
            { pattern: /Supervisor[:\s]*_+|Guide[:\s]*_+/gi, suggested: 'supervisorName' },
            { pattern: /Chairman[:\s]*_+/gi, suggested: 'chairmanName' },
            // Designation patterns
            { pattern: /Designation[:\s]*_+|Designation[:\s]*\.\.\./gi, suggested: 'designation' },
            // Department patterns
            { pattern: /Department[:\s]*_+|Department[:\s]*\.\.\./gi, suggested: 'department' },
            // Organization patterns
            { pattern: /Organization[:\s]*_+|Institution[:\s]*_+|College[:\s]*_+/gi, suggested: 'organization' },
            // Time patterns
            { pattern: /Time[:\s]*_+|Time[:\s]*\.\.\./gi, suggested: 'examTime' },
            // Venue patterns
            { pattern: /Venue[:\s]*_+|Venue[:\s]*\.\.\./gi, suggested: 'venue' },
            // Roll number patterns
            { pattern: /Roll[:\s]*No[:\s]*_+|Roll[:\s]*Number[:\s]*_+/gi, suggested: 'rollNumber' },
            // Course patterns
            { pattern: /Course[:\s]*_+|Course[:\s]*\.\.\./gi, suggested: 'course' },
            // Semester patterns
            { pattern: /Semester[:\s]*_+|Sem[:\s]*_+/gi, suggested: 'semester' },
            // Subject patterns
            { pattern: /Subject[:\s]*_+|Subject[:\s]*\.\.\./gi, suggested: 'subject' },
            // Project patterns
            { pattern: /Project[:\s]*Title[:\s]*_+|Title[:\s]*_+/gi, suggested: 'projectTitle' },
            // Address patterns
            { pattern: /Address[:\s]*_+|Address[:\s]*\.\.\./gi, suggested: 'address' },
            // Phone patterns
            { pattern: /Phone[:\s]*_+|Mobile[:\s]*_+|Contact[:\s]*_+/gi, suggested: 'phone' },
            // Email patterns
            { pattern: /Email[:\s]*_+|E-mail[:\s]*_+/gi, suggested: 'email' },
        ];

        const found = [];
        const plainText = this.extractPlainText(documentXml);

        potentialPatterns.forEach(({ pattern, suggested }) => {
            let match;
            while ((match = pattern.exec(plainText)) !== null) {
                found.push({
                    text: match[0].trim(),
                    suggested: suggested
                });
            }
        });

        return found;
    }

    analyzeTables(documentXml) {
        // Look for table structures
        const tablePattern = /<w:tbl[^>]*>[\s\S]*?<\/w:tbl>/g;
        const tables = documentXml.match(tablePattern);
        
        if (tables && tables.length > 0) {
            console.log(`\nFound ${tables.length} table(s) in the document.`);
            console.log('Consider using table loops for dynamic content:');
            console.log('  Example: {#students} ... {/students}');
            console.log('  Common table types: students, examiners, supervisedStudents');
        }
    }

    extractPlainText(documentXml) {
        // Remove XML tags to get plain text
        return documentXml
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Analyze all templates
    analyzeAllTemplates() {
        try {
            const templates = fs.readdirSync(this.templatesPath)
                .filter(file => file.endsWith('.docx'));

            console.log(`Found ${templates.length} Word templates to analyze:`);
            templates.forEach(template => {
                this.analyzeTemplate(template);
            });

            console.log('\n=== Summary ===');
            console.log('To prepare your templates:');
            console.log('1. Replace underscores and dots with template variables like {variableName}');
            console.log('2. For tables, wrap repeating rows with {#tableName} and {/tableName}');
            console.log('3. Test each template after modification');
            console.log('4. Refer to TEMPLATE_PREPARATION_GUIDE.md for detailed instructions');

        } catch (error) {
            console.error('Error analyzing templates:', error.message);
        }
    }
}

// CLI usage
if (require.main === module) {
    const analyzer = new TemplateAnalyzer();
    
    const templateName = process.argv[2];
    if (templateName) {
        analyzer.analyzeTemplate(templateName);
    } else {
        analyzer.analyzeAllTemplates();
    }
}

module.exports = TemplateAnalyzer;
