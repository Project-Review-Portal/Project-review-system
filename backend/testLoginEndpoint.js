const axios = require('axios');

const testLoginEndpoint = async () => {
  try {
    console.log('Testing login endpoint...');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'faculty1',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Response:', response.data);
    console.log('Token:', response.data.token.substring(0, 20) + '...');
    
  } catch (error) {
    console.error('Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
  }
};

testLoginEndpoint(); 