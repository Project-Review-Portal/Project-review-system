const mongoose = require('./backend/node_modules/mongoose');
const User = require('./backend/models/User');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/project-review-system');
  const result = await User.updateMany({ programme: "UG" }, { $set: { programme: "B.E. CSE" } });
  console.log(result);
  await mongoose.disconnect();
}

run();

