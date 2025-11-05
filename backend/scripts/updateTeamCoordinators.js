const mongoose = require('mongoose');
const Team = require('../models/Team');
const Panel = require('../models/Panel');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/project-review-system', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function updateTeamCoordinators() {
    try {
        console.log('🔍 Starting team coordinator update...');
        
        // Find all teams that have a panel but no coordinator
        const teamsNeedingUpdate = await Team.find({
            panel: { $exists: true, $ne: null },
            coordinator: { $exists: false }
        }).populate('panel', 'coordinator');
        
        console.log(`📊 Found ${teamsNeedingUpdate.length} teams needing coordinator assignment`);
        
        let updatedCount = 0;
        
        for (const team of teamsNeedingUpdate) {
            if (team.panel && team.panel.coordinator) {
                team.coordinator = team.panel.coordinator;
                await team.save();
                updatedCount++;
                console.log(`✅ Updated team "${team.teamName}" with coordinator: ${team.panel.coordinator}`);
            } else {
                console.log(`⚠️  Team "${team.teamName}" has panel but panel has no coordinator`);
            }
        }
        
        console.log(`🎉 Successfully updated ${updatedCount} teams with coordinators`);
        
        // Also check for teams that have coordinators but they don't match their panel's coordinator
        const teamsWithMismatchedCoordinators = await Team.find({
            panel: { $exists: true, $ne: null },
            coordinator: { $exists: true, $ne: null }
        }).populate('panel', 'coordinator');
        
        let fixedCount = 0;
        for (const team of teamsWithMismatchedCoordinators) {
            if (team.panel && team.panel.coordinator && 
                team.coordinator.toString() !== team.panel.coordinator.toString()) {
                console.log(`🔧 Fixing mismatched coordinator for team "${team.teamName}"`);
                team.coordinator = team.panel.coordinator;
                await team.save();
                fixedCount++;
            }
        }
        
        console.log(`🔧 Fixed ${fixedCount} teams with mismatched coordinators`);
        
    } catch (error) {
        console.error('❌ Error updating team coordinators:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run the update
updateTeamCoordinators();
