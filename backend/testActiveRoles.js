require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');
const Team = require('./models/Team');
const Panel = require('./models/Panel');

const testActiveRoles = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected for testing active roles.');

        // Test with a faculty user
        const facultyUser = await User.findOne({ username: 'guide1' });
        if (!facultyUser) {
            console.log('Faculty user not found');
            return;
        }

        console.log(`\n=== Testing Active Roles for ${facultyUser.username} ===`);
        console.log('User ID:', facultyUser._id);
        console.log('Potential roles:', facultyUser.roles.map(r => r.role));

        // Check team assignments
        console.log('\n--- Team Assignments ---');
        
        // Check if user is assigned as guide to any team
        const guideTeams = await Team.find({ guidePreference: facultyUser._id });
        console.log('Teams where user is guide:', guideTeams.length);
        if (guideTeams.length > 0) {
            guideTeams.forEach(team => {
                console.log(`  - Team: ${team.teamName} (ID: ${team._id})`);
            });
        }

        // Check if user is a member of any panel that's assigned to teams
        const userPanels = await Panel.find({ members: facultyUser._id });
        console.log('Panels where user is member:', userPanels.length);
        let teamsWithPanels = [];
        if (userPanels.length > 0) {
            userPanels.forEach(panel => {
                console.log(`  - Panel: ${panel.name} (ID: ${panel._id})`);
            });
            
            const panelIds = userPanels.map(p => p._id);
            teamsWithPanels = await Team.find({ panel: { $in: panelIds } });
            console.log('Teams assigned to user\'s panels:', teamsWithPanels.length);
            if (teamsWithPanels.length > 0) {
                teamsWithPanels.forEach(team => {
                    console.log(`  - Team: ${team.teamName} (ID: ${team._id})`);
                });
            }
        }

        // Check if user is assigned as coordinator to any team
        const coordinatorTeams = await Team.find({ coordinator: facultyUser._id });
        console.log('Teams where user is coordinator:', coordinatorTeams.length);
        if (coordinatorTeams.length > 0) {
            coordinatorTeams.forEach(team => {
                console.log(`  - Team: ${team.teamName} (ID: ${team._id})`);
            });
        }

        // Simulate the active roles logic
        console.log('\n--- Active Roles Calculation ---');
        const activeRoles = [];
        
        if (guideTeams.length > 0) {
            activeRoles.push({ role: 'guide', team: guideTeams[0]._id.toString() });
            console.log('✓ Guide role active (assigned to team)');
        } else {
            console.log('✗ Guide role not active (no team assignment)');
        }
        
        if (teamsWithPanels && teamsWithPanels.length > 0) {
            activeRoles.push({ role: 'panel', team: teamsWithPanels[0]._id.toString() });
            console.log('✓ Panel role active (panel assigned to team)');
        } else {
            console.log('✗ Panel role not active (no panel assignment to team)');
        }
        
        if (coordinatorTeams.length > 0) {
            activeRoles.push({ role: 'coordinator', team: coordinatorTeams[0]._id.toString() });
            console.log('✓ Coordinator role active (assigned to team)');
        } else {
            console.log('✗ Coordinator role not active (no team assignment)');
        }

        console.log('\n--- Final Active Roles ---');
        if (activeRoles.length > 0) {
            activeRoles.forEach(role => {
                console.log(`  - ${role.role} (team: ${role.team})`);
            });
        } else {
            console.log('  No active roles found - user will see "No Active Role Assignments" message');
        }

        // Test with another user
        console.log('\n=== Testing with panel1 user ===');
        const panelUser = await User.findOne({ username: 'panel1' });
        if (panelUser) {
            const panelGuideTeams = await Team.find({ guidePreference: panelUser._id });
            const panelUserPanels = await Panel.find({ members: panelUser._id });
            const panelCoordinatorTeams = await Team.find({ coordinator: panelUser._id });
            
            console.log(`Panel user potential roles: ${panelUser.roles.map(r => r.role).join(', ')}`);
            console.log(`Active guide assignments: ${panelGuideTeams.length}`);
            console.log(`Active panel memberships: ${panelUserPanels.length}`);
            console.log(`Active coordinator assignments: ${panelCoordinatorTeams.length}`);
        }

    } catch (error) {
        console.error('Error testing active roles:', error);
    } finally {
        mongoose.disconnect();
        console.log('\nMongoDB disconnected.');
    }
};

testActiveRoles();
