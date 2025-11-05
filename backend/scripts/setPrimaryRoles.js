require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const setPrimaryRoles = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for setting primary roles.');

    // Find all users with roles array
    const usersWithRoles = await User.find({ roles: { $exists: true, $ne: [] } });
    console.log(`Found ${usersWithRoles.length} users with roles array`);

    let updatedCount = 0;

    for (const user of usersWithRoles) {
      if (user.roles && user.roles.length > 0) {
        const firstRole = user.roles[0].role;
        
        // Only update if the primary role is not set or is different
        if (!user.role || user.role !== firstRole) {
          user.role = firstRole;
          await user.save();
          updatedCount++;
          console.log(`✓ Updated ${user.username}: set primary role to ${firstRole}`);
        } else {
          console.log(`- ${user.username}: primary role already set to ${firstRole}`);
        }
      }
    }

    console.log(`\nUpdated ${updatedCount} users with primary roles.`);

    // Final verification
    console.log('\n=== Final verification ===');
    const allUsers = await User.find({});
    console.log(`Total users: ${allUsers.length}`);
    
    for (const user of allUsers) {
      const primaryRole = user.role || 'Not set';
      const rolesCount = user.roles?.length || 0;
      console.log(`${user.username}: primary=${primaryRole}, roles=${rolesCount}`);
    }

    console.log('\n=== Primary role setup completed successfully! ===');

  } catch (error) {
    console.error('Error during primary role setup:', error);
  } finally {
    mongoose.disconnect();
    console.log('\nMongoDB disconnected.');
  }
};

setPrimaryRoles();
