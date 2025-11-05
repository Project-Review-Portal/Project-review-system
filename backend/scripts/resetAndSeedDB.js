require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Team = require('../models/Team');
const TeamPanelAssignment = require('../models/TeamPanelAssignment');
const Config = require('../models/Config');
const Panel = require('../models/Panel');

const generateRandomName = (prefix) => {
  const adjectives = ["Aarav", "Diya", "Kabir", "Mira", "Ishaan", "Anaya", "Rohan"];
  const nouns = ["Mehta", "Reddy", "Shah", "Kapoor", "Verma", "Singh", "Desai"];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${prefix} ${randomAdj} ${randomNoun}`;
};

const seedDatabase = async () => {
  const mongoUri = "mongodb+srv://Suchitra:suchi3590@projectreviewcluster.v4ikhob.mongodb.net/test?retryWrites=true&w=majority";

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected to test database.');

    // 1. Delete all existing documents
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Team.deleteMany({});
    await TeamPanelAssignment.deleteMany({});
    await Config.deleteMany({});
    await Panel.deleteMany({});
    console.log('All collections cleared.');

    // 2. Insert default config
    console.log('Inserting default config...');
    await Config.create({
      maxTeamSize: 4,
      teamFormationOpen: true,
      guideSelectionStartDate: null,
      guideSelectionEndDate: null,
      reviewPeriodStartDate: null,
      reviewPeriodEndDate: null
    });
    console.log('Default config inserted.');

    // 2. Generate and insert users
    console.log('Inserting new users...');
    const usersToInsert = [];

    // Admin
    usersToInsert.push({
      username: 'admin1',
      password: 'admin123',
      role: 'admin',
      name: generateRandomName('Admin')
    });

    // Students
    for (let i = 1; i <= 20; i++) {
      usersToInsert.push({
        username: `student${i}`,
        password: 'student123',
        role: 'student',
        name: generateRandomName(`Student ${i}`)
      });
    }

    // Panel Members
    for (let i = 1; i <= 10; i++) {
      usersToInsert.push({
        username: `panel${i}`,
        password: 'panel123',
        role: 'panel',
        name: generateRandomName(`Panel ${i}`),
        memberType: (i % 2 === 0) ? 'internal' : 'external' // Alternate internal/external
      });
    }

    // Guides
    for (let i = 1; i <= 10; i++) {
      usersToInsert.push({
        username: `guide${i}`,
        password: 'guide123',
        role: 'guide',
        name: generateRandomName(`Guide ${i}`)
      });
    }

    // Coordinators
    for (let i = 1; i <= 5; i++) {
      usersToInsert.push({
        username: `coordinator${i}`,
        password: 'coordinator123',
        role: 'coordinator',
        name: generateRandomName(`Coordinator ${i}`)
      });
    }

    for (const userData of usersToInsert) {
      const { username, password, role, name, memberType } = userData;

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = new User({
        username,
        name,
        password: hashedPassword,
        roles: [{ role: role, team: null }],
        memberType: memberType || null
      });

      await newUser.save();
      console.log(`Inserted ${role}: ${username} (${name})`);
    }

    console.log('Database seeding complete.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

seedDatabase(); 