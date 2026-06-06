/**
 * Drops the bookingRef_1 unique index completely.
 * bookingRef uniqueness is no longer enforced at DB level.
 * Run once: node scripts/fix-booking-index.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const col = mongoose.connection.collection('bookings');

  // 1. Null out any empty strings
  const fixed = await col.updateMany(
    { bookingRef: '' },
    [{ $set: { bookingRef: null } }]
  );
  console.log(`Fixed ${fixed.modifiedCount} docs with empty bookingRef`);

  // 2. Drop ALL indexes on bookingRef (any variant)
  try {
    const indexes = await col.indexes();
    for (const idx of indexes) {
      if (idx.key && idx.key.bookingRef !== undefined) {
        await col.dropIndex(idx.name);
        console.log(`Dropped index: ${idx.name}`);
      }
    }
  } catch (err) {
    console.log('Index drop error:', err.message);
  }

  // 3. Recreate as NON-unique sparse (just for query performance)
  await col.createIndex(
    { bookingRef: 1 },
    { sparse: true, name: 'bookingRef_1' }
  );
  console.log('Recreated bookingRef_1 as sparse (NOT unique)');

  // Verify
  const indexes = await col.indexes();
  const idx = indexes.find(i => i.name === 'bookingRef_1');
  console.log('Final index:', JSON.stringify(idx));

  mongoose.disconnect();
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
