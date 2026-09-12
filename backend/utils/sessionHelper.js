const Session = require('../models/Session');

/**
 * Get the current Date in IST (Asia/Kolkata timezone: GMT+5:30)
 */
const getISTDate = () => {
    try {
        const now = new Date();
        const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        return new Date(istString);
    } catch (e) {
        // Fallback offset calculation (+5.5 hours)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * 5.5));
    }
};

/**
 * Resolve the current session based on:
 * 1. An explicit manual current session override (`isManualCurrent: true`), OR
 * 2. An active session whose (startYear, startMonth) to (endYear, endMonth) encompasses the current IST date, OR
 * 3. The latest active session, OR
 * 4. The latest created session.
 */
const resolveCurrentSession = async () => {
    // 1. Check manual override
    const manual = await Session.findOne({ isManualCurrent: true });
    if (manual) return manual;

    const ist = getISTDate();
    const currentYear = ist.getFullYear();
    const currentMonth = ist.getMonth() + 1; // 1-12

    const allSessions = await Session.find().sort({ startYear: -1, startMonth: -1 });
    if (!allSessions || allSessions.length === 0) {
        return null;
    }

    // 2. Find matching session by IST month/year range
    for (const session of allSessions) {
        const startTotal = session.startYear * 12 + (session.startMonth - 1);
        const endTotal = session.endYear * 12 + (session.endMonth - 1);
        const currentTotal = currentYear * 12 + (currentMonth - 1);

        if (currentTotal >= startTotal && currentTotal <= endTotal) {
            return session;
        }
    }

    // 3. Fallback to latest active session, or simply the latest session
    const active = allSessions.find(s => s.status === 'active');
    if (active) return active;

    return allSessions[0];
};

module.exports = {
    getISTDate,
    resolveCurrentSession
};
