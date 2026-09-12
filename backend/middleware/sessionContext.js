const Session = require('../models/Session');
const { resolveCurrentSession } = require('../utils/sessionHelper');

/**
 * Middleware to extract session from headers or resolve to default current session.
 */
const extractSessionContext = async (req, res, next) => {
    try {
        const headerSession = req.headers['x-selected-session'] || req.headers['x-selected-session-id'] || req.query.sessionId;

        let sessionDoc = null;
        if (headerSession && headerSession !== 'null' && headerSession !== 'undefined') {
            sessionDoc = await Session.findById(headerSession);
        }

        // If not found from header, resolve to current active session
        if (!sessionDoc) {
            sessionDoc = await resolveCurrentSession();
        }

        if (sessionDoc) {
            req.sessionId = sessionDoc._id.toString();
            req.sessionDoc = sessionDoc;
            req.isSessionPaused = sessionDoc.status === 'paused';
            req.isSessionReadOnly = sessionDoc.status === 'archived';
        }

        next();
    } catch (error) {
        console.warn('Error in extractSessionContext middleware:', error.message);
        next();
    }
};

/**
 * Middleware to block non-admins from accessing paused sessions.
 */
const requireActiveSession = async (req, res, next) => {
    // Admins always have access
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    if (req.sessionDoc && req.sessionDoc.status === 'paused') {
        return res.status(403).json({
            message: 'This session is currently paused by the administrator.',
            isPaused: true
        });
    }

    next();
};

/**
 * Middleware to block modifications (POST/PUT/PATCH/DELETE) on archived/past sessions.
 */
const enforceReadOnlyPastSession = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        // Admin might still view or manage, but if strictly read-only is requested:
        // We allow admin mutations or block if archived
    }

    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutatingMethods.includes(req.method.toUpperCase()) && req.isSessionReadOnly) {
        return res.status(403).json({
            message: 'This session is archived. All past session data is strictly read-only.'
        });
    }

    next();
};

module.exports = {
    extractSessionContext,
    requireActiveSession,
    enforceReadOnlyPastSession
};
