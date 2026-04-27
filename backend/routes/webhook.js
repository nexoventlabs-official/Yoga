const express = require('express');
const crypto = require('crypto');
const chatbot = require('../services/chatbot');
const meta = require('../services/metaCloud');
const Pdf = require('../models/Pdf');

/** Compose the caption for a delivered PDF (name + gap + description). */
function buildPdfCaption(pdf) {
  const name = (pdf.name || '').trim();
  const desc = (pdf.description || '').trim();
  if (name && desc) return `${name}\n\n${desc}`;
  return name || desc || 'Resource';
}

const router = express.Router();

/**
 * Handle a Flow `complete` callback (interactive.nfm_reply).
 * Extracts the JSON form payload and dispatches the matching follow-up
 * message (currently: sending a chosen PDF as a WhatsApp document).
 *
 * Returns true if the message was handled here and should NOT be forwarded
 * to the regular chatbot.handleInbound() pipeline.
 */
async function handleFlowCompletion(msg) {
  const nfm = msg.interactive?.nfm_reply;
  if (!nfm || !nfm.response_json) return false;

  let payload = {};
  try {
    payload = JSON.parse(nfm.response_json) || {};
  } catch {
    return false;
  }

  // PDF pick → send the selected PDF as a document.
  if (payload.kind === 'pdf_pick' && payload.selected_pdf) {
    const phone = String(msg.from || '').replace(/\D/g, '');
    try {
      const pdf = await Pdf.findById(payload.selected_pdf).lean();
      if (!pdf || !pdf.pdfUrl) {
        await meta.sendText(phone, 'Sorry, that resource is no longer available.');
        return true;
      }
      const fileName =
        `${(pdf.name || 'document').replace(/[^\w\d-]+/g, '_').slice(0, 60)}.pdf`;
      await meta.sendDocument(phone, pdf.pdfUrl, {
        filename: fileName,
        caption: buildPdfCaption(pdf),
      });
      console.log('[webhook] PDF sent', { to: phone, pdfId: payload.selected_pdf, name: pdf.name });

      // Follow-up: re-send the welcome flow card so the user sees the
      // "Choose Service" button and can navigate the menu again.
      try {
        await chatbot.sendWelcomeFlow(phone);
      } catch (err) {
        console.error('[webhook] follow-up welcome flow failed:', err.response?.data || err.message);
      }
    } catch (err) {
      console.error('[webhook] PDF send failed:', err.response?.data || err.message);
      try {
        await meta.sendText(phone, 'We could not deliver the PDF right now. Please try again later.');
      } catch {}
    }
    return true;
  }

  return false;
}

/* ─── Webhook verification (Meta GET) ─── */
router.get('/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.META_VERIFY_TOKEN;
  if (!verifyToken) return res.sendStatus(500);

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  if (!mode && !token) {
    return res.json({ status: 'webhook active' });
  }
  return res.sendStatus(403);
});

/* ─── Signature verification ─── */
function verifySignature(req) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false;
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !req.rawBody) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/* ─── Webhook receiver (Meta POST) ─── */
router.post('/meta', async (req, res) => {
  // Acknowledge immediately so Meta doesn't retry
  res.sendStatus(200);

  // Signature check (skip in dev if no secret)
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
          let type = msg.type;

          if (msg.type === 'text') text = msg.text?.body || '';
          else if (msg.type === 'interactive') {
            // Flow `complete` callbacks arrive as interactive.nfm_reply — handle
            // them here (e.g. PDF delivery) and skip the regular chatbot flow.
            if (msg.interactive?.type === 'nfm_reply') {
              const handled = await handleFlowCompletion(msg);
              if (handled) continue;
            }
            text = msg.interactive?.button_reply?.title ||
              msg.interactive?.list_reply?.title || '';
          } else if (msg.type === 'button') {
            text = msg.button?.text || '';
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
