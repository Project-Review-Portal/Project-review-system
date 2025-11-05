require('dotenv').config({ path: '../.env' }); // Adjust path as necessary if your .env is not in the root
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Adjust path as necessary

const usersToInsert = [
  // Students
  { username: 'student18', password: 'student123', role: 'student', name: 'Student Eighteen' },
  { username: 'student19', password: 'student123', role: 'student', name: 'Student Nineteen' },
  { username: 'student20', password: 'student123', role: 'student', name: 'Student Twenty' },
  { username: 'student21', password: 'student123', role: 'student', name: 'Student TwentyOne' },
  { username: 'student22', password: 'student123', role: 'student', name: 'Student TwentyTwo' },
  // Guides
  { username: 'guide4', password: 'guide123', role: 'guide', name: 'Guide Four' },
  { username: 'guide5', password: 'guide123', role: 'guide', name: 'Guide Five' },
  // Coordinators
  { username: 'coordinator1', password: 'coord123', role: 'coordinator', name: 'Coordinator One' },
  { username: 'coordinator2', password: 'coord123', role: 'coordinator', name: 'Coordinator Two' },
  { username: 'coordinator3', password: 'coord123', role: 'coordinator', name: 'Coordinator Three' },
];

const insertUsers = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/labeval_db';

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for user insertion.');

    for (const userData of usersToInsert) {
      const { username, password, role, name } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        console.log(`Skipping existing user: ${username}`);
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = new User({
        username,
        name,
        password: hashedPassword,
        role,
      });

      await newUser.save();
      console.log(`Successfully inserted ${role}: ${username} (${name})`);
    }

    // IMPORTANT: For existing users without a 'name' field, you might need a separate migration
    // For example, to set a default name for existing users:
    // await User.updateMany({ name: { $exists: false } }, { $set: { name: 'Default Name' } });
    // Or, you can manually update existing users in your database.

    console.log('All specified users processed.');
  } catch (error) {
    console.error('Error during user insertion:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

insertUsers(); 