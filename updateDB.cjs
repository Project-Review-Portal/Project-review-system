require('dotenv').config({ path: './backend/.env' });
const mongoose = require('./backend/node_modules/mongoose');
const User = require('./backend/models/User');
const MaterialSettings=require('./backend/models/MaterialSetting');
const Panel=require('./backend/models/Panel');
const Team=require('./backend/models/Team');
const Config = require('./backend/models/Config');
const Programme = require('./backend/models/Programme');

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

  // Migrate legacy Config docs without a programme field -> set to B.E. CSE
  const legacyConfigs = await Config.updateMany(
    { programme: { $exists: false } },
    { $set: { programme: 'B.E. CSE' } }
  );
  console.log('Migrated legacy Config docs:', legacyConfigs);

  // Ensure default Config exists for B.E. CSE (create only if it doesn't exist)
  const beCseConfig = await Config.findOne({ programme: 'B.E. CSE' });
  if (!beCseConfig) {
    await Config.create({
      programme: 'B.E. CSE',
      maxTeamSize: 4,
      numReviews: 3,
      vivaRequired: true,
      teamFormationOpen: true
    });
    console.log('Created default Config doc for B.E. CSE');
  }

  // Ensure Config doc exists for each registered Programme (create only if it doesn't exist)
  const programmes = await Programme.find();
  for (const pg of programmes) {
    const existing = await Config.findOne({ programme: pg.name });
    if (!existing) {
      await Config.create({
        programme: pg.name,
        maxTeamSize: 4,
        numReviews: 3,
        vivaRequired: true,
        teamFormationOpen: true
      });
      console.log(`Created Config doc for programme: ${pg.name}`);
    }
  }
  console.log(`Checked Config docs for ${programmes.length} programmes.`);

  await mongoose.disconnect();
}

run();

