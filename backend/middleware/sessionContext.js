const Session = require('../models/Session');
const Programme = require('../models/Programme');
const { resolveCurrentSession, resolveAdvancedSession } = require('../utils/sessionHelper');

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

        const currentSession = await resolveCurrentSession();
        const currentSessionId = currentSession ? currentSession._id.toString() : null;
        const advancedSession = await resolveAdvancedSession(currentSessionId);
        const advancedSessionId = advancedSession ? advancedSession._id.toString() : null;

        // If not found from header, resolve to current active session
        if (!sessionDoc) {
            sessionDoc = currentSession;
        }

        if (sessionDoc) {
            const sid = sessionDoc._id.toString();
            req.sessionId = sid;
            req.sessionDoc = sessionDoc;
            req.isCurrentSession = sid === currentSessionId;
            req.isAdvancedSession = sid === advancedSessionId;
            // Sessions that are neither Current nor Advanced are Read-Only for non-admins
            req.isSessionReadOnly = !(req.isCurrentSession || req.isAdvancedSession) || sessionDoc.status === 'archived';
        }

        next();
    } catch (error) {
        console.warn('Error in extractSessionContext middleware:', error.message);
        next();
    }
};

/**
 * Middleware to block non-admins from accessing paused programmes.
 */
const requireActiveSession = async (req, res, next) => {
    // Admins always have access
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    // Check programme-level paused status
    try {
        const progName = req.headers['x-selected-programme'] || req.query.programme || req.user?.programme;
        if (progName && req.sessionId) {
            const progDoc = await Programme.findOne({
                name: { $regex: new RegExp(`^${progName.trim()}$`, 'i') },
                session: req.sessionId
            });
            if (progDoc && progDoc.status === 'paused') {
                return res.status(403).json({
                    message: `Programme "${progDoc.name}" is currently paused by the administrator.`,
                    isPaused: true
                });
            }
        }
    } catch (err) {
        console.warn('Error checking programme paused status:', err.message);
    }

    next();
};

/**
 * Middleware to block modifications (POST/PUT/PATCH/DELETE) on read-only past sessions.
 */
const enforceReadOnlyPastSession = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutatingMethods.includes(req.method.toUpperCase()) && req.isSessionReadOnly) {
        return res.status(403).json({
            message: 'This session is in read-only mode. Only Current and Advanced sessions permit modifications.'
        });
    }

    next();
};

module.exports = {
    extractSessionContext,
    requireActiveSession,
    enforceReadOnlyPastSession
};
