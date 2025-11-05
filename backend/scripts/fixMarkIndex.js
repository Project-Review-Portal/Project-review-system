const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Mark = require('../models/Mark');

const fixIndex = async () => {
    try {
        await connectDB();
        console.log('MongoDB Connected...');

        console.log('Attempting to drop old index "team_1_markedBy_1_role_1"...');
        
        try {
            await Mark.collection.dropIndex("team_1_markedBy_1_role_1");
            console.log('Successfully dropped old index.');
        } catch (error) {
            if (error.codeName === 'IndexNotFound') {
                console.log('Old index not found, which is okay. It might have been removed already.');
            } else {
                throw error; // Re-throw other errors
            }
        }

        console.log('Ensuring all indexes are synced with the current model schema...');
        await Mark.syncIndexes();
        console.log('Indexes are now synced.');

        console.log('Script finished successfully!');

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB Disconnected.');
        process.exit();
    }
};

fixIndex(); 