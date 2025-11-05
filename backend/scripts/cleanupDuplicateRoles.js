require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const cleanupDuplicateRoles = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for role cleanup.');

    // Find all users with roles
    const allUsers = await User.find({ roles: { $exists: true, $ne: [] } });
    console.log(`Found ${allUsers.length} users with roles`);

    let cleanedCount = 0;

    for (const user of allUsers) {
      const originalRoles = [...user.roles];
      let needsUpdate = false;

      // Remove duplicate roles
      const uniqueRoles = [];
      const seenRoles = new Set();

      for (const roleObj of user.roles) {
        if (!seenRoles.has(roleObj.role)) {
          seenRoles.add(roleObj.role);
          uniqueRoles.push(roleObj);
        } else {
          needsUpdate = true;
        }
      }

      // For faculty users (guide, panel, coordinator), ensure they have all three roles
      if (uniqueRoles.some(r => r.role === 'guide') || 
          uniqueRoles.some(r => r.role === 'panel') || 
          uniqueRoles.some(r => r.role === 'coordinator')) {
        
        const hasGuide = uniqueRoles.some(r => r.role === 'guide');
        const hasPanel = uniqueRoles.some(r => r.role === 'panel');
        const hasCoordinator = uniqueRoles.some(r => r.role === 'coordinator');

        if (!hasGuide) {
          uniqueRoles.push({ role: 'guide', team: null });
          needsUpdate = true;
        }
        if (!hasPanel) {
          uniqueRoles.push({ role: 'panel', team: null });
          needsUpdate = true;
        }
        if (!hasCoordinator) {
          uniqueRoles.push({ role: 'coordinator', team: null });
          needsUpdate = true;
        }

        // Set memberType to internal for panel members
        if (!user.memberType) {
          user.memberType = 'internal';
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        user.roles = uniqueRoles;
        await user.save();
        cleanedCount++;
        
        const beforeRoles = originalRoles.map(r => r.role).join(', ');
        const afterRoles = uniqueRoles.map(r => r.role).join(', ');
        console.log(`✓ Cleaned ${user.username}: ${beforeRoles} → ${afterRoles}`);
      }
    }

    console.log(`\nCleaned up ${cleanedCount} users with duplicate roles.`);

    // Final verification
    console.log('\n=== Final verification ===');
    const facultyUsers = await User.find({
      $or: [
        { 'roles.role': 'guide' },
        { 'roles.role': 'panel' },
        { 'roles.role': 'coordinator' }
      ]
    });

    console.log(`\nTotal faculty users: ${facultyUsers.length}`);
    
    for (const user of facultyUsers) {
      const roles = user.roles.map(r => r.role).sort();
      const hasAllRoles = roles.includes('guide') && roles.includes('panel') && roles.includes('coordinator');
      const status = hasAllRoles ? '✓' : '✗';
      console.log(`${status} ${user.username} (${user.name}): ${roles.join(', ')}`);
    }

    console.log('\n=== Role cleanup completed successfully! ===');

  } catch (error) {
    console.error('Error during role cleanup:', error);
  } finally {
    mongoose.disconnect();
    console.log('\nMongoDB disconnected.');
  }
};

cleanupDuplicateRoles();
