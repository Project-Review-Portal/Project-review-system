const path = require('path');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');

const seedTeam = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected for seeding team.');

        const session = await Session.findOne({ status: 'active' });
        if (!session) {
            console.error('No active session found.');
            process.exit(1);
        }

        const guide = await User.findOne({ username: 'john.doe@univ.edu' });
        const studentAlice = await User.findOne({ username: 'alice@univ.edu' });
        const studentBob = await User.findOne({ username: 'bob@univ.edu' });

        if (!guide || !studentAlice || !studentBob) {
            console.error('Missing guide or students.');
            process.exit(1);
        }

        // Check if team already exists
        let team = await Team.findOne({ teamName: 'Team Alpha', session: session._id });
        if (!team) {
            team = new Team({
                teamName: 'Team Alpha',
                teamLeader: studentAlice._id,
                members: [studentAlice._id, studentBob._id],
                memberStatus: [
                    { user: studentAlice._id, status: 'accepted', lockApproved: true },
                    { user: studentBob._id, status: 'accepted', lockApproved: true }
                ],
                isTeamComplete: true,
                isLocked: true,
                status: 'approved',
                guidePreference: guide._id,
                programme: 'B.E. CSE',
                session: session._id
            });
            await team.save();
            console.log('Created team: Team Alpha (approved, guided by Dr. John Doe)');
        } else {
            team.status = 'approved';
            team.guidePreference = guide._id;
            team.members = [studentAlice._id, studentBob._id];
            await team.save();
            console.log('Updated team: Team Alpha');
        }

        // Initialize Attendance doc for team if not present
        let attendance = await Attendance.findOne({ team: team._id });
        if (!attendance) {
            attendance = new Attendance({
                team: team._id,
                guide: guide._id,
                programme: 'B.E. CSE',
                session: session._id,
                studentAttendances: [
                    {
                        student: studentAlice._id,
                        attendedHours: 0,
                        attendancePercentage: 0,
                        assessments: []
                    },
                    {
                        student: studentBob._id,
                        attendedHours: 0,
                        attendancePercentage: 0,
                        assessments: []
                    }
                ],
                totalHours: 0
            });
            await attendance.save();
            console.log('Created initial attendance record for Team Alpha');
        } else {
            console.log('Attendance record exists for Team Alpha');
        }

        console.log('✅ Team seeding completed successfully!');
    } catch (err) {
        console.error('Error seeding team:', err);
    } finally {
        await mongoose.disconnect();
    }
};

seedTeam();
