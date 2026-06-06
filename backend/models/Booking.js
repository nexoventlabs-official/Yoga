const mongoose = require('mongoose');

/**
 * A Booking is created when a student confirms payment for a program/batch.
 * Tracks the complete W1→W5 journey state for each student.
 */
const BookingSchema = new mongoose.Schema(
  {
    // Student
    phone: { type: String, required: true, index: true },
    name: { type: String, default: '' },
    // Program & batch references
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', default: null },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
    programType: { type: String, enum: ['ttc', 'practice', 'retreat', ''], default: '' },
    programName: { type: String, default: '' },
    batchName: { type: String, default: '' },
    // Payment
    amountPaid: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'partial', 'failed'],
      default: 'pending',
      index: true,
    },
    paymentRef: { type: String, default: '' },      // Razorpay payment ID or WhatsApp pay ref
    metaReferenceId: { type: String, default: '', index: true }, // BOOKING-<_id> used for payment callbacks
    metaPaymentStatus: { type: String, default: '' }, // raw status from Meta: captured/failed/pending
    paymentTxnId: { type: String, default: '' },     // Razorpay transaction id
    bookingRef: { type: String, default: null, unique: true, sparse: true }, // HYA-2026-XXXX
    receiptPdfUrl: { type: String, default: '' },
    // Journey state
    currentFlow: {
      type: String,
      enum: ['w1', 'w2', 'w3', 'w4', 'w5', 'alumni'],
      default: 'w1',
      index: true,
    },
    // Dates for W4 countdown
    courseStartDate: { type: Date, default: null },
    courseEndDate: { type: Date, default: null },
    // W2 nurture
    w2StartDate: { type: Date, default: null },
    // Intent captured in W1
    intent: { type: String, enum: ['ttc', 'practice', 'retreat', ''], default: '' },
    // Language detected from first message
    language: { type: String, default: 'EN' },
    // Lead score
    leadScore: { type: String, enum: ['cold', 'warm', 'hot'], default: 'cold' },
  },
  { timestamps: true }
);

// Auto-generate booking ref before save
BookingSchema.pre('save', async function (next) {
  if (!this.bookingRef && this.paymentStatus === 'confirmed') {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingRef = `HYA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Booking', BookingSchema);
