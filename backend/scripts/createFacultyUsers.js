require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createFacultyUsers = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for faculty user creation.');

    // Faculty data from the CSV
    const facultyData = [
      { facultyId: 'FAC001', name: 'Dr. Test Faculty One' },
      { facultyId: 'FAC002', name: 'Dr. Test Faculty Two' },
      { facultyId: 'FAC003', name: 'Dr. Test Faculty Three' }
    ];

    console.log(`Processing ${facultyData.length} faculty records`);

    for (const faculty of facultyData) {
      const username = faculty.facultyId.toLowerCase();
      const name = faculty.name;
      
      // Check if user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        console.log(`Faculty user ${username} already exists, updating roles...`);
        
        // Update existing user to have multiple roles
        const existingRoles = existingUser.roles.map(r => r.role);
        
        if (!existingRoles.includes('guide')) {
          existingUser.roles.push({ role: 'guide', team: null });
        }
        if (!existingRoles.includes('panel')) {
          existingUser.roles.push({ role: 'panel', team: null });
        }
        if (!existingRoles.includes('coordinator')) {
          existingUser.roles.push({ role: 'coordinator', team: null });
        }
        
        existingUser.memberType = 'internal';
        await existingUser.save();
        
        console.log(`Updated ${username} with roles: ${existingUser.roles.map(r => r.role).join(', ')}`);
      } else {
        // Create new faculty user with multiple roles
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('faculty123', salt);

        const newFaculty = new User({
          username,
          name,
          password: hashedPassword,
          roles: [
            { role: 'guide', team: null },
            { role: 'panel', team: null },
            { role: 'coordinator', team: null }
          ],
          memberType: 'internal'
        });

        await newFaculty.save();
        console.log(`Created faculty user: ${username} (${name}) with roles: guide, panel, coordinator`);
      }
    }

    console.log('Faculty user creation/update completed successfully.');
  } catch (error) {
    console.error('Error during faculty user creation:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

createFacultyUsers();
