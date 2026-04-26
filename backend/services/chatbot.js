const meta = require('./metaCloud');
const flowImages = require('./flowImages');
const InboundMessage = require('../models/InboundMessage');

const GREETING_RE = /^(hi+|h?ello+|hey+|hai+|namaste|namaskar|namaskaram|start|menu|services|help)\b/i;

function isGreeting(text) {
  if (!text) return false;
  const t = String(text).trim();
  if (!t) return false;
  return GREETING_RE.test(t);
}

/**
 * Track every contact who messages the bot. Used by the admin "Non-Registered Users" list
 * (we filter out anyone who has a matching User record at query time).
 */
async function trackInbound({ phone, profileName, text }) {
  if (!phone) return;
  try {
    await InboundMessage.findOneAndUpdate(
      { phone },
      {
        $setOnInsert: { firstSeenAt: new Date() },
        $set: {
          profileName: profileName || '',
          lastSeenAt: new Date(),
          lastMessage: (text || '').slice(0, 500),
        },
        $inc: { messageCount: 1 },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[chatbot] trackInbound failed:', err.message);
  }
}

/**
 * Send the welcome flow message: image header + body + CTA "Choose Service".
 */
async function sendWelcomeFlow(phone) {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!flowId) {
    await meta.sendText(
      phone,
      'Welcome to Himalayan Yoga Academy 🧘\n\nOur booking flow is being set up. Please try again soon.'
    );
    return;
  }

  const banner = await flowImages.getUrl('chat_welcome_header');
  const mode =
    String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED'
      ? 'published'
      : 'draft';

  await meta.sendFlowMessage(phone, {
    flowId,
    flowCta: 'Choose Service',
    headerImageUrl: banner || undefined,
    headerText: !banner ? 'Himalayan Yoga Academy' : undefined,
    bodyText:
      'Namaste 🙏\n\nWelcome to *Himalayan Yoga Academy*. Tap *Choose Service* below to register, explore yoga & training packages, browse events or send us an enquiry.',
    footerText: 'Himalayan Yoga Academy',
    flowToken: `welcome_${phone}`,
    mode,
  });
}

/**
 * Main inbound handler. Called from the webhook.
 */
async function handleInbound({ phone, profileName, type, text }) {
  await trackInbound({ phone, profileName, text });

  // Treat any greeting (or generic first message) as request for the welcome flow.
  if (isGreeting(text) || !text) {
    try {
      await sendWelcomeFlow(phone);
    } catch (err) {
      console.error('[chatbot] sendWelcomeFlow failed:', err.response?.data || err.message);
      await meta.sendText(
        phone,
        'Welcome to Himalayan Yoga Academy 🧘 — please type *hi* to see our services.'
      ).catch(() => {});
    }
    return;
  }

  // Otherwise just acknowledge and prompt.
  await meta.sendText(
    phone,
    `Namaste 🙏\n\nType *hi* to open the menu and choose a service.`
  ).catch(() => {});
}

module.exports = { handleInbound, sendWelcomeFlow, isGreeting, trackInbound };
