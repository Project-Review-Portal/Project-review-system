const authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        console.log('🔍 === Authorization Debug ===');
        console.log('🔍 Required roles:', roles);
        console.log('🔍 User object:', req.user);
        console.log('🔍 User role:', req.user?.role);
        console.log('🔍 User roles array:', req.user?.roles);
        
        // Check if user has the required role or is admin
        let hasPermission = false;

        if (req.user) {
            // Admin bypass: admins can access everything
            if (req.user.role === 'admin') {
                hasPermission = true;
            }

            // Check if user's primary role matches
            if (!hasPermission && req.user.role && roles.includes(req.user.role)) {
                hasPermission = true;
            }

            // Check if any role in roles array matches
            if (!hasPermission && req.user.roles && Array.isArray(req.user.roles)) {
                const hasRequiredSubRole = req.user.roles.some(r => {
                    if (typeof r === 'string') {
                        return roles.includes(r);
                    } else if (r && r.role) {
                        return roles.includes(r.role);
                    }
                    return false;
                });
                if (hasRequiredSubRole) {
                    hasPermission = true;
                }
            }

            // Additional check: if user has the role in their database record
            if (!hasPermission && req.user.role && roles.includes(req.user.role)) {
                hasPermission = true;
            }
        }
        
        if (!hasPermission) {
            console.error('❌ Authorization failed - User role not in required roles');
            console.error('❌ User role:', req.user?.role);
            console.error('❌ User roles array:', req.user?.roles);
            console.error('❌ Required roles:', roles);
            // user's role is not authorized or user is not logged in
            return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
        }

        console.log('✅ Authorization successful');
        console.log('🔍 === End Authorization Debug ===');
        // authentication and authorization successful
        next();
    };
};

module.exports = authorize; 