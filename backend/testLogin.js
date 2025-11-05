require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const testLogin = async () => {
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

    // Test password verification
    const testPasswords = ['faculty123', 'password123', 'admin123', 'panel123', 'guide123'];
    
    for (const password of testPasswords) {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`Password "${password}": ${isMatch ? 'MATCH' : 'NO MATCH'}`);
    }

    // Reset password to a simple one
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    user.password = hashedPassword;
    await user.save();
    console.log('\nPassword reset to: password123');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

testLogin(); 