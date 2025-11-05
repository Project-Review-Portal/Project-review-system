require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const testAdminFaculty = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected for testing admin faculty endpoint.');

        // Test the same query that getAllFaculty uses
        const faculty = await User.find({
            'roles.role': { $in: ['guide', 'panel', 'coordinator'] }
        }).select('username name roles memberType');

        console.log(`\n=== Admin Faculty Endpoint Test ===`);
        console.log(`Total faculty found: ${faculty.length}`);
        
        faculty.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.name} (${user.username})`);
            console.log(`   Roles: ${user.roles.map(r => r.role).join(', ')}`);
            console.log(`   Member Type: ${user.memberType || 'Not set'}`);
        });

        // Check how many have panel role
        const panelFaculty = faculty.filter(f => f.roles.some(r => r.role === 'panel'));
        console.log(`\n=== Panel Role Faculty ===`);
        console.log(`Faculty with panel role: ${panelFaculty.length}`);
        panelFaculty.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.username}) - ${user.memberType || 'No member type'}`);
        });

    } catch (error) {
        console.error('Error testing admin faculty:', error);
    } finally {
        mongoose.disconnect();
        console.log('\nMongoDB disconnected.');
    }
};

testAdminFaculty();
