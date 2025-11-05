require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const findAllUsers = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected for finding all users.');

        // Get ALL users
        const allUsers = await User.find({});
        console.log(`\n=== All Users in Database ===`);
        console.log(`Total users: ${allUsers.length}`);

        // Group by role structure
        const usersWithRolesArray = allUsers.filter(u => u.roles && Array.isArray(u.roles));
        const usersWithOldRole = allUsers.filter(u => u.role && !u.roles);
        const usersWithBoth = allUsers.filter(u => u.role && u.roles);

        console.log(`\n=== Role Structure Breakdown ===`);
        console.log(`Users with roles array only: ${usersWithRolesArray.length}`);
        console.log(`Users with old role field only: ${usersWithOldRole.length}`);
        console.log(`Users with both: ${usersWithBoth.length}`);

        // Show faculty users with roles array
        console.log(`\n=== Faculty Users with Roles Array ===`);
        const facultyWithRoles = usersWithRolesArray.filter(u => 
            u.roles.some(r => ['guide', 'panel', 'coordinator'].includes(r.role))
        );
        
        console.log(`Faculty with roles array: ${facultyWithRoles.length}`);
        facultyWithRoles.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name || user.username} (${user.username})`);
            console.log(`   Roles: ${user.roles.map(r => r.role).join(', ')}`);
            console.log(`   Member Type: ${user.memberType || 'Not set'}`);
        });

        // Show users with old role field
        console.log(`\n=== Users with Old Role Field ===`);
        const oldRoleFaculty = usersWithOldRole.filter(u => 
            ['guide', 'panel', 'coordinator'].includes(u.role)
        );
        
        console.log(`Faculty with old role field: ${oldRoleFaculty.length}`);
        oldRoleFaculty.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name || user.username} (${user.username})`);
            console.log(`   Old Role: ${user.role}`);
        });

    } catch (error) {
        console.error('Error finding all users:', error);
    } finally {
        mongoose.disconnect();
        console.log('\nMongoDB disconnected.');
    }
};

findAllUsers();

