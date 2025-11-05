const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// Simple script to create a test template
function createTestTemplate() {
    const templatePath = path.join(__dirname, '..', 'uploads', 'templates', 'test-template.docx');
    
    // For now, let's create a simple document structure
    // This is a minimal example - you'll need to prepare your actual templates manually
    
    console.log('To create a proper test template:');
    console.log('1. Open Microsoft Word');
    console.log('2. Create a new document with this content:');
    console.log('');
    console.log('VIVA EXAMINATION CLAIM FORM');
    console.log('');
    console.log('Date: {date}');
    console.log('Examiner Name: {examinerName}');
    console.log('Designation: {designation}');
    console.log('Department: {department}');
    console.log('College: {college}');
    console.log('');
    console.log('Examination Details:');
    console.log('Date of Exam: {examDate}');
    console.log('Time: {examTime}');
    console.log('Venue: {venue}');
    console.log('');
    console.log('Student Details:');
    console.log('Student Name: {studentName}');
    console.log('Roll Number: {rollNumber}');
    console.log('Course: {course}');
    console.log('Semester: {semester}');
    console.log('Subject: {subject}');
    console.log('Project Title: {projectTitle}');
    console.log('');
    console.log('3. Save as "test-template.docx" in the templates folder');
    console.log('4. Test the system with this simple template first');
}

if (require.main === module) {
    createTestTemplate();
}

module.exports = { createTestTemplate };
