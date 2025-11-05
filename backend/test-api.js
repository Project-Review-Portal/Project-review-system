const axios = require('axios');

async function testAPI() {
    try {
        console.log('Testing backend API...');
        
        // Test config endpoint (no auth required)
        console.log('\n1. Testing config endpoint...');
        const configResponse = await axios.get('http://localhost:5000/api/teams/config/public');
        console.log('Config response:', configResponse.data);
        
        // Test available students endpoint (requires auth)
        console.log('\n2. Testing available students endpoint...');
        try {
            const studentsResponse = await axios.get('http://localhost:5000/api/teams/available-students', {
                headers: { Authorization: 'Bearer test-token' }
            });
            console.log('Students response:', studentsResponse.data);
        } catch (error) {
            console.log('Students endpoint error (expected):', error.response?.data || error.message);
        }
        
        console.log('\nAPI test completed.');
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testAPI(); 