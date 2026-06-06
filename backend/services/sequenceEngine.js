/**
 * Sequence Engine — fires W2 / W4 / W5 time-triggered WhatsApp messages.
 *
 * Called by the cron worker (scripts/sequenceWorker.js) every hour.
 * Also called directly after booking confirmation to start W3 and schedule W4.
 */
const meta = require('./metaCloud');
const flowImages = require('./flowImages');
const NurtureSequence = require('../models/NurtureSequence');
const Booking = require('../models/Booking');
const Offer = require('../models/Offer');
const Batch = require('../models/Batch');

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function daysDiff(from, to) {
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

function fmt(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function flowMode() {
  return String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED'
    ? 'published'
    : 'draft';
}

/* ─────────────────────────────────────────────
   Start a new nurture sequence
───────────────────────────────────────────── */

async function startSequence({ phone, flowType, startDate, bookingId, meta: metaData }) {
  // Cancel any existing active sequence of same type for this phone
  await NurtureSequence.updateMany(
    { phone, flowType, status: 'active' },
    { status: 'cancelled' }
  );
  const seq = await NurtureSequence.create({
    phone,
    flowType,
    bookingId: bookingId || null,
    startDate: startDate || new Date(),
    status: 'active',
    completedDays: [],
    meta: metaData || {},
  });
  return seq;
}

/* ─────────────────────────────────────────────
   W2 Messages
───────────────────────────────────────────── */

const W2_SCHEDULE = [0, 3, 7, 12, 18, 25, 35];

async function fireW2Message(phone, day, seqMeta) {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  const mode = flowMode();
  const programName = seqMeta.programName || 'our program';
  const batchName = seqMeta.batchName || '';
  const userName = seqMeta.userName || '';
  const hi = userName ? `Hi ${userName}! ` : '';

  const bannerUrl = await flowImages.getUrl('chat_welcome_header').catch(() => '');

  const sendFlowMsg = (bodyText) =>
    meta.sendFlowMessage(phone, {
      flowId,
      flowCta: 'Choose Service',
      headerImageUrl: bannerUrl || undefined,
      headerText: !bannerUrl ? 'Himalayan Yoga Academy' : undefined,
      bodyText,
      footerText: 'Himalayan Yoga Academy',
      flowToken: `welcome_${phone}`,
      mode,
    });

  switch (day) {
    case 0: {
      // Full brochure if available
      const brochureUrl = seqMeta.brochurePdfUrl;
      const brochureName = seqMeta.brochurePdfName || 'Brochure.pdf';
      const body = `${hi}Here's everything you need to decide about *${programName}* 📋\n\nNo pressure — take your time and let us know when you're ready 🙏`;
      if (brochureUrl && flowId) {
        await meta.sendFlowMessage(phone, {
          flowId,
          flowCta: 'Choose Service',
          headerDocumentUrl: brochureUrl,
          headerDocumentFilename: brochureName,
          bodyText: body,
          footerText: 'Himalayan Yoga Academy',
          flowToken: `welcome_${phone}`,
          mode,
        });
      } else {
        await meta.sendText(phone, body);
      }
      break;
    }
    case 3: {
      const body = `${hi}*"Meet Sarah from Germany who completed 200hr TTC in Nov 2025"* 🎬\n\nReal stories from real students like you.\n\nTap below to explore ${programName} 🙏`;
      if (flowId) await sendFlowMsg(body);
      else await meta.sendText(phone, body);
      break;
    }
    case 7: {
      const body = `${hi}*A day in the life at Himalayan Yoga Academy* 📸\n\nAshram · Ganga view · Practice space · Food · Community\n\nSee what awaits you 🙏`;
      if (flowId) await sendFlowMsg(body);
      else await meta.sendText(phone, body);
      break;
    }
    case 12: {
      const body = `${hi}Got questions about *${programName}*? 🤔\n\nHere are the top 7 questions students ask before joining:\n\n• Is it safe for beginners?\n• What food is served?\n• Is YA certification included?\n• What fitness level is needed?\n• Visa requirements?\n• Language barrier?\n• Accommodation?\n\nReply with any question and we'll answer personally 🙏`;
      if (flowId) await sendFlowMsg(body);
      else await meta.sendText(phone, body);
      break;
    }
    case 18: {
      // Live spot count
      let spotsMsg = '';
      if (seqMeta.batchId) {
        try {
          const b = await Batch.findById(seqMeta.batchId).lean();
          if (b) {
            const left = Math.max(0, b.spotsTotal - b.spotsBooked);
            spotsMsg = `\n\n⚠️ Only *${left} spot${left === 1 ? '' : 's'}* left in ${b.name}.`;
          }
        } catch { /* ignore */ }
      }
      const body = `${hi}Just a heads up 🙏${spotsMsg}\n\nIf you're thinking about joining ${programName ? `*${programName}*` : 'us'}, now is the time to secure your spot before it fills up.`;
      if (flowId) await sendFlowMsg(body);
      else await meta.sendText(phone, body);
      break;
    }
    case 25: {
      // Payment plan offer
      const offer = await Offer.findOne({ active: true }).sort({ createdAt: -1 }).lean();
      let offerText = '';
      if (offer) {
        offerText = `\n\n💳 *${offer.name}*\n${offer.description || `Pay ₹${offer.depositAmount.toLocaleString('en-IN')} now, balance ₹${offer.balanceAmount.toLocaleString('en-IN')} due ${offer.balanceDueDays} days before start.`}`;
      }
      const body = `${hi}Did you know we offer a flexible payment plan? 😊${offerText}\n\nMake your spot affordable and secure it today 🙏`;
      if (flowId) await sendFlowMsg(body);
      else await meta.sendText(phone, body);
      break;
    }
    case 35: {
      const body = `${hi}⏰ *Final message — Early Bird Deadline*\n\nThis is our last message to you about ${programName ? `*${programName}*` : 'our program'}.\n\nIf you've been thinking about it, this is the moment. Prices go up after this week.\n\nTap below to secure your spot 🙏`;
      if (flowId) await sendFlowMsg(body);
      else await meta.sendText(phone, body);
      break;
    }
    default:
      break;
  }
}

/* ─────────────────────────────────────────────
   W3 Booking Confirmation (fired immediately on payment)
───────────────────────────────────────────── */

async function startW3({ phone, booking }) {
  const name = booking.name || '';
  const programName = booking.programName || 'your program';
  const batchName = booking.batchName || '';
  const amountPaid = booking.amountPaid || 0;
  const bookingRef = booking.bookingRef || '';
  const receiptUrl = booking.receiptPdfUrl || '';
  const flowId = process.env.WHATSAPP_FLOW_ID;
  const mode = flowMode();

  // Instant — spot confirmed
  const instantBody =
    `🎉 *Welcome to the family, ${name}!* Spot confirmed 🙏\n\n` +
    `📋 Booking Ref: ${bookingRef}\n` +
    `🎓 Program: ${programName}\n` +
    (batchName ? `📅 Batch: ${batchName}\n` : '') +
    `💰 Amount Paid: ₹${amountPaid.toLocaleString('en-IN')}\n\n` +
    `Your receipt is attached above.`;

  try {
    if (receiptUrl && flowId) {
      await meta.sendFlowMessage(phone, {
        flowId,
        flowCta: 'View Details',
        headerDocumentUrl: receiptUrl,
        headerDocumentFilename: `Receipt-${bookingRef}.pdf`,
        bodyText: instantBody,
        footerText: 'Himalayan Yoga Academy',
        flowToken: `welcome_${phone}`,
        mode,
      });
    } else if (flowId) {
      await meta.sendFlowMessage(phone, {
        flowId,
        flowCta: 'View Details',
        headerText: 'Himalayan Yoga Academy',
        bodyText: instantBody,
        footerText: 'Himalayan Yoga Academy',
        flowToken: `welcome_${phone}`,
        mode,
      });
    } else {
      await meta.sendText(phone, instantBody);
    }
  } catch (err) {
    console.error('[sequenceEngine] W3 instant message failed:', err.message);
  }

  // +2 minutes — emotional confirmation
  setTimeout(async () => {
    try {
      const body = `✨ *You've just made a decision that changes lives.*\n\nThousands of students from 50+ countries have transformed their lives at Himalayan Yoga Academy.\n\nYou're now one of them. Welcome. 🙏`;
      await meta.sendText(phone, body);
    } catch (err) {
      console.error('[sequenceEngine] W3 +2min message failed:', err.message);
    }
  }, 2 * 60 * 1000);

  // +1 hour — document package
  setTimeout(async () => {
    try {
      const body =
        `📦 *Here's your complete pre-arrival package*\n\n` +
        `Everything you need before you arrive:\n` +
        `📚 Full syllabus\n` +
        `🍽️ Food menu & dietary requirements\n` +
        `🏠 Accommodation guide & room types\n` +
        `✈️ Travel guide (fly to Dehradun / Delhi)\n` +
        `🎒 Packing list\n` +
        `📋 Health & fitness preparation guide\n\n` +
        `We'll send each document shortly. Any questions, just reply here 🙏`;
      await meta.sendText(phone, body);
    } catch (err) {
      console.error('[sequenceEngine] W3 +1hr message failed:', err.message);
    }
  }, 60 * 60 * 1000);

  // Update booking flow state
  await Booking.findByIdAndUpdate(booking._id, { currentFlow: 'w3' }).catch(() => {});
}

/* ─────────────────────────────────────────────
   W4 Pre-Arrival (calendar-triggered, checked by cron)
───────────────────────────────────────────── */

const W4_SCHEDULE = [-38, -21, -14, -7, -2, 0];

async function fireW4Message(phone, daysBeforeStart, seqMeta) {
  const name = seqMeta.userName || '';
  const hi = name ? `Hi ${name}! ` : '';

  switch (daysBeforeStart) {
    case -38:
      await meta.sendText(phone,
        `${hi}🥗 *Start your yoga diet prep!*\n\nTransitioning to vegetarian food now will make your first week much easier.\n\nReduce caffeine too — your body will thank you 🙏`
      );
      break;
    case -21: {
      const body = `${hi}🎥 *Here's your daily practice to start now.*\n\n20 minutes each morning — your body will be ready when you arrive!\n\nYour teacher will be sending a personal video shortly 🧘`;
      await meta.sendText(phone, body);
      break;
    }
    case -14:
      await meta.sendText(phone,
        `${hi}✈️ *Travel tip:* Fly to *Dehradun (DED)*, not Delhi.\n\nWe'll arrange pickup from Dehradun airport.\n\nPlease WhatsApp us your flight details so we can coordinate pickup 🙏`
      );
      break;
    case -7:
      await meta.sendText(phone,
        `${hi}📋 *Final checklist before you arrive!*\n\n✅ Passport / ID\n✅ Visa (if required)\n✅ Travel insurance\n✅ Packing list\n✅ Diet prepared\n\nAny questions? Just reply here 🙏`
      );
      break;
    case -2:
      await meta.sendText(phone,
        `${hi}🎙️ *Just 2 days away!*\n\nYour teacher will send you a personal voice welcome message today.\n\nWe are so excited to welcome you to Rishikesh 🙏`
      );
      break;
    case 0: {
      const driverNumber = process.env.DRIVER_PHONE || 'our team';
      await meta.sendText(phone,
        `${hi}Good morning! *Today's the day!* 🧘\n\nYour driver is ready.\n\nWhatsApp *${driverNumber}* when you are 1 hour away.\n\nSee you soon! 🏔️`
      );
      break;
    }
    default:
      break;
  }
}

/* ─────────────────────────────────────────────
   W5 Post-Course (calendar-triggered, checked by cron)
───────────────────────────────────────────── */

const W5_SCHEDULE = [0, 3, 7, 30, 60];

async function fireW5Message(phone, daysAfterEnd, seqMeta) {
  const name = seqMeta.userName || '';
  const hi = name ? `Hi ${name}! ` : '';
  const bookingRef = seqMeta.bookingRef || '';
  const flowId = process.env.WHATSAPP_FLOW_ID;
  const mode = flowMode();

  switch (daysAfterEnd) {
    case 0: {
      const certBody = `🏆 *Congratulations ${name}!*\n\nYou are now a certified yoga teacher 🎓\n\nYour YA certificate (${bookingRef}) is being processed and will be posted to your address.\n\nThank you for this incredible journey with us 🙏`;
      await meta.sendText(phone, certBody);
      break;
    }
    case 3:
      await meta.sendText(phone,
        `${hi}⭐ *Could you share your experience?*\n\nYour review helps future students take this life-changing step.\n\n🔗 Google Review: ${process.env.GOOGLE_REVIEW_LINK || '(coming soon)'}\n🔗 TripAdvisor: ${process.env.TRIPADVISOR_LINK || '(coming soon)'}\n\nOne tap — means the world to us 🙏`
      );
      break;
    case 7:
      await meta.sendText(phone,
        `${hi}🎁 *Share the gift of yoga!*\n\nYour unique referral: tell a friend about Himalayan Yoga Academy and we'll give them a special welcome.\n\nYou both benefit 🙏`
      );
      break;
    case 30:
      await meta.sendText(phone,
        `Namaste ${name} 🙏\n\nHow's your teaching / practice going?\n\nWe'd love to hear from you!`
      );
      break;
    case 60: {
      const body = `${hi}*You've been teaching for 2 months.* 🎓\n\nReady for the next level?\n\n*300hr Advanced TTC — Alumni Pricing*\nRegular: ₹75,000\nYour alumni price: ₹60,000 (save ₹15,000)\n\nTap below to view the program 🙏`;
      if (flowId) {
        await meta.sendFlowMessage(phone, {
          flowId,
          flowCta: 'View 300hr Program',
          headerText: 'Himalayan Yoga Academy',
          bodyText: body,
          footerText: 'Himalayan Yoga Academy',
          flowToken: `welcome_${phone}`,
          mode,
        });
      } else {
        await meta.sendText(phone, body);
      }
      break;
    }
    default:
      break;
  }
}

/* ─────────────────────────────────────────────
   Main cron tick — called every hour
───────────────────────────────────────────── */

async function processTick() {
  const now = new Date();
  const active = await NurtureSequence.find({ status: 'active' }).lean();
  console.log(`[sequenceEngine] processTick — ${active.length} active sequences`);

  for (const seq of active) {
    try {
      const elapsed = daysDiff(new Date(seq.startDate), now);

      let schedule, fireFn;
      if (seq.flowType === 'w2') {
        schedule = W2_SCHEDULE;
        fireFn = (day) => fireW2Message(seq.phone, day, seq.meta || {});
      } else if (seq.flowType === 'w4') {
        // W4: daysBeforeStart = negative numbers, 0 = arrival day
        // elapsed here = days since (courseStartDate - 38 days) — no, we store courseStartDate in meta
        const courseStart = seq.meta?.courseStartDate ? new Date(seq.meta.courseStartDate) : null;
        if (!courseStart) continue;
        const daysFromStart = daysDiff(now, courseStart); // positive = days remaining before start
        schedule = W4_SCHEDULE;
        fireFn = (d) => fireW4Message(seq.phone, d, seq.meta || {});
        // For W4, 'd' means -38, -21, etc. (negative = days before start)
        const due = W4_SCHEDULE.filter(
          (d) => !seq.completedDays.includes(d) && -daysFromStart >= -d
        );
        for (const day of due) {
          await fireFn(day).catch((e) => console.error(`[seq] W4 day ${day} error:`, e.message));
          await NurtureSequence.findByIdAndUpdate(seq._id, {
            $addToSet: { completedDays: day },
          });
        }
        if (W4_SCHEDULE.every((d) => seq.completedDays.includes(d) || d === 0)) {
          await NurtureSequence.findByIdAndUpdate(seq._id, { status: 'completed' });
        }
        continue;
      } else if (seq.flowType === 'w5') {
        schedule = W5_SCHEDULE;
        fireFn = (day) => fireW5Message(seq.phone, day, seq.meta || {});
      } else {
        continue;
      }

      const due = schedule.filter((d) => !seq.completedDays.includes(d) && elapsed >= d);
      for (const day of due) {
        await fireFn(day).catch((e) => console.error(`[seq] ${seq.flowType} day ${day} error:`, e.message));
        await NurtureSequence.findByIdAndUpdate(seq._id, {
          $addToSet: { completedDays: day },
        });
        console.log(`[seq] Fired ${seq.flowType} day ${day} → ${seq.phone}`);
      }

      // Check completion
      if (schedule.every((d) => (seq.completedDays.includes(d) || due.includes(d)))) {
        const allDone = schedule.every(
          (d) => seq.completedDays.includes(d) || due.includes(d)
        );
        if (allDone) {
          await NurtureSequence.findByIdAndUpdate(seq._id, { status: 'completed' });
          // Advance booking flow state
          if (seq.bookingId) {
            const nextFlow = seq.flowType === 'w2' ? 'w2' : seq.flowType === 'w4' ? 'w5' : 'alumni';
            if (seq.flowType === 'w5') {
              await Booking.findByIdAndUpdate(seq.bookingId, { currentFlow: 'alumni' });
            }
          }
        }
      }
    } catch (err) {
      console.error(`[sequenceEngine] error for seq ${seq._id}:`, err.message);
    }
  }
}

module.exports = {
  startSequence,
  startW3,
  fireW2Message,
  fireW4Message,
  fireW5Message,
  processTick,
  W2_SCHEDULE,
  W4_SCHEDULE,
  W5_SCHEDULE,
};
