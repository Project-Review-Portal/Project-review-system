const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the User model
const Panel = require('../models/Panel');
const Team = require('../models/Team');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';

module.exports = async (req, res, next) => {
    try {
        console.log('🔍 Auth middleware - Headers:', req.headers.authorization);
        console.log('🔍 Auth middleware - JWT_SECRET being used:', JWT_SECRET);
        
        if (!req.header('Authorization')) {
            console.error('❌ No Authorization header found');
            return res.status(401).json({ message: 'No authorization header provided' });
        }
        
        const token = req.header('Authorization').replace('Bearer ', '');
        console.log('🔍 Auth middleware - Token received:', token.substring(0, 20) + '...');
        
        if (!token || token === 'undefined' || token === 'null') {
            console.error('❌ Invalid token format');
            return res.status(401).json({ message: 'Invalid token format' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('🔍 Auth middleware - Decoded token:', decoded);
        console.log('🔍 Auth middleware - Role from token:', decoded.role);
        
        // Fetch the user from the database to get all current user data, including review period dates
        const user = await User.findById(decoded.id);
        if (!user) {
            console.log('Auth middleware - User not found');
            return res.status(401).json({ message: 'User not found, authentication failed' });
        }
        
        console.log('Auth middleware - User found:', user.username);
        console.log('Auth middleware - User roles:', user.roles);

        // Attach the user object and ensure id is set correctly
        req.user = user;
        req.user.id = user._id;
        req.user.role = decoded.role; // Set the role from token
        req.user.team = decoded.team; // Set the team from token
        
        // Ensure role is set from user's primary role if not in token
        if (!req.user.role && user.role) {
            req.user.role = user.role;
            console.log('Auth middleware - Set role from user.role:', user.role);
        }
        
        // If still no role, try to get from roles array
        if (!req.user.role && user.roles && user.roles.length > 0) {
            req.user.role = user.roles[0].role;
            console.log('Auth middleware - Set role from user.roles[0]:', user.roles[0].role);
        }
        
        // Dynamically augment roles based on current assignments
        // This ensures coordinator/panel/guide access even if token was issued under a different primary role
        try {
            const dynamicRoles = Array.isArray(req.user.roles) ? [...req.user.roles] : [];

            // Coordinator via Panel assignment
            const coordinatorPanels = await Panel.find({ coordinator: req.user.id }).select('_id');
            if (coordinatorPanels.length > 0) {
                const panelIds = coordinatorPanels.map(p => p._id);
                const teamsWithPanel = await Team.find({ panel: { $in: panelIds } }).select('_id');
                if (teamsWithPanel.length === 0) {
                    if (!dynamicRoles.some(r => r.role === 'coordinator')) {
                        dynamicRoles.push({ role: 'coordinator', team: null });
                    }
                } else {
                    for (const t of teamsWithPanel) {
                        if (!dynamicRoles.some(r => r.role === 'coordinator' && String(r.team) === String(t._id))) {
                            dynamicRoles.push({ role: 'coordinator', team: t._id });
                        }
                    }
                }
            }

            // Panel member via Panel.members
            const memberPanels = await Panel.find({ members: req.user.id }).select('_id');
            if (memberPanels.length > 0) {
                const memberPanelIds = memberPanels.map(p => p._id);
                const teamsUnderMemberPanels = await Team.find({ panel: { $in: memberPanelIds } }).select('_id');
                if (teamsUnderMemberPanels.length === 0) {
                    if (!dynamicRoles.some(r => r.role === 'panel')) {
                        dynamicRoles.push({ role: 'panel', team: null });
                    }
                } else {
                    for (const t of teamsUnderMemberPanels) {
                        if (!dynamicRoles.some(r => r.role === 'panel' && String(r.team) === String(t._id))) {
                            dynamicRoles.push({ role: 'panel', team: t._id });
                        }
                    }
                }
            }

            // Ensure req.user.roles reflects dynamic roles
            req.user.roles = dynamicRoles;
            console.log('Auth middleware - Augmented dynamic roles:', req.user.roles);
        } catch (dynamicErr) {
            console.warn('Auth middleware - Failed to augment dynamic roles:', dynamicErr.message);
        }

        console.log('Auth middleware - Final req.user.role:', req.user.role);
        next();
    } catch (error) {
        console.log('Auth middleware - Error:', error.message);
        res.status(401).json({ message: 'Please authenticate' });
    }
}; 