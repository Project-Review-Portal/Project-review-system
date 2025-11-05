/*
Backfill script for TimeTable.slotType
Usage (PowerShell):
  node backend\scripts\backfillSlotType.js --apply    # actually update DB
  node backend\scripts\backfillSlotType.js           # dry-run: shows what would be changed

This script connects to the same MongoDB as the app (uses ../config/db.js or MONGO_URL env).
It finds TimeTable documents where slotType is missing and attempts to infer the slotType from name/description/type.
It will print a summary and only modify documents when --apply is passed.
*/

const mongoose = require('mongoose');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  // Try to load project DB config if available
  let mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  try {
    // attempt to read backend/config/db.js for a connection string export
    const configPath = path.resolve(__dirname, '..', 'config', 'db.js');
    // If file exists, require it to ensure env or setup is correct
    // Many projects use environment variables; we won't rely on requiring it for the URL
    // but we want to ensure the project folder is accessible.
    // eslint-disable-next-line global-require
    require(configPath);
  } catch (e) {
    // ignore
  }

  if (!mongoUrl) {
    // fallback local default used by the app (should be changed by user)
    mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/projectreview';
  }

  console.log('Connecting to MongoDB:', mongoUrl);
  await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  const TimeTable = require('../models/TimeTable');

  const docs = await TimeTable.find({ $or: [ { slotType: { $exists: false } }, { slotType: null }, { slotType: '' } ] }).limit(1000);
  console.log(`Found ${docs.length} TimeTable docs with missing slotType (showing up to 1000).`);

  if (docs.length === 0) {
    console.log('Nothing to do. Exiting.');
    process.exit(0);
  }

  const infer = (doc) => {
    const fields = [];
    if (doc.name) fields.push(doc.name.toString().toLowerCase());
    if (doc.description) fields.push(doc.description.toString().toLowerCase());
    if (doc.type) fields.push(doc.type.toString().toLowerCase());
    const txt = fields.join(' ');
    if (!txt) return null;
    if (/review\s*1|review1|r1|1st review|first review/.test(txt)) return 'review1';
    if (/review\s*2|review2|r2|2nd review|second review/.test(txt)) return 'review2';
    if (/review\s*3|review3|r3|3rd review|third review/.test(txt)) return 'review3';
    if (/viva|viva\s*voce|viva-voce/.test(txt)) return 'viva';
    return null;
  };

  const updates = [];
  for (const d of docs) {
    const inferred = infer(d);
    updates.push({ id: d._id.toString(), inferred, name: d.name || '', description: d.description || '', type: d.type || '' });
  }

  // Print a summary
  console.log('\nSample inference results:');
  updates.slice(0, 20).forEach(u => console.log(`  ${u.id} -> ${u.inferred || 'UNDETERMINED'}  (name="${u.name}")`));

  if (!apply) {
    console.log('\nDry run complete. To apply the updates run:');
    console.log('  node backend\\scripts\\backfillSlotType.js --apply');
    process.exit(0);
  }

  console.log('\nApplying updates...');
  let applied = 0;
  for (const u of updates) {
    if (!u.inferred) continue;
    try {
      const res = await TimeTable.updateOne({ _id: u.id }, { $set: { slotType: u.inferred } });
      if (res.modifiedCount && res.modifiedCount > 0) applied++;
    } catch (e) {
      console.warn('Failed to update', u.id, e.message);
    }
  }

  console.log(`Applied updates to ${applied} documents.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
