const mongoose = require('mongoose');

/**
 * Tracks the W2 / W4 / W5 time-triggered message sequences for each student.
 * The cron worker checks this collection every hour and fires due messages.
 */
const NurtureSequenceSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    flowType: { type: String, enum: ['w2', 'w4', 'w5'], required: true },
    startDate: { type: Date, required: true }, // reference date for day calculations
    // Days whose messages have already been sent, e.g. [0, 3, 7]
    completedDays: { type: [Number], default: [] },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },
    // Snapshot of context so worker doesn't need to re-fetch
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

NurtureSequenceSchema.index({ phone: 1, flowType: 1, status: 1 });

module.exports = mongoose.model('NurtureSequence', NurtureSequenceSchema);
