const mongoose = require('mongoose');

/**
 * Registered yoga student.
 * Phone number = WhatsApp number (E.164 digits, no +).
 */
const UserSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    dob: { type: String, default: '' }, // ISO date string yyyy-mm-dd
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
