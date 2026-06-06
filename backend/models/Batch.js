const mongoose = require('mongoose');

/**
 * A Batch is a specific scheduled run of a Program (TTC / Practice / Retreat).
 * Admin creates batches and assigns them to programs.
 * The WhatsApp flow shows available batches dynamically.
 */
const BatchSchema = new mongoose.Schema(
  {
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
    programType: { type: String, enum: ['ttc', 'practice', 'retreat'], required: true },
    name: { type: String, required: true, trim: true }, // "200hr TTC — Nov 2026"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // For practice sessions: "6:00am – 7:30am"
    sessionTiming: { type: String, default: '' },
    spotsTotal: { type: Number, default: 20 },
    spotsBooked: { type: Number, default: 0 },
    // Price (overrides program.price if set > 0)
    price: { type: Number, default: 0 },
    earlyBirdPrice: { type: Number, default: 0 },
    earlyBirdDeadline: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

BatchSchema.index({ programId: 1, active: 1, startDate: 1 });

// Virtual: spots remaining
BatchSchema.virtual('spotsLeft').get(function () {
  return Math.max(0, this.spotsTotal - this.spotsBooked);
});

module.exports = mongoose.model('Batch', BatchSchema);
