const express = require('express');
const crypto = require('crypto');
const chatbot = require('../services/chatbot');
const meta = require('../services/metaCloud');
const Pdf = require('../models/Pdf');
const Program = require('../models/Program');
const Batch = require('../models/Batch');
const Booking = require('../models/Booking');
const NurtureSequence = require('../models/NurtureSequence');
const { startSequence, startW3 } = require('../services/sequenceEngine');

const router = express.Router();

/* ─── Format helpers ─── */
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildPdfBody(pdf) {
  const name = (pdf.name || '').trim();
  const desc = (pdf.description || '').trim();
  if (name && desc) return `*${name}*\n\n${desc}`;
  if (name) return `*${name}*`;
  return desc || 'Resource';
}

/* ─── Flow complete handler ─── */
async function handleFlowCompletion(msg) {
  const nfm = msg.interactive?.nfm_reply;
  if (!nfm || !nfm.response_json) return false;

  let payload = {};
  try { payload = JSON.parse(nfm.response_json) || {}; } catch { return false; }

  const phone = String(msg.from || '').replace(/\D/g, '');
  const flowId = process.env.WHATSAPP_FLOW_ID;
  const mode = String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED' ? 'published' : 'draft';

  /* ── PDF pick ── */
  if (payload.kind === 'pdf_pick' && payload.selected_pdf) {
    try {
      const pdf = await Pdf.findById(payload.selected_pdf).lean();
      if (!pdf || !pdf.pdfUrl) {
        await meta.sendText(phone, 'Sorry, that resource is no longer available.');
        return true;
      }
      const fileName = `${(pdf.name || 'document').replace(/[^\w\d-]+/g, '_').slice(0, 60)}.pdf`;
      if (flowId) {
        await meta.sendFlowMessage(phone, {
          flowId, flowCta: 'Choose Service',
          headerDocumentUrl: pdf.pdfUrl, headerDocumentFilename: fileName,
          bodyText: buildPdfBody(pdf), footerText: 'Himalayan Yoga Academy',
          flowToken: `welcome_${phone}`, mode,
        });
      } else {
        await meta.sendDocument(phone, pdf.pdfUrl, { filename: fileName, caption: buildPdfBody(pdf) });
      }
    } catch (err) {
      console.error('[webhook] PDF send failed:', err.response?.data || err.message);
      await meta.sendText(phone, 'We could not deliver the PDF right now. Please try again later.').catch(() => {});
    }
    return true;
  }

  /* ── TTC confirmed ── */
  if (payload.kind === 'ttc_confirm' && payload.selected_batch) {
    await handleProgramConfirm(phone, payload.selected_batch, 'ttc');
    return true;
  }

  /* ── Practice confirmed ── */
  if (payload.kind === 'practice_confirm' && payload.selected_batch) {
    await handleProgramConfirm(phone, payload.selected_batch, 'practice');
    return true;
  }

  /* ── Retreat confirmed ── */
  if (payload.kind === 'retreat_confirm' && payload.selected_batch) {
    await handleProgramConfirm(phone, payload.selected_batch, 'retreat');
    return true;
  }

  return false;
}

/**
 * After flow closes (terminal screen 'complete'), send ONE single message:
 *  - PDF brochure as document header + body text + Interested / Not Interested buttons
 *  - If no PDF: text header + body + buttons
 */
async function handleProgramConfirm(phone, batchId, programType) {
  try {
    const batch = await Batch.findById(batchId).lean();
    if (!batch) {
      await meta.sendText(phone, 'Sorry, we could not find that program. Please try again or send an Enquiry 🙏');
      return;
    }
    const program = await Program.findById(batch.programId).lean();
    if (!program) return;

    const price = (batch.price || program.price || 0).toLocaleString('en-IN');
    const dateStr = `${formatDate(batch.startDate)} – ${formatDate(batch.endDate)}`;
    const timing = batch.sessionTiming ? ` · ${batch.sessionTiming}` : '';
    const spotsLeft = Math.max(0, batch.spotsTotal - batch.spotsBooked);

    const body =
      `*${program.name}* 🙏\n\n` +
      `📅 ${batch.name}: ${dateStr}${timing}\n` +
      `📍 Rishikesh, Uttarakhand\n` +
      `💰 Fee: ₹${price}\n` +
      `🔢 Spots left: ${spotsLeft}\n\n` +
      `Here are the full details for your selected course. Are you interested in securing your spot?`;

    // Save/update pending booking
    const bookingDoc = await Booking.findOneAndUpdate(
      { phone, programType, batchId: batch._id, paymentStatus: 'pending' },
      {
        $set: {
          phone, programId: program._id, batchId: batch._id,
          programType: program.type, programName: program.name,
          batchName: batch.name, amountPaid: batch.price || program.price || 0,
          paymentStatus: 'pending', currentFlow: 'w1', intent: program.type,
          courseStartDate: batch.startDate, courseEndDate: batch.endDate,
        },
        $setOnInsert: { bookingRef: null },
      },
      { upsert: true, new: true }
    );

    const buttons = [
      { id: `yes_book_${bookingDoc._id}`, title: 'Interested 🙋' },
      { id: `no_later_${bookingDoc._id}`, title: 'Not Interested ❌' },
    ];

    if (program.brochurePdfUrl) {
      // Single message: PDF document header + body + buttons
      const fileName = (program.brochurePdfName || `${program.name}-Brochure.pdf`)
        .replace(/[^\w\d.\-_]+/g, '_');
      await meta.sendReplyButtonsWithDocument(phone, {
        documentUrl: program.brochurePdfUrl,
        documentFilename: fileName,
        bodyText: body,
        buttons,
        footerText: 'Himalayan Yoga Academy',
      });
    } else {
      // No PDF — plain interactive button message
      await meta.sendReplyButtons(phone, {
        headerText: 'Himalayan Yoga Academy',
        bodyText: body,
        buttons,
        footerText: 'Himalayan Yoga Academy',
      });
    }

    console.log(`[webhook] Intent message sent to ${phone} for ${program.name} – ${batch.name}`);
  } catch (err) {
    console.error('[webhook] handleProgramConfirm error:', err.message);
  }
}

/* ─── Reply button handler ─── */
async function handleReplyButton(phone, buttonId) {
  if (buttonId.startsWith('yes_book_')) {
    const bookingId = buttonId.replace('yes_book_', '');
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      await meta.sendText(phone, 'Sorry, we could not find your booking. Please type *hi* to start again 🙏');
      return;
    }

    const amount = booking.amountPaid || 0;
    const configName = process.env.META_PAYMENT_CONFIG_NAME || '';
    const useNativePay = !!(configName && amount > 0);

    if (useNativePay) {
      // Native WhatsApp Pay — order_details message
      const referenceId = `BOOKING-${booking._id}`;
      booking.metaReferenceId = referenceId;
      booking.metaPaymentStatus = 'pending';
      await booking.save();

      const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
      await meta.sendOrderDetails(phone, {
        referenceId,
        configurationName: configName,
        headerText: 'Himalayan Yoga Academy',
        bodyText:
          `*${booking.programName}*${booking.batchName ? ' — ' + booking.batchName : ''}\n\n` +
          `Complete your payment to confirm your enrollment. Your spot will be reserved once payment is received 🙏`,
        footerText: 'Himalayan Yoga Academy',
        expirationTimestamp: expiresAt,
        expirationDesc: 'Offer expires in 24 hours',
        items: [{
          name: `${booking.programName}${booking.batchName ? ' - ' + booking.batchName : ''}`.substring(0, 60),
          amount,
          quantity: 1,
        }],
        subtotal: amount,
        tax: 0,
      });

      console.log(`[webhook] Native payment request sent to ${phone} for ${booking.programName}`);
    } else {
      // Native pay not configured — send text confirmation
      const price = amount.toLocaleString('en-IN');
      const msg =
        `*Amazing! We're so happy to have you* 🎉\n\n` +
        `*${booking.programName}*${booking.batchName ? ' — ' + booking.batchName : ''}\n` +
        `💰 Total Fee: ₹${price}\n\n` +
        `Our team will reach out to you shortly with the payment link and next steps.\n\n` +
        `If you have any questions in the meantime, feel free to reply here 🙏`;
      await meta.sendText(phone, msg);
      await Booking.findByIdAndUpdate(bookingId, { currentFlow: 'w3' });
    }
  }

  if (buttonId.startsWith('no_later_')) {
    const bookingId = buttonId.replace('no_later_', '');
    const booking = await Booking.findById(bookingId).lean();

    await meta.sendText(phone, 'No problem at all! Take your time 🙏\n\nWe\'ll follow up with more info over the next few days. Type *hi* anytime to come back.');

    // Start W2 nurture after 48 hours
    const w2StartDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await startSequence({
      phone,
      flowType: 'w2',
      startDate: w2StartDate,
      bookingId: booking?._id || null,
      meta: {
        programName: booking?.programName || '',
        batchName: booking?.batchName || '',
        batchId: booking?.batchId?.toString() || '',
        brochurePdfUrl: '',
        brochurePdfName: '',
        userName: '',
      },
    });

    if (booking) {
      await Booking.findByIdAndUpdate(booking._id, { currentFlow: 'w2', w2StartDate });
    }
  }
}

/* ─── Native WhatsApp Pay — payment status handler ─── */
async function handlePaymentStatus(msg) {
  // Meta delivers payment status in multiple shapes depending on API version
  const pay = msg.payment || msg.interactive?.payment || {};
  const referenceId =
    pay.reference_id || pay.referenceId ||
    pay.transaction?.reference_id ||
    msg.interactive?.payment_status?.reference_id || '';
  const status = String(
    pay.status || pay.transaction?.status ||
    pay.payment_status || msg.interactive?.payment_status?.status || ''
  ).toLowerCase();
  const paymentId =
    pay.transaction?.id || pay.transaction_id ||
    pay.payment_id || pay.id || '';

  console.log('[webhook] payment notification', { referenceId, status, paymentId });

  if (!referenceId) return false;

  // Find booking by metaReferenceId (BOOKING-<id>)
  let booking = await Booking.findOne({ metaReferenceId: referenceId });
  if (!booking) {
    const stripped = String(referenceId).replace(/^BOOKING-/i, '');
    if (/^[a-f0-9]{24}$/i.test(stripped)) booking = await Booking.findById(stripped);
  }
  if (!booking) {
    console.warn('[webhook] no booking found for payment reference', referenceId);
    return true;
  }

  const phone = String(msg.from || '').replace(/\D/g, '');

  if (['captured', 'success', 'successful', 'paid', 'completed', 'authorized'].includes(status)) {
    await markBookingPaid(booking, { paymentId, metaPaymentStatus: status, source: 'meta_native_pay' });
    // Flip order card to completed
    try {
      await meta.sendOrderStatus(phone, {
        referenceId: booking.metaReferenceId,
        status: 'completed',
        description: '✅ Payment received! Your spot is confirmed.',
      });
    } catch (err) {
      console.warn('[webhook] sendOrderStatus failed:', err.response?.data || err.message);
    }
  } else if (['failed', 'cancelled', 'canceled', 'declined', 'error'].includes(status)) {
    booking.metaPaymentStatus = status;
    await booking.save();
    await meta.sendText(phone,
      '❌ Payment was not completed. Please try again or type *hi* to restart.\n\nIf you need help, feel free to ask 🙏'
    ).catch(() => {});
  } else {
    // pending/unknown — record for audit
    booking.metaPaymentStatus = status || booking.metaPaymentStatus;
    if (paymentId && !booking.paymentTxnId) booking.paymentTxnId = paymentId;
    await booking.save();
  }
  return true;
}

/* ─── Mark booking as paid ─── */
async function markBookingPaid(booking, opts = {}) {
  if (!booking) return false;
  if (booking.paymentStatus === 'confirmed') return false;

  booking.paymentStatus = 'confirmed';
  if (opts.paymentId) booking.paymentTxnId = opts.paymentId;
  if (opts.metaPaymentStatus) booking.metaPaymentStatus = opts.metaPaymentStatus;
  booking.currentFlow = 'w3';
  await booking.save();

  // Increment spotsBooked on the batch
  if (booking.batchId) {
    await (require('../models/Batch')).findByIdAndUpdate(
      booking.batchId,
      { $inc: { spotsBooked: 1 } }
    ).catch(() => {});
  }

  // WhatsApp confirmation (non-blocking)
  setImmediate(async () => {
    try {
      const phone = booking.phone;
      const msg =
        `✅ *Payment Confirmed!* 🎉\n\n` +
        `*${booking.programName}*${booking.batchName ? ' — ' + booking.batchName : ''}\n\n` +
        `Your enrollment is now confirmed! Welcome to Himalayan Yoga Academy 🧘\n\n` +
        `Our team will reach out with arrival details and next steps.\n\n` +
        `Booking Reference: *${booking.bookingRef || booking._id}*`;
      await meta.sendText(phone, msg);
    } catch (err) {
      console.error('[webhook] payment success message failed:', err.message);
    }
  });

  console.log('[webhook] booking marked paid', {
    bookingRef: booking.bookingRef,
    source: opts.source || '',
    paymentId: opts.paymentId || '',
  });
  return true;
}

/* ─── Webhook verification (Meta GET) ─── */
router.get('/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.META_VERIFY_TOKEN;
  if (!verifyToken) return res.sendStatus(500);
  if (mode === 'subscribe' && token === verifyToken) return res.status(200).send(challenge);
  if (!mode && !token) return res.json({ status: 'webhook active' });
  return res.sendStatus(403);
});

/* ─── Signature verification ─── */
function verifySignature(req) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false;
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !req.rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)); } catch { return false; }
}

/* ─── Webhook receiver (Meta POST) ─── */
router.post('/meta', async (req, res) => {
  res.sendStatus(200);
  if (process.env.META_APP_SECRET && !verifySignature(req)) {
    console.warn('[webhook] invalid signature');
    return;
  }
  try {
    const body = req.body || {};
    if (body.object !== 'whatsapp_business_account') return;

    // Log any payment-related payload for diagnostics
    try {
      const raw = JSON.stringify(body);
      if (raw.includes('payment') || raw.includes('order')) {
        console.log('[webhook] RAW payment-related payload:', raw);
      }
    } catch {}

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        // ── Payment status may arrive in value.statuses[] (some API versions) ──
        for (const st of value.statuses || []) {
          if (st.payment || st.type === 'payment' || st.order) {
            await handlePaymentStatus({ from: st.recipient_id || '', payment: st.payment || st, ...st })
              .catch((e) => console.error('[webhook] status payment error:', e.message));
          }
        }

        for (const msg of messages) {
          const from = msg.from;
          const profileName = contacts[0]?.profile?.name || '';
          let text = '';
          const type = msg.type;

          // ── Native pay status as top-level message type ──
          if (msg.type === 'payment') {
            await handlePaymentStatus(msg).catch((e) =>
              console.error('[webhook] payment msg error:', e.message)
            );
            continue;
          }

          if (msg.type === 'text') {
            text = msg.text?.body || '';
          } else if (msg.type === 'interactive') {
            if (msg.interactive?.type === 'nfm_reply') {
              const handled = await handleFlowCompletion(msg);
              if (handled) continue;
            }
            // ── Native pay status nested under interactive ──
            if (msg.interactive?.type === 'payment' || msg.interactive?.type === 'payment_status') {
              await handlePaymentStatus(msg).catch((e) =>
                console.error('[webhook] interactive payment error:', e.message)
              );
              continue;
            }
            // Handle reply buttons
            if (msg.interactive?.type === 'button_reply') {
              const buttonId = msg.interactive.button_reply?.id || '';
              const phone = String(from || '').replace(/\D/g, '');
              if (buttonId.startsWith('yes_book_') || buttonId.startsWith('no_later_')) {
                await handleReplyButton(phone, buttonId).catch((e) =>
                  console.error('[webhook] handleReplyButton error:', e.message)
                );
                await NurtureSequence.updateMany(
                  { phone, flowType: 'w2', status: 'active' },
                  { status: 'cancelled' }
                );
                continue;
              }
              text = msg.interactive.button_reply?.title || '';
            }
            text = text || msg.interactive?.list_reply?.title || '';
          } else if (msg.type === 'button') {
            const buttonText = msg.button?.text || '';
            const phone = String(from || '').replace(/\D/g, '');
            if (buttonText) {
              await NurtureSequence.updateMany(
                { phone, flowType: 'w2', status: 'active' },
                { status: 'cancelled' }
              );
            }
            text = buttonText;
          }

          // Cancel W2 if user sends text
          if (text && msg.type === 'text') {
            const phone = String(from || '').replace(/\D/g, '');
            const w2Active = await NurtureSequence.findOne({ phone, flowType: 'w2', status: 'active' });
            if (w2Active) {
              await NurtureSequence.updateMany({ phone, flowType: 'w2', status: 'active' }, { status: 'cancelled' });
            }
          }

          await chatbot.handleInbound({ phone: from, profileName, type, text });
        }
      }
    }
  } catch (err) {
    console.error('[webhook] handler error:', err.message);
  }
});

module.exports = router;
