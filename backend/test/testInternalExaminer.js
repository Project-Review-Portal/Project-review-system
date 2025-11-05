const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test script for Internal Examiner document generation
class InternalExaminerTest {
    constructor() {
        this.baseURL = 'http://localhost:5000/api/internal-examiner';
        this.token = null; // In real app, you'd need authentication
    }

    async testTemplateStatus() {
        try {
            console.log('🔍 Testing template status...');
            const response = await axios.get(`${this.baseURL}/status`);
            console.log('Status:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error testing status:', error.response?.data || error.message);
            return null;
        }
    }

    async testSampleData() {
        try {
            console.log('📝 Testing sample data generation...');
            const response = await axios.get(`${this.baseURL}/sample-data`);
            console.log('Sample data generated successfully');
            return response.data.sampleData;
        } catch (error) {
            console.error('Error generating sample data:', error.response?.data || error.message);
            return null;
        }
    }

    async testDocumentGeneration(sampleData) {
        try {
            console.log('📄 Testing document generation...');
            const response = await axios.post(`${this.baseURL}/generate`, {
                data: sampleData
            }, {
                responseType: 'arraybuffer'
            });

            // Save the generated document
            const outputPath = path.join(__dirname, 'test_output.docx');
            fs.writeFileSync(outputPath, response.data);
            console.log(`✅ Document generated successfully: ${outputPath}`);
            return true;
        } catch (error) {
            console.error('❌ Error generating document:', error.response?.data || error.message);
            return false;
        }
    }

    async runTests() {
        console.log('🚀 Starting Internal Examiner Document Tests\n');

        // Test 1: Check template status
        const status = await this.testTemplateStatus();
        console.log('\n' + '='.repeat(50));

        // Test 2: Get sample data
        const sampleData = await this.testSampleData();
        console.log('\n' + '='.repeat(50));

        // Test 3: Generate document (only if we have sample data)
        if (sampleData) {
            const generated = await this.testDocumentGeneration(sampleData);
            console.log('\n' + '='.repeat(50));
            
            if (generated) {
                console.log('\n🎉 All tests passed! The Internal Examiner document system is working.');
            } else {
                console.log('\n⚠️ Document generation failed. Check template preparation.');
            }
        } else {
            console.log('\n⚠️ Cannot test document generation without sample data.');
        }

        // Summary
        console.log('\n📋 SUMMARY:');
        console.log(`Template Status: ${status ? status.status : 'Error'}`);
        console.log(`Sample Data: ${sampleData ? 'OK' : 'Error'}`);
        console.log(`Document Generation: ${sampleData ? 'Tested' : 'Skipped'}`);

        if (status?.status === 'needs_preparation') {
            console.log('\n📖 NEXT STEPS:');
            console.log('1. Open the template file in Microsoft Word');
            console.log('2. Replace placeholders with template variables (see preparation guide)');
            console.log('3. Save the template');
            console.log('4. Run tests again');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new InternalExaminerTest();
    tester.runTests();
}

module.exports = InternalExaminerTest;
