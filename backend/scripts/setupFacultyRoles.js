require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const setupFacultyRoles = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for faculty role setup.');

    // Step 1: Update existing faculty users with guide role to have multiple roles
    console.log('\n=== Step 1: Updating existing faculty users ===');
    const existingGuideUsers = await User.find({ 'roles.role': 'guide' });
    console.log(`Found ${existingGuideUsers.length} existing users with guide role`);

    for (const user of existingGuideUsers) {
      const existingRoles = user.roles.map(r => r.role);
      let updated = false;

      // Add panel role if missing
      if (!existingRoles.includes('panel')) {
        user.roles.push({ role: 'panel', team: null });
        updated = true;
      }

      // Add coordinator role if missing
      if (!existingRoles.includes('coordinator')) {
        user.roles.push({ role: 'coordinator', team: null });
        updated = true;
      }

      // Set memberType to internal for panel members
      if (!user.memberType) {
        user.memberType = 'internal';
        updated = true;
      }

      if (updated) {
        await user.save();
        console.log(`✓ Updated ${user.username} (${user.name}) with roles: ${user.roles.map(r => r.role).join(', ')}`);
      } else {
        console.log(`- ${user.username} already has all required roles: ${user.roles.map(r => r.role).join(', ')}`);
      }
    }

    // Step 2: Handle users with old 'role' field structure
    console.log('\n=== Step 2: Converting old role structure ===');
    const oldRoleUsers = await User.find({ role: { $exists: true } });
    console.log(`Found ${oldRoleUsers.length} users with old 'role' field`);

    for (const user of oldRoleUsers) {
      if (user.role === 'guide') {
        // Convert to new structure
        user.roles = [
          { role: 'guide', team: null },
          { role: 'panel', team: null },
          { role: 'coordinator', team: null }
        ];
        user.memberType = 'internal';
        user.role = undefined; // Remove old field
        
        await user.save();
        console.log(`✓ Converted ${user.username} from old structure to new roles: ${user.roles.map(r => r.role).join(', ')}`);
      }
    }

    // Step 3: Create new faculty users if they don't exist
    console.log('\n=== Step 3: Creating new faculty users ===');
    const facultyData = [
      { facultyId: 'FAC001', name: 'Dr. Test Faculty One' },
      { facultyId: 'FAC002', name: 'Dr. Test Faculty Two' },
      { facultyId: 'FAC003', name: 'Dr. Test Faculty Three' }
    ];

    for (const faculty of facultyData) {
      const username = faculty.facultyId.toLowerCase();
      const name = faculty.name;
      
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        console.log(`- Faculty user ${username} already exists`);
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
        console.log(`✓ Created faculty user: ${username} (${name}) with roles: guide, panel, coordinator`);
      }
    }

    // Step 4: Final verification
    console.log('\n=== Step 4: Final verification ===');
    const allFacultyUsers = await User.find({
      $or: [
        { 'roles.role': 'guide' },
        { 'roles.role': 'panel' },
        { 'roles.role': 'coordinator' }
      ]
    });

    console.log(`\nTotal faculty users found: ${allFacultyUsers.length}`);
    
    for (const user of allFacultyUsers) {
      const roles = user.roles.map(r => r.role);
      const hasAllRoles = roles.includes('guide') && roles.includes('panel') && roles.includes('coordinator');
      const status = hasAllRoles ? '✓' : '✗';
      console.log(`${status} ${user.username} (${user.name}): ${roles.join(', ')}`);
    }

    console.log('\n=== Faculty role setup completed successfully! ===');
    console.log('\nDefault passwords for new faculty users: faculty123');
    console.log('Faculty users can now access:');
    console.log('- Guide Dashboard (for team management and marking)');
    console.log('- Panel Dashboard (for review assignments)');
    console.log('- Coordinator Dashboard (for schedule management)');

  } catch (error) {
    console.error('Error during faculty role setup:', error);
  } finally {
    mongoose.disconnect();
    console.log('\nMongoDB disconnected.');
  }
};

setupFacultyRoles();
