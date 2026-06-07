// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// Connect to database with default URI if MONGO_URI is not provided
const connectDB = require('./config/db');
if (!process.env.MONGO_URI) {
    process.env.MONGO_URI = 'mongodb://localhost:27017/project-review-system';
    console.log('Using default MongoDB URI: mongodb://localhost:27017/project-review-system');
}
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'your-secret-key-here-change-in-production';
    console.log('Using default JWT_SECRET');
}
connectDB();

// Middleware
// Enable CORS for frontend dev hosts (adjust ports as needed)
// Enable CORS for frontend on ports 3001 and 3002
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
}));
app.use(express.json());

// General request logger
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
    next();
});

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teamRoutes = require('./routes/team');
const panelRoutes = require('./routes/panel');
const panelAssignmentRoutes = require('./routes/panelAssignment');
const guideRoutes = require('./routes/guide');
const studentRoutes = require('./routes/student');
const signatureRoutes = require('./routes/signatures');
const documentRoutes = require('./routes/simpleDocument'); // Using simple version for testing
// const internalExaminerRoutes = require('./routes/internalExaminer'); // Temporarily disabled
const externalExaminerRoutes = require('./routes/externalExaminer');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/panels', panelRoutes);
app.use('/api/panel-assignments', panelAssignmentRoutes);
app.use('/api/guide', guideRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/documents', documentRoutes);
// app.use('/api/internal-examiner', internalExaminerRoutes); // Temporarily disabled
app.use('/api/external-examiner', externalExaminerRoutes);

// Serve static files
app.use('/uploads', express.static('uploads'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    // ... existing code ...
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Ensure default admin exists
(async () => {
    try {
        const User = require('./models/User');
        const bcrypt = require('bcryptjs');

        // 1. Define the default users array
        const defaultUsers = [
            {
                email: 'cseceg2024@gmail.com',
                username: 'cseceg2024@gmail.com',
                name: 'System Admin',
                password: 'cseceg@admin',
                role: 'admin',
                roles: [{ role: 'admin', team: null }]
            },
            {
                email: 'student@example.com',
                username: 'student@example.com',
                name: 'Default Student',
                password: 'cseceg@student',
                role: 'student',
                roles: [{ role: 'student', team: null }]
            },
            {
                email: 'guide@example.com',
                username: 'guide@example.com',
                name: 'Default Guide',
                password: 'cseceg@guide',
                role: 'guide',
                roles: [{ role: 'guide', team: null }]
            },
            {
                email: 'panel@example.com',
                username: 'panel@example.com',
                name: 'Default Panel Member',
                password: 'cseceg@panel',
                role: 'panel',
                roles: [{ role: 'panel', team: null }]
            },
            {
                email: 'coordinator@example.com',
                username: 'coordinator@example.com',
                name: 'Default Coordinator',
                password: 'cseceg@coordinator',
                role: 'coordinator',
                roles: [{ role: 'coordinator', team: null }]
            }
        ];

        const salt = await bcrypt.genSalt(10);

        // 2. Loop through and upsert each user safely
        for (const userData of defaultUsers) {
            let user = await User.findOne({ 
                $or: [{ username: userData.username }, { email: userData.email }] 
            });

            if (!user) {
                // Hash the respective password for this specific user
                const hashedPassword = await bcrypt.hash(userData.password, salt);

                user = new User({
                    username: userData.username,
                    email: userData.email,
                    name: userData.name,
                    password: hashedPassword,
                    role: userData.role,
                    roles: userData.roles,
                    mustChangePassword: true
                });

                await user.save();
                console.log(`✅ Default ${userData.role} created: ${userData.email}`);
            } else {
                // Ensure existing users match up-to-date defaults if needed
                let changed = false;
                if (!user.email) { user.email = userData.email; changed = true; }
                if (user.username !== userData.username) { user.username = userData.username; changed = true; }
                if (user.role !== userData.role) { user.role = userData.role; changed = true; }
                
                if (!Array.isArray(user.roles) || !user.roles.find(r => r.role === userData.role)) { 
                    user.roles = userData.roles; 
                    changed = true; 
                }

                if (changed) { 
                    await user.save(); 
                    console.log(`🔄 Updated existing ${userData.role} profile fields.`);
                }
            }
        }
    } catch (e) {
        console.error('Error ensuring default users:', e.message);
    }
})();