/**
 * fix-indexes.js  — run once to migrate UserDocument indexes
 * Usage: node fix-indexes.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const col = mongoose.connection.collection('userdocuments');

  // Show current indexes
  const before = await col.indexes();
  console.log('\nIndexes BEFORE:');
  before.forEach(i => console.log(' ', JSON.stringify(i.key), i.unique ? '(unique)' : ''));

  // Drop the old userId+templateId unique index if it exists
  try {
    await col.dropIndex('userId_1_templateId_1');
    console.log('\n✅ Dropped old index: userId_1_templateId_1');
  } catch (e) {
    console.log('\nℹ️  Old index not found (already gone or never existed):', e.message);
  }

  // Remove documents with null email (they have no value — old orphaned records)
  const del = await col.deleteMany({ email: null });
  console.log(`🗑️  Deleted ${del.deletedCount} document(s) with email: null`);

  // Ensure the new email+templateId unique index exists
  await col.createIndex({ email: 1, templateId: 1 }, { unique: true });
  console.log('✅ Created new index: email_1_templateId_1 (unique)');

  // Show final indexes
  const after = await col.indexes();
  console.log('\nIndexes AFTER:');
  after.forEach(i => console.log(' ', JSON.stringify(i.key), i.unique ? '(unique)' : ''));

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
