require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin already exists, updating password...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('cseceg2024@admin', salt);
      existingAdmin.password = hashedPassword;
      existingAdmin.username = 'admin@admin.com';
      await existingAdmin.save();
      console.log('Admin password updated');
    } else {
      // Create new admin
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('cseceg2024@admin', salt);
      
      await User.create({
        username: 'admin@admin.com',
        email: 'admin@admin.com',
        password: hashedPassword,
        role: 'admin',
        name: 'Administrator'
      });
      console.log('New admin user created');
    }

    console.log('\nAdmin Credentials:');
    console.log('Email/Username: admin@admin.com');
    console.log('Password: cseceg2024@admin');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

createAdmin();