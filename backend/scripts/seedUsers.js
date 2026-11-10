const path = require('path');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Programme = require('../models/Programme');
const Session = require('../models/Session');
const { ensureDefaultSessionAndMigrate } = require('./migrateSessions');

const SEED_USERS = [
    // Admin
    {
        username: 'cseceg2024@gmail.com',
        email: 'cseceg2024@gmail.com',
        name: 'System Admin',
        password: 'admin',
        role: 'admin',
        roles: [{ role: 'admin', team: null }]
    },
    {
        username: 'cseceg@gmail.com',
        email: 'cseceg@gmail.com',
        name: 'Admin',
        password: '123',
        role: 'admin',
        roles: [{ role: 'admin', team: null }]
    },

    // Faculty
    {
        username: 'john@univ.edu',
        email: 'john@univ.edu',
        name: 'Dr. John',
        password: 'faculty123',
        role: 'guide',
        roles: [
            { role: 'guide', team: null },
            { role: 'panel', team: null },
            { role: 'coordinator', team: null }
        ],
        designation: 'Professor',
        seniority: 1
    },
    {
        username: 'lana@univ.edu',
        email: 'lana@univ.edu',
        name: 'Dr. Lana',
        password: 'l',
        role: 'panel',
        roles: [
            { role: 'guide', team: null },
            { role: 'panel', team: null },
            { role: 'coordinator', team: null }
        ],
        designation: 'Associate Professor',
        seniority: 2
    },

    // UG Students (B.E. CSE)
    {
        username: 'alice@univ.edu',
        email: 'alice@univ.edu',
        name: 'Alice',
        password: 'a',
        role: 'student',
        roles: [{ role: 'student', team: null }],
        programme: 'B.E. CSE'
    },
    {
        username: 'bob@univ.edu',
        email: 'bob@univ.edu',
        name: 'Bob',
        password: '2',
        role: 'student',
        roles: [{ role: 'student', team: null }],
        programme: 'B.E. CSE'
    },
    {
        username: 'caroline@univ.edu',
        email: 'caroline@univ.edu',
        name: 'Caroline',
        password: '3',
        role: 'student',
        roles: [{ role: 'student', team: null }],
        programme: 'B.E. CSE'
    },
    {
        username: 'david@univ.edu',
        email: 'david@univ.edu',
        name: 'David',
        password: '4',
        role: 'student',
        roles: [{ role: 'student', team: null }],
        programme: 'B.E. CSE'
    },

    // PG Students (M.E. Big Data)
    {
        username: 'sandrason@univ.edu',
        email: 'sandrason@univ.edu',
        name: 'Sandrason',
        password: 's',
        role: 'student',
        roles: [{ role: 'student', team: null }],
        programme: 'M.E. Big Data'
    },
    {
        username: 'tarik@univ.edu',
        email: 'tarik@univ.edu',
        name: 'Tarik',
        password: 't',
        role: 'student',
        roles: [{ role: 'student', team: null }],
        programme: 'M.E. Big Data'
    },
    {
        username: 'ursula@univ.edu',
        email: 'ursula@univ.edu',
        name: 'Ursula',
        password: 'u',
        role: 'student',
        roles: [{ role: 'student', team: null }],
        programme: 'M.E. Big Data'
    }
];

const seedUsers = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/project-review-system';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri);
        }

        console.log('🌱 Seeding specific user accounts from brave-pass.csv...');

        // Ensure M.E. Big Data programme exists
        const pgProg = await Programme.findOne({ name: 'M.E. Big Data' });
        if (!pgProg) {
            await Programme.create({ name: 'M.E. Big Data' });
            console.log('✅ Created M.E. Big Data programme');
        }

        // Run session migration to ensure active session exists
        await ensureDefaultSessionAndMigrate();
        const activeSession = await Session.findOne({ status: 'active' }) || await Session.findOne();

        const salt = await bcrypt.genSalt(10);

        for (const data of SEED_USERS) {
            const hashedPassword = await bcrypt.hash(data.password, salt);

            let user = await User.findOne({
                $or: [{ username: data.username }, { email: data.email }]
            });

            if (!user) {
                user = new User({
                    username: data.username,
                    email: data.email,
                    name: data.name,
                    password: hashedPassword,
                    role: data.role,
                    roles: data.roles,
                    programme: data.programme || 'B.E. CSE',
                    designation: data.designation || '',
                    seniority: data.seniority || null,
                    session: activeSession?._id,
                    mustChangePassword: false // Direct login without prompt
                });
                await user.save();
                console.log(`✅ Created user: ${data.username} (${data.role})`);
            } else {
                user.password = hashedPassword;
                user.name = data.name;
                user.role = data.role;
                user.roles = data.roles;
                if (data.programme) user.programme = data.programme;
                if (data.designation) user.designation = data.designation;
                if (data.seniority) user.seniority = data.seniority;
                user.session = activeSession?._id;
                user.mustChangePassword = false;
                await user.save();
                console.log(`🔄 Updated credentials for user: ${data.username}`);
            }
        }

        console.log('✨ All brave-pass users seeded successfully with their exact credentials!');
    } catch (err) {
        console.error('Error seeding users:', err);
    }
};

if (require.main === module) {
    seedUsers()
        .then(async () => {
            await mongoose.disconnect();
            process.exit(0);
        })
        .catch(async (err) => {
            console.error('Seeding failed:', err);
            await mongoose.disconnect();
            process.exit(1);
        });
}

module.exports = { seedUsers };
