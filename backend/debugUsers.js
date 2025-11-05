require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const debugUsers = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected for user debugging.');

        // Find all faculty users
        const facultyUsers = await User.find({
            $or: [
                { 'roles.role': 'guide' },
                { 'roles.role': 'panel' },
                { 'roles.role': 'coordinator' }
            ]
        });

        console.log(`\n=== Found ${facultyUsers.length} faculty users ===\n`);

        for (const user of facultyUsers) {
            console.log(`Username: ${user.username}`);
            console.log(`Name: ${user.name}`);
            console.log(`Primary role: ${user.role || 'Not set'}`);
            console.log(`Roles array:`, user.roles);
            console.log(`Member type: ${user.memberType}`);
            console.log('---');
        }

        // Check for any users with old role structure
        const oldRoleUsers = await User.find({ role: { $exists: true } });
        if (oldRoleUsers.length > 0) {
            console.log(`\n=== Found ${oldRoleUsers.length} users with old role structure ===\n`);
            oldRoleUsers.forEach(user => {
                console.log(`${user.username}: ${user.role}`);
            });
        }

    } catch (error) {
        console.error('Error during user debugging:', error);
    } finally {
        mongoose.disconnect();
        console.log('\nMongoDB disconnected.');
    }
};

debugUsers();
