require('dotenv').config({ path: './backend/.env' });
const mongoose = require('./backend/node_modules/mongoose');
const User = require('./backend/models/User');

async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/project-review-system';
  console.log('Connecting to:', mongoUri);
  await mongoose.connect(mongoUri);
  const result = await User.updateMany({ programme: "UG" }, { $set: { programme: "B.E. CSE" } });
  console.log(result);
  await mongoose.disconnect();
}

run();

