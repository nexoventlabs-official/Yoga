/**
 * Drops the bookingRef_1 unique index and recreates it correctly as sparse.
 * Run once: node scripts/fix-booking-index.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const col = mongoose.connection.collection('bookings');

  // 1. Null out any empty strings still in the collection
  const fixed = await col.updateMany(
    { bookingRef: '' },
    [{ $set: { bookingRef: null } }]
  );
  console.log(`Fixed ${fixed.modifiedCount} docs with empty bookingRef`);

  // 2. Drop the old broken index
  try {
    await col.dropIndex('bookingRef_1');
    console.log('Dropped old bookingRef_1 index');
  } catch (err) {
    console.log('Index drop skipped (may not exist):', err.message);
  }

  // 3. Recreate it correctly — sparse allows multiple nulls
  await col.createIndex(
    { bookingRef: 1 },
    { unique: true, sparse: true, name: 'bookingRef_1' }
  );
  console.log('Recreated bookingRef_1 index (unique + sparse)');

  mongoose.disconnect();
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
