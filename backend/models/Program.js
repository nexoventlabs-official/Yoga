const mongoose = require('mongoose');

/**
 * A Program represents a TTC course, Practice program, or Retreat offered by
 * Himalayan Yoga Academy. Admin creates/edits programs from the admin panel.
 * The WhatsApp flow loads them dynamically to show radio-button options.
 */
const ProgramSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['ttc', 'practice', 'retreat'],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    // 1:1 logo image shown inside the WhatsApp flow radio button list
    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    // Brochure PDF sent to student after they select this program
    brochurePdfUrl: { type: String, default: '' },
    brochurePdfPublicId: { type: String, default: '' },
    brochurePdfName: { type: String, default: '' },
    // Base price in INR (can be overridden per batch)
    price: { type: Number, default: 0 },
    // Duration in days (7 / 14 / 21 / 26 / 28 etc.)
    durationDays: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProgramSchema.index({ type: 1, active: 1, sortOrder: 1 });

module.exports = mongoose.model('Program', ProgramSchema);
