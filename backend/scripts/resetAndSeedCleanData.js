const path = require('path');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Team = require('../models/Team');
const Session = require('../models/Session');
const Programme = require('../models/Programme');
const Config = require('../models/Config');
const PgConfig = require('../models/PgConfig');

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
    // Faculty
    {
        username: 'john.doe@univ.edu',
        email: 'john.doe@univ.edu',
        name: 'Dr. John Doe',
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

const resetDatabase = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/project-review-system';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri);
        }

        console.log('🧹 [1/4] Clearing test data (teams, users, allocations, configs)...');
        try { await mongoose.connection.db.collection('users').dropIndex('username_1'); } catch (e) { }
        try { await mongoose.connection.db.collection('programmes').dropIndex('name_1'); } catch (e) { }
        try { await mongoose.connection.db.collection('designationteamlimits').dropIndex('designation_1'); } catch (e) { }
        await Team.deleteMany({});
        await User.deleteMany({});
        await Session.deleteMany({});
        const now = new Date();
        const curYear = now.getFullYear();
        const isSecondHalf = now.getMonth() >= 6; // July-Dec is odd semester

        const defaultSession = await Session.create({
            name: isSecondHalf ? `July ${curYear} - November ${curYear}` : `January ${curYear} - May ${curYear}`,
            startMonth: isSecondHalf ? 7 : 1,
            startYear: curYear,
            endMonth: isSecondHalf ? 11 : 5,
            endYear: curYear,
            semesterType: isSecondHalf ? 'odd' : 'even',
            academicYear: `${curYear}-${curYear + 1}`,
            status: 'active',
            programmes: ['B.E. CSE', 'M.E. Big Data']
        });

        // Ensure Master PG Programmes exist for session
        console.log('📚 [3/4] Ensuring Session PG Programmes and Limits exist...');
        await Programme.deleteMany({});
        await Programme.create({ name: 'M.E. Big Data', session: defaultSession._id });

        const DesignationTeamLimit = require('../models/DesignationTeamLimit');
        await DesignationTeamLimit.deleteMany({});
        await DesignationTeamLimit.create([
            { designation: 'Professor', ugLimit: 3, pgLimit: 2, session: defaultSession._id },
            { designation: 'Associate Professor', ugLimit: 2, pgLimit: 2, session: defaultSession._id },
            { designation: 'Assistant Professor', ugLimit: 2, pgLimit: 1, session: defaultSession._id }
        ]);

        // Initialize Programme Settings for active session
        await Config.deleteMany({});
        await Config.create({
            programme: 'B.E. CSE',
            session: defaultSession._id,
            maxTeamSize: 4,
            teamFormationOpen: true
        });
        await Config.create({
            programme: 'M.E. Big Data',
            session: defaultSession._id,
            maxTeamSize: 2,
            teamFormationOpen: true
        });

        // Seed Users
        console.log('👥 [4/4] Seeding brave-pass Users...');
        const salt = await bcrypt.genSalt(10);
        for (const data of SEED_USERS) {
            const hashedPassword = await bcrypt.hash(data.password, salt);
            const userSession = data.role === 'admin' ? null : defaultSession._id;
            const query = data.role === 'admin'
                ? { $or: [{ username: data.username }, { email: data.email }] }
                : { $or: [{ username: data.username }, { email: data.email }], session: defaultSession._id };

            let user = await User.findOne(query);

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
                    session: userSession,
                    mustChangePassword: false
                });
                await user.save();
            } else {
                user.password = hashedPassword;
                user.name = data.name;
                user.role = data.role;
                user.roles = data.roles;
                if (data.programme) user.programme = data.programme;
                if (data.designation) user.designation = data.designation;
                if (data.seniority) user.seniority = data.seniority;
                user.session = userSession;
                user.mustChangePassword = false;
                await user.save();
            }
        }

        console.log('✅ Database reset & clean seed completed successfully!');
    } catch (err) {
        console.error('❌ Error resetting database:', err);
    }
};

if (require.main === module) {
    resetDatabase().then(() => mongoose.disconnect());
}

module.exports = { resetDatabase };
