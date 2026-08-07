require('dotenv').config({ path: './backend/.env' });
const mongoose = require('./backend/node_modules/mongoose');
const User = require('./backend/models/User');
const MaterialSettings=require('./backend/models/MaterialSetting');
const Panel=require('./backend/models/Panel');
const Team=require('./backend/models/Team');


async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/project-review-system';
  console.log('Connecting to:', mongoUri);
  await mongoose.connect(mongoUri);
  const result1 = await User.updateMany({ programme: "UG" }, { $set: { programme: "B.E. CSE" } });
  const result2 = await MaterialSettings.updateMany({ programme: "UG" }, { $set: { programme: "B.E. CSE" } });
  const result3 = await Panel.updateMany({ programme: "UG" }, { $set: { programme: "B.E. CSE" } });
  const result4 = await Team.updateMany({ programme: "UG" }, { $set: { programme: "B.E. CSE" } });
  console.log(result1);
  console.log(result2);
  console.log(result3);
  console.log(result4);
  await mongoose.disconnect();
}

run();

