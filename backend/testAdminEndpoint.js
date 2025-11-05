const axios = require('axios');

const testAdminEndpoint = async () => {
    try {
        console.log('Testing admin faculty endpoint...');
        
        // First, let's try without authentication to see the error
        console.log('\n1. Testing without authentication:');
        try {
            const response = await axios.get('http://localhost:5000/api/admin/faculty-list');
            console.log('✅ Success without auth:', response.data);
        } catch (error) {
            console.log('❌ Expected error without auth:', error.response?.data?.message || error.message);
        }

        // Now let's test the auth endpoint to get a token
        console.log('\n2. Testing authentication endpoint:');
        try {
            const authResponse = await axios.post('http://localhost:5000/api/auth/login', {
                username: 'admin1',
                password: 'admin123'
            });
            console.log('✅ Auth successful, token received');
            
            // Test admin endpoint with token
            console.log('\n3. Testing admin endpoint with token:');
            const token = authResponse.data.token;
            const adminResponse = await axios.get('http://localhost:5000/api/admin/faculty-list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('✅ Admin endpoint successful!');
            console.log(`Total faculty found: ${adminResponse.data.length}`);
            console.log('First 3 faculty members:');
            adminResponse.data.slice(0, 3).forEach((user, index) => {
                console.log(`${index + 1}. ${user.name} (${user.username}) - Roles: ${user.roles.map(r => r.role).join(', ')}`);
            });
            
        } catch (error) {
            console.log('❌ Auth or admin endpoint failed:', error.response?.data?.message || error.message);
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
};

testAdminEndpoint();

