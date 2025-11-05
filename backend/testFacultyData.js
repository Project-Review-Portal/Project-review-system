require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const testFacultyData = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected for testing faculty data.');

        // Test the exact query from getAllFaculty
        const faculty = await User.find({
            'roles.role': { $in: ['guide', 'panel', 'coordinator'] }
        }).select('username name roles memberType');

        console.log(`\n=== Faculty Data Test ===`);
        console.log(`Total faculty found: ${faculty.length}`);
        
        if (faculty.length === 0) {
            console.log('❌ No faculty found! This is the problem.');
        } else {
            console.log('✅ Faculty found. Showing first 3:');
            faculty.slice(0, 3).forEach((user, index) => {
                console.log(`\n${index + 1}. ${user.name} (${user.username})`);
                console.log(`   Roles: ${user.roles.map(r => r.role).join(', ')}`);
                console.log(`   Member Type: ${user.memberType || 'Not set'}`);
            });
        }

        // Check if there are any users at all
        const totalUsers = await User.countDocuments();
        console.log(`\nTotal users in database: ${totalUsers}`);

        // Check users with different role structures
        const usersWithRolesArray = await User.countDocuments({ roles: { $exists: true } });
        const usersWithOldRole = await User.countDocuments({ role: { $exists: true } });
        
        console.log(`Users with roles array: ${usersWithRolesArray}`);
        console.log(`Users with old role field: ${usersWithOldRole}`);

    } catch (error) {
        console.error('Error testing faculty data:', error);
    } finally {
        mongoose.disconnect();
        console.log('\nMongoDB disconnected.');
    }
};

testFacultyData();
