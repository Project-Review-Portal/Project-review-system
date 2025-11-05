require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const updateFacultyRoles = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for faculty role update.');

    // Find all users with 'guide' role
    const guideUsers = await User.find({ 'roles.role': 'guide' });
    console.log(`Found ${guideUsers.length} users with guide role`);

    // Update each guide user to have multiple roles
    for (const user of guideUsers) {
      // Check if user already has multiple roles
      const hasMultipleRoles = user.roles.length > 1;
      
      if (!hasMultipleRoles) {
        // Add panel and coordinator roles if they don't exist
        const existingRoles = user.roles.map(r => r.role);
        
        if (!existingRoles.includes('panel')) {
          user.roles.push({
            role: 'panel',
            team: null
          });
        }
        
        if (!existingRoles.includes('coordinator')) {
          user.roles.push({
            role: 'coordinator',
            team: null
          });
        }

        // Set memberType to 'internal' for panel members
        if (!user.memberType) {
          user.memberType = 'internal';
        }

        await user.save();
        console.log(`Updated ${user.username} (${user.name}) with roles: ${user.roles.map(r => r.role).join(', ')}`);
      } else {
        console.log(`User ${user.username} already has multiple roles: ${user.roles.map(r => r.role).join(', ')}`);
      }
    }

    // Also find users that might have been created with the old 'role' field
    const oldRoleUsers = await User.find({ role: { $exists: true } });
    console.log(`Found ${oldRoleUsers.length} users with old 'role' field`);

    for (const user of oldRoleUsers) {
      if (user.role === 'guide') {
        // Convert old role structure to new roles array
        user.roles = [
          { role: 'guide', team: null },
          { role: 'panel', team: null },
          { role: 'coordinator', team: null }
        ];
        user.memberType = 'internal';
        
        // Remove the old role field
        user.role = undefined;
        
        await user.save();
        console.log(`Converted ${user.username} from old structure to new roles: ${user.roles.map(r => r.role).join(', ')}`);
      }
    }

    console.log('Faculty role update completed successfully.');
  } catch (error) {
    console.error('Error during faculty role update:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

updateFacultyRoles();
