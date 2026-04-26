/**
 * Re-seed the admin user (uses ADMIN_USERNAME / ADMIN_PASSWORD from .env).
 * Useful if you forgot the password.
 *
 * Usage: npm run seed:admin
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin';
  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await Admin.findOneAndUpdate(
    { username },
    { $set: { passwordHash, role: 'superadmin' } },
    { upsert: true, new: true }
  );
  console.log('✅ Admin upserted:', { username: updated.username, role: updated.role });
  await mongoose.disconnect();
})();
