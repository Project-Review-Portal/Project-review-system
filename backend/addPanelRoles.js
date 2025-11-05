require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const addPanelRoles = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected for adding panel roles.');

        // Find all faculty users (those with guide role)
        const facultyUsers = await User.find({
            'roles.role': 'guide'
        });

        console.log(`Found ${facultyUsers.length} faculty users to update`);

        let updatedCount = 0;

        for (const user of facultyUsers) {
            const currentRoles = user.roles.map(r => r.role);
            let needsUpdate = false;

            // Add panel role if missing
            if (!currentRoles.includes('panel')) {
                user.roles.push({ role: 'panel', team: null });
                needsUpdate = true;
                console.log(`Adding panel role to ${user.username}`);
            }

            // Add coordinator role if missing
            if (!currentRoles.includes('coordinator')) {
                user.roles.push({ role: 'coordinator', team: null });
                needsUpdate = true;
                console.log(`Adding coordinator role to ${user.username}`);
            }

            // Set memberType if missing
            if (!user.memberType) {
                user.memberType = 'internal';
                needsUpdate = true;
            }

            if (needsUpdate) {
                await user.save();
                updatedCount++;
                console.log(`✅ Updated ${user.username}: ${user.roles.map(r => r.role).join(', ')}`);
            } else {
                console.log(`- ${user.username}: already has all roles`);
            }
        }

        console.log(`\n🎉 Successfully updated ${updatedCount} faculty users!`);

        // Verify the results
        const allFaculty = await User.find({
            'roles.role': { $in: ['guide', 'panel', 'coordinator'] }
        }).select('username name roles memberType');

        console.log(`\n=== Final Faculty Count ===`);
        console.log(`Total faculty with all roles: ${allFaculty.length}`);

        // Count by role
        const guideCount = allFaculty.filter(f => f.roles.some(r => r.role === 'guide')).length;
        const panelCount = allFaculty.filter(f => f.roles.some(r => r.role === 'panel')).length;
        const coordinatorCount = allFaculty.filter(f => f.roles.some(r => r.role === 'coordinator')).length;
        
        console.log(`- Guide: ${guideCount}`);
        console.log(`- Panel: ${panelCount}`);
        console.log(`- Coordinator: ${coordinatorCount}`);

    } catch (error) {
        console.error('Error adding panel roles:', error);
    } finally {
        mongoose.disconnect();
        console.log('\nMongoDB disconnected.');
    }
};

addPanelRoles();

