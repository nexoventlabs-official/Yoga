/**
 * Broadcast Service — sends W6 campaigns to segmented lead lists.
 */
const meta = require('./metaCloud');
const BroadcastCampaign = require('../models/BroadcastCampaign');
const Booking = require('../models/Booking');
const InboundMessage = require('../models/InboundMessage');

/**
 * Build recipient phone list based on campaign segments.
 * Segments: cold | warm | alumni | all
 */
async function buildRecipients(segments) {
  const phones = new Set();

  const includeAll = segments.includes('all');

  if (includeAll || segments.includes('cold')) {
    // Cold: inbound contacts who have no confirmed booking and are not in W2/W3+
    const coldBookingPhones = new Set(
      (await Booking.find({}, 'phone').lean()).map((b) => b.phone)
    );
    const inbounds = await InboundMessage.find({}, 'phone').lean();
    for (const i of inbounds) {
      if (!coldBookingPhones.has(i.phone)) phones.add(i.phone);
    }
  }

  if (includeAll || segments.includes('warm')) {
    // Warm: bookings currently in w1 or w2
    const warm = await Booking.find({ currentFlow: { $in: ['w1', 'w2'] } }, 'phone').lean();
    for (const b of warm) phones.add(b.phone);
  }

  if (includeAll || segments.includes('alumni')) {
    // Alumni: completed course (w5 or alumni flow)
    const alumni = await Booking.find({ currentFlow: { $in: ['w5', 'alumni'] } }, 'phone').lean();
    for (const b of alumni) phones.add(b.phone);
  }

  return [...phones];
}

async function executeCampaign(campaignId) {
  const campaign = await BroadcastCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  campaign.status = 'sending';
  await campaign.save();

  const flowId = process.env.WHATSAPP_FLOW_ID;
  const mode =
    String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED'
      ? 'published'
      : 'draft';

  let recipients;
  try {
    recipients = await buildRecipients(campaign.segments);
  } catch (err) {
    campaign.status = 'failed';
    await campaign.save();
    throw err;
  }

  let sentCount = 0;
  let failCount = 0;

  for (const phone of recipients) {
    try {
      if (flowId) {
        const opts = {
          flowId,
          flowCta: campaign.ctaLabel || 'Choose Service',
          bodyText: campaign.bodyText,
          footerText: campaign.footerText || 'Himalayan Yoga Academy',
          flowToken: `welcome_${phone}`,
          mode,
        };
        if (campaign.headerType === 'image' && campaign.headerUrl) {
          opts.headerImageUrl = campaign.headerUrl;
        } else if (campaign.headerType === 'document' && campaign.headerUrl) {
          opts.headerDocumentUrl = campaign.headerUrl;
          opts.headerDocumentFilename = campaign.headerFilename || 'Document.pdf';
        } else {
          opts.headerText = 'Himalayan Yoga Academy';
        }
        await meta.sendFlowMessage(phone, opts);
      } else {
        await meta.sendText(phone, campaign.bodyText);
      }
      sentCount++;
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`[broadcastService] failed for ${phone}:`, err.response?.data || err.message);
      failCount++;
    }
  }

  campaign.status = 'sent';
  campaign.sentCount = sentCount;
  campaign.failCount = failCount;
  campaign.sentAt = new Date();
  await campaign.save();

  console.log(`[broadcastService] Campaign "${campaign.name}" done: ${sentCount} sent, ${failCount} failed`);
  return { sentCount, failCount };
}

module.exports = { executeCampaign, buildRecipients };
