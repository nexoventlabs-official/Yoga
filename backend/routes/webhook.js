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
 * After flow closes (terminal screen 'complete'), send the brochure + Yes/No message.
 * The student taps Yes → payment message, No → W2 nurture after 48hrs.
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

    const flowId = process.env.WHATSAPP_FLOW_ID;
    const mode = String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED' ? 'published' : 'draft';
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
      `Are you ready to secure your spot?`;

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
      },
      { upsert: true, new: true }
    );

    // Send brochure (if any) + body + Yes/No reply buttons
    if (program.brochurePdfUrl && flowId) {
      await meta.sendFlowMessage(phone, {
        flowId, flowCta: 'Yes, Book Now',
        headerDocumentUrl: program.brochurePdfUrl,
        headerDocumentFilename: program.brochurePdfName || 'Brochure.pdf',
        bodyText: body, footerText: 'Himalayan Yoga Academy',
        flowToken: `welcome_${phone}`, mode,
      });
    } else {
      await meta.sendText(phone, body);
    }

    // Send explicit Yes/No reply buttons after brochure
    await new Promise((r) => setTimeout(r, 1500));
    await meta.sendReplyButtons(phone, {
      bodyText: 'Tap your answer below:',
      buttons: [
        { id: `yes_book_${bookingDoc._id}`, title: '✅ Yes, Book Now' },
        { id: `no_later_${bookingDoc._id}`, title: '❌ No, Not Yet' },
      ],
    }).catch(() => {
      // sendReplyButtons may not be defined yet — handled below
      console.warn('[webhook] sendReplyButtons not available, using text fallback');
    });

    console.log(`[webhook] Intent message sent to ${phone} for ${program.name} – ${batch.name}`);
  } catch (err) {
    console.error('[webhook] handleProgramConfirm error:', err.message);
  }
}

/* ─── Reply button handler (Yes/No after brochure) ─── */
async function handleReplyButton(phone, buttonId) {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  const mode = String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED' ? 'published' : 'draft';

  if (buttonId.startsWith('yes_book_')) {
    const bookingId = buttonId.replace('yes_book_', '');
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      await meta.sendText(phone, 'Sorry, we could not find your booking. Please try again — type *hi* 🙏');
      return;
    }
    const price = (booking.amountPaid || 0).toLocaleString('en-IN');
    const body =
      `*Secure Your Spot* 💳\n\n` +
      `${booking.programName}${booking.batchName ? ' · ' + booking.batchName : ''}\n` +
      `Amount: *₹${price}*\n\n` +
      `Tap *Pay Now* to complete your booking via WhatsApp Pay.`;

    if (flowId) {
      await meta.sendFlowMessage(phone, {
        flowId, flowCta: 'Pay Now 💳',
        headerText: 'Himalayan Yoga Academy',
        bodyText: body, footerText: 'Himalayan Yoga Academy',
        flowToken: `pay_${bookingId}`, mode,
      });
    } else {
      await meta.sendText(phone, body + '\n\nOur team will send you a payment link shortly 🙏');
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

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const msg of messages) {
          const from = msg.from;
          const profileName = contacts[0]?.profile?.name || '';
          let text = '';
          const type = msg.type;

          if (msg.type === 'text') {
            text = msg.text?.body || '';
          } else if (msg.type === 'interactive') {
            if (msg.interactive?.type === 'nfm_reply') {
              const handled = await handleFlowCompletion(msg);
              if (handled) continue;
            }
            // Handle reply buttons (Yes/No after brochure)
            if (msg.interactive?.type === 'button_reply') {
              const buttonId = msg.interactive.button_reply?.id || '';
              const phone = String(from || '').replace(/\D/g, '');
              if (buttonId.startsWith('yes_book_') || buttonId.startsWith('no_later_')) {
                await handleReplyButton(phone, buttonId).catch((e) =>
                  console.error('[webhook] handleReplyButton error:', e.message)
                );
                // Cancel any active W2 sequence since user re-engaged
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
            // Cancel W2 if user replies during nurture sequence
            if (buttonText) {
              await NurtureSequence.updateMany(
                { phone, flowType: 'w2', status: 'active' },
                { status: 'cancelled' }
              );
            }
            text = buttonText;
          }

          // If user sends any text during W2, cancel W2 and re-enter W1
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
