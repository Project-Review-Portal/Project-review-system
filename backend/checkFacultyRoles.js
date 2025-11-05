require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const checkFacultyRoles = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected for checking faculty roles.');

        // Get all faculty users
        const faculty = await User.find({
            'roles.role': { $in: ['guide', 'panel', 'coordinator'] }
        }).select('username name roles memberType');

        console.log(`\n=== Faculty Roles Check ===`);
        console.log(`Total faculty found: ${faculty.length}`);
        
        // Check how many have each role
        const guideCount = faculty.filter(f => f.roles.some(r => r.role === 'guide')).length;
        const panelCount = faculty.filter(f => f.roles.some(r => r.role === 'panel')).length;
        const coordinatorCount = faculty.filter(f => f.roles.some(r => r.role === 'coordinator')).length;
        
        console.log(`\nRole counts:`);
        console.log(`- Guide: ${guideCount}`);
        console.log(`- Panel: ${panelCount}`);
        console.log(`- Coordinator: ${coordinatorCount}`);
        
        // Show detailed breakdown
        console.log(`\n=== Detailed Faculty List ===`);
        faculty.forEach((user, index) => {
            const roles = user.roles.map(r => r.role);
            console.log(`${index + 1}. ${user.name} (${user.username})`);
            console.log(`   Roles: ${roles.join(', ')}`);
            console.log(`   Member Type: ${user.memberType || 'Not set'}`);
        });

        // Check if there are users with old role structure
        const oldRoleUsers = await User.find({ role: { $exists: true } });
        console.log(`\nUsers with old 'role' field: ${oldRoleUsers.length}`);

    } catch (error) {
        console.error('Error checking faculty roles:', error);
    } finally {
        mongoose.disconnect();
        console.log('\nMongoDB disconnected.');
    }
};

checkFacultyRoles();

