require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const debugFacultyDiscrepancy = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected for debugging faculty discrepancy.');

        // Test the EXACT query from getAllFaculty
        console.log('\n=== Testing getAllFaculty Query ===');
        const faculty = await User.find({
            'roles.role': { $in: ['guide', 'panel', 'coordinator'] }
        }).select('username name roles memberType');
        
        console.log(`Total faculty found: ${faculty.length}`);
        console.log('First 5 faculty members:');
        faculty.slice(0, 5).forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.username})`);
            console.log(`   Roles: ${user.roles.map(r => r.role).join(', ')}`);
        });

        // Check if there are users with different role structures
        console.log('\n=== Checking Different Role Structures ===');
        
        // Check users with roles array
        const usersWithRolesArray = await User.find({ roles: { $exists: true } });
        console.log(`Users with roles array: ${usersWithRolesArray.length}`);
        
        // Check users with old role field
        const usersWithOldRole = await User.find({ role: { $exists: true } });
        console.log(`Users with old role field: ${usersWithOldRole.length}`);
        
        // Check if there are multiple collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\n=== Available Collections ===');
        collections.forEach(col => {
            console.log(`- ${col.name}`);
        });

        // Check if there are users with different database names
        const allUsers = await User.find({});
        console.log(`\n=== All Users in User Collection ===`);
        console.log(`Total users: ${allUsers.length}`);
        
        // Check for duplicate usernames
        const usernames = allUsers.map(u => u.username);
        const uniqueUsernames = [...new Set(usernames)];
        console.log(`Unique usernames: ${uniqueUsernames.length}`);
        
        if (usernames.length !== uniqueUsernames.length) {
            console.log('⚠️  DUPLICATE USERNAMES FOUND!');
            const duplicates = usernames.filter((item, index) => usernames.indexOf(item) !== index);
            console.log('Duplicate usernames:', duplicates);
        }

    } catch (error) {
        console.error('Error debugging faculty discrepancy:', error);
    } finally {
        mongoose.disconnect();
        console.log('\nMongoDB disconnected.');
    }
};

debugFacultyDiscrepancy();

