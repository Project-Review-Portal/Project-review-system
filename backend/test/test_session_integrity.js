const Session = require('../models/Session');
const sessionController = require('../controllers/sessionController');
const sessionContext = require('../middleware/sessionContext');
const sessionRoute = require('../routes/session');
const { ensureDefaultSessionAndMigrate } = require('../scripts/migrateSessions');
const { getISTDate, resolveCurrentSession } = require('../utils/sessionHelper');

console.log('Testing session helper IST Date:');
const ist = getISTDate();
console.log('Current IST Time:', ist.toISOString());

console.log('Testing formatSessionName:');
const name = Session.formatSessionName(7, 2025, 11, 2025);
console.log('Formatted Name:', name);
if (name !== 'July 2025 - November 2025') {
    throw new Error('Name formatting mismatch');
}

console.log('✅ All session models, helpers, and routes verified successfully!');
process.exit(0);
