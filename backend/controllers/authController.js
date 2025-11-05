const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Team = require('../models/Team');
const Panel = require('../models/Panel');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'cseceg24@gmail.com',
        pass: 'gvuvoumzoufcimcp',
    },
});

// Function to get user's active roles based on team assignments
const getUserActiveRoles = async (userId) => {
    const activeRoles = [];
    
    try {
        // Check if user is assigned as a guide to any team
        const guideTeams = await Team.find({ guidePreference: userId }).select('_id');
        for (const t of guideTeams) {
            activeRoles.push({ role: 'guide', team: t._id.toString() });
        }
        
        // Check if user is a member of any panel that's assigned to teams
        const userPanels = await Panel.find({ members: userId }).select('_id');
        if (userPanels.length > 0) {
            const panelIds = userPanels.map(p => p._id);
            const teamsWithPanels = await Team.find({ panel: { $in: panelIds } }).select('_id');
            for (const t of teamsWithPanels) {
                activeRoles.push({ role: 'panel', team: t._id.toString() });
            }
        }
        
        // Check if user is assigned as coordinator to any panel
        const coordinatorPanels = await Panel.find({ coordinator: userId }).select('_id');
        for (const p of coordinatorPanels) {
            // Get teams assigned to this panel
            const teamsWithPanel = await Team.find({ panel: p._id }).select('_id');
            for (const t of teamsWithPanel) {
                activeRoles.push({ role: 'coordinator', team: t._id.toString() });
            }
            // Also add the coordinator role with panel reference if no teams are assigned yet
            if (teamsWithPanel.length === 0) {
                activeRoles.push({ role: 'coordinator', team: null });
            }
        }
        
        // If no active roles found, return at least the primary role
        if (activeRoles.length === 0) {
            const user = await User.findById(userId);
            if (user && user.roles && user.roles.length > 0) {
                activeRoles.push({ role: user.roles[0].role, team: null });
            }
        }
        
        // Ensure all faculty roles are present at least once with null team
        const rolesToEnsure = ['guide', 'panel', 'coordinator'];
        const ensuredRoles = [...activeRoles];
        for (const roleName of rolesToEnsure) {
            if (!ensuredRoles.some(r => r.role === roleName)) {
                ensuredRoles.push({ role: roleName, team: null });
            }
        }
        return ensuredRoles;
    } catch (error) {
        console.error('Error getting user active roles:', error);
        // Fallback to user's potential roles if there's an error
        const user = await User.findById(userId);
        return user?.roles || [];
    }
};

// Authenticated: Reset password after first login
exports.resetPassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'New password and confirmation do not match' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.mustChangePassword = false;
        await user.save();

        return res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body; // 'username' can be an email now
        console.log('Login attempt:', { username }); // Debug log

        // Find user by username or email
        const user = await User.findOne({ $or: [ { username }, { email: username } ] });
        console.log('User found:', user ? 'Yes' : 'No'); // Debug log
        
        if (!user) {
            console.log('Login failed: User not found'); // Debug log
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch ? 'Yes' : 'No'); // Debug log
        
        if (!isMatch) {
            console.log('Login failed: Invalid password'); // Debug log
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        // Get the first role for the user (primary role)
        const firstRole = user.roles[0];
        if (!firstRole) {
            return res.status(403).json({ message: 'User has no assigned roles.' });
        }

        // For faculty users, include all faculty roles with team mapping (null if none)
        let activeRoles = [];
        if (['guide', 'panel', 'coordinator'].includes(firstRole.role)) {
            activeRoles = await getUserActiveRoles(user._id);
        } else {
            // For non-faculty users, use their roles as is
            activeRoles = user.roles;
        }

        // Set the primary role for the user (this will be used by the frontend)
        user.role = firstRole.role;
        await user.save();
        const token = jwt.sign(
            {
                id: user._id,
                username: user.username,
                role: firstRole.role,
                team: firstRole.team || null
            },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        console.log('Login successful for user:', username, 'as', firstRole.role); // Debug log
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                name: user.name,
                role: firstRole.role,  // Primary role
                team: firstRole.team || null,
                memberType: user.memberType || null,
                roles: activeRoles,     // Only active/assigned roles
                mustChangePassword: !!user.mustChangePassword
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Server error during login' 
        });
    }
};

exports.registerPanel = async (req, res) => {
    try {
        const { username, password, memberType } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new panel user
        const user = new User({
            username,
            password: hashedPassword,
            roles: [{ role: 'panel', team: null }],
            memberType: memberType || null
        });

        await user.save();

        res.status(201).json({ message: 'Panel member created successfully!' });
    } catch (error) {
        console.error('Error registering panel member:', error);
        res.status(500).json({ message: 'Server error during panel member registration' });
    }
};

// Get faculty (guide and panel members)
exports.getFaculty = async (req, res) => {
    try {
        const faculty = await User.find({
            'roles.role': { $in: ['guide', 'panel'] }
        }).select('username roles memberType name');

        res.json(faculty);
    } catch (error) {
        console.error('Error fetching faculty:', error);
        res.status(500).json({ message: 'Server error fetching faculty' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        // req.user is populated by the auth middleware
        const user = await User.findById(req.user.id).select('-password'); // Exclude password

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

// Admin: Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 

// Forgot Password: send OTP to user's email
exports.forgotPassword = async (req, res) => {
    try {
        const { identifier } = req.body; // username or email
        if (!identifier) {
            return res.status(400).json({ message: 'identifier is required' });
        }
        const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!user.email) {
            return res.status(400).json({ message: 'User does not have an email on file' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.otp = otp;
        user.otpExpiry = expiry;
        await user.save();

        await transporter.sendMail({
            from: 'cseceg24@gmail.com',
            to: user.email,
            subject: 'Password Reset OTP',
            html: `<p>Your OTP is: <strong>${otp}</strong></p><p>It is valid for 10 minutes.</p>`
        });

        return res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ message: 'Failed to send OTP' });
    }
};

// Verify OTP (optional step if UI wants to verify before reset)
exports.verifyOtp = async (req, res) => {
    try {
        const { identifier, otp } = req.body;
        if (!identifier || !otp) {
            return res.status(400).json({ message: 'identifier and otp are required' });
        }
        const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.otp || !user.otpExpiry || user.otp !== otp || Date.now() > new Date(user.otpExpiry).getTime()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Do not clear OTP here so it can be used once in reset; or clear and ask UI to call reset with new OTP.
        return res.json({ message: 'OTP verified' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Reset password using OTP
exports.resetPasswordOtp = async (req, res) => {
    try {
        const { identifier, otp, newPassword } = req.body;
        if (!identifier || !otp || !newPassword) {
            return res.status(400).json({ message: 'identifier, otp and newPassword are required' });
        }
        const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.otp || !user.otpExpiry || user.otp !== otp || Date.now() > new Date(user.otpExpiry).getTime()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.otp = null;
        user.otpExpiry = null;
        user.mustChangePassword = false;
        await user.save();

        return res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password (OTP) error:', error);
        return res.status(500).json({ message: 'Failed to reset password' });
    }
};