const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// The inspect module can be required like this:
const InspectModule = require("docxtemplater/js/inspect-module");

const templatesPath = path.join(__dirname, '..', 'uploads', 'templates');
const templateFiles = fs.readdirSync(templatesPath).filter(f => f.endsWith('.docx') && !f.startsWith('~'));

const allTags = {};

templateFiles.forEach(file => {
    try {
        console.log(`Analyzing ${file}...`);
        const filePath = path.join(templatesPath, file);
        const content = fs.readFileSync(filePath); // Read as buffer
        const zip = new PizZip(content);
        
        const iModule = InspectModule();
        const doc = new Docxtemplater(zip, { modules: [iModule] });
        
        const tags = iModule.getAllTags();
        const templateId = path.basename(file, '.docx');
        allTags[templateId] = tags;
    } catch (e) {
        console.error(`Error analyzing ${file}:`, e);
    }
});

console.log('--- Analysis Complete ---');
console.log(JSON.stringify(allTags, null, 2));
