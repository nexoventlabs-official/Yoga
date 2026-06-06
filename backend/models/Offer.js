const mongoose = require('mongoose');

/**
 * Payment plan offers shown on W2 Day 25 to students who haven't booked.
 * Admin creates/edits offers from the admin panel.
 */
const OfferSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // "3-Installment Plan"
    description: { type: String, default: '', trim: true }, // shown in the WhatsApp message
    depositAmount: { type: Number, default: 0 }, // ₹15,000
    balanceAmount: { type: Number, default: 0 }, // ₹30,000
    balanceDueDays: { type: Number, default: 30 }, // days before course start
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Offer', OfferSchema);
