const mongoose = require('mongoose');
const Panel = require('../models/Panel');
const User = require('../models/User');
const connectDB = require('../config/db'); // Require the connect function

const findInvalidPanels = async () => {
    try {
        console.log('Connecting to the database...');
        await connectDB(); // Await the connection
        console.log('Database connected.');

        console.log('Fetching all panels...');
        const panels = await Panel.find().populate({
            path: 'members',
            model: 'User',
            select: 'name memberType'
        });
        console.log(`Found ${panels.length} panels.`);

        const invalidPanels = [];

        for (const panel of panels) {
            const externalMembers = panel.members.filter(member => member.memberType === 'external');
            if (externalMembers.length > 1) {
                invalidPanels.push(panel);
            }
        }

        if (invalidPanels.length > 0) {
            console.log('\nFound panels with more than one external member:');
            invalidPanels.forEach(panel => {
                console.log(`\nPanel Name: ${panel.name}`);
                console.log('Members:');
                panel.members.forEach(member => {
                    console.log(`  - ${member.name} (${member.memberType})`);
                });
            });
        } else {
            console.log('\nNo panels with more than one external member found.');
        }

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        mongoose.disconnect();
        console.log('\nDatabase connection closed.');
    }
};

findInvalidPanels(); 