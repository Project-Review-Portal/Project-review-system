const mongoose = require('mongoose');
const dns = require('dns');

// Configure public DNS servers for reliable SRV resolution on Windows
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    // Keep default if restricted
}

// Load env vars from current directory's .env file
require('dotenv').config();

const connectDB = async () => {
    try {
        // Use default local MongoDB if no MONGO_URI is set
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/project-review-system';
        console.log('MONGO_URI:', mongoUri);
        const conn = await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // 5 seconds timeout
            socketTimeoutMS: 45000 // 45 seconds
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB Connection Error:', error.message);
        if (process.env.MONGO_URI) {
            console.error('Connection String:', process.env.MONGO_URI.replace(/:[^:@]+@/, ':****@')); // Hide password in logs
        } else {
            console.error('MONGO_URI environment variable is not set');
        }
        console.error('Please check your internet connection and MongoDB Atlas cluster status');
        process.exit(1);
    }
};

module.exports = connectDB; 