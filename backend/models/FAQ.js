const mongoose = require('mongoose');

/**
 * FAQ items shown in the W2 Day 12 FAQ Flow inside WhatsApp.
 * Admin manages these from the admin panel.
 */
const FAQSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    language: { type: String, default: 'EN', index: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

FAQSchema.index({ language: 1, active: 1, sortOrder: 1 });

module.exports = mongoose.model('FAQ', FAQSchema);
