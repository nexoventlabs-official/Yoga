require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const col = mongoose.connection.collection('bookings');
  const result = await col.updateMany(
    { bookingRef: '' },
    [{ $set: { bookingRef: null } }]   // aggregation pipeline update
  );
  console.log('Fixed', result.modifiedCount, 'bookings (empty bookingRef → null)');
  mongoose.disconnect();
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
