/**
 * Payment routes — Razorpay webhook backup for Meta Native Pay.
 *
 * Primary confirmation: Meta `payment` message → webhook.js → markBookingPaid()
 * Backup confirmation:  Razorpay server webhook → here → markBookingPaid()
 *
 * Both paths converge on the same markBookingPaid() logic.
 *
 * Env vars needed:
 *   RAZORPAY_WEBHOOK_SECRET   — set in Razorpay Dashboard → Webhooks
 */
const express = require('express');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Batch = require('../models/Batch');
const meta = require('../services/metaCloud');

const router = express.Router();

/* ─── shared helper (also used by webhook.js) ─── */
async function findBookingByReference(referenceId) {
  if (!referenceId) return null;
  let booking = await Booking.findOne({ metaReferenceId: referenceId });
  if (booking) return booking;
  const stripped = String(referenceId).replace(/^BOOKING-/i, '');
  if (/^[a-f0-9]{24}$/i.test(stripped)) booking = await Booking.findById(stripped);
  return booking;
}

async function markBookingPaid(booking, opts = {}) {
  if (!booking || booking.paymentStatus === 'confirmed') return false;

  booking.paymentStatus = 'confirmed';
  if (opts.paymentId) booking.paymentTxnId = opts.paymentId;
  if (opts.metaPaymentStatus) booking.metaPaymentStatus = opts.metaPaymentStatus;
  booking.currentFlow = 'w3';
  await booking.save();

  // Increment spotsBooked
  if (booking.batchId) {
    await Batch.findByIdAndUpdate(booking.batchId, { $inc: { spotsBooked: 1 } }).catch(() => {});
  }

  // Send WhatsApp confirmation (non-blocking)
  setImmediate(async () => {
    try {
      const msg =
        `✅ *Payment Confirmed!* 🎉\n\n` +
        `*${booking.programName}*${booking.batchName ? ' — ' + booking.batchName : ''}\n\n` +
        `Your enrollment is now confirmed! Welcome to Himalayan Yoga Academy 🧘\n\n` +
        `Our team will reach out with arrival details and next steps.\n\n` +
        `Booking Reference: *${booking.bookingRef || booking._id}*`;
      await meta.sendText(booking.phone, msg);
    } catch (err) {
      console.error('[payment] WhatsApp confirmation failed:', err.message);
    }
  });

  console.log('[payment] booking marked paid', {
    ref: booking.bookingRef || String(booking._id),
    source: opts.source || '',
    paymentId: opts.paymentId || '',
  });
  return true;
}

/* ─── POST /api/payment/razorpay-webhook ─── */
router.post('/razorpay-webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('[payment] RAZORPAY_WEBHOOK_SECRET not set — skipping verification');
      return res.status(500).json({ error: 'webhook secret not configured' });
    }

    const signature = req.headers['x-razorpay-signature'];
    const body = req.rawBody || JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (!signature || signature !== expected) {
      console.warn('[payment] razorpay webhook: invalid signature');
      return res.status(401).json({ error: 'invalid signature' });
    }

    const event = typeof req.body === 'object' ? req.body : JSON.parse(body);
    console.log('[payment] razorpay webhook event:', event.event, event.id);

    const validEvents = ['payment_link.paid', 'payment.captured', 'order.paid'];
    if (validEvents.includes(event.event)) {
      const paymentEntity = event.payload?.payment?.entity;
      const notes = paymentEntity?.notes || event.payload?.payment_link?.entity?.notes || {};
      const paymentId = paymentEntity?.id || '';
      const referenceId = notes.reference_id || '';

      const booking = await findBookingByReference(referenceId);
      if (booking) {
        await markBookingPaid(booking, {
          paymentId,
          metaPaymentStatus: 'captured',
          source: 'razorpay_webhook',
        });
      } else {
        console.warn('[payment] no booking found for reference:', referenceId);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[payment] razorpay webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.findBookingByReference = findBookingByReference;
module.exports.markBookingPaid = markBookingPaid;
