require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

const testUserRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the faculty1 user
    const user = await User.findOne({ username: 'faculty1' });
    if (!user) {
      console.log('User faculty1 not found');
      return;
    }

    console.log('User found:', user.username);
    console.log('User roles:', user.roles);
    console.log('User memberType:', user.memberType);

    // Create a JWT token with panel role
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';
    
    // Find the panel role
    const panelRole = user.roles.find(r => r.role === 'panel');
    if (panelRole) {
      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          role: 'panel', // Force panel role
          team: panelRole.team || null
        },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      console.log('\nCreated JWT token with panel role:');
      console.log('Token:', token.substring(0, 50) + '...');
      
      // Decode token to verify
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('Decoded token:', decoded);
    } else {
      console.log('No panel role found for user');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

testUserRoles(); 