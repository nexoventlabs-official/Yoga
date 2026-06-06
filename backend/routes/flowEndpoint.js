/**
 * WhatsApp Flow Endpoint — RSA + AES-128-GCM encrypted exchange.
 *
 * Handles INIT / data_exchange / BACK / ping from Meta.
 * Returns dynamic screen data (programs, batches, banners, user state, events, etc.)
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const flowImages = require('../services/flowImages');
const { urlToBase64 } = require('../services/imageBase64');
const meta = require('../services/metaCloud');
const User = require('../models/User');
const Event = require('../models/Event');
const Enquiry = require('../models/Enquiry');
const Pdf = require('../models/Pdf');
const Program = require('../models/Program');
const Batch = require('../models/Batch');
const Booking = require('../models/Booking');
const NurtureSequence = require('../models/NurtureSequence');
const { startSequence } = require('../services/sequenceEngine');

const router = express.Router();

/* ─────────────────── Debug logger ─────────────────── */
const LOG_PATH = path.join(__dirname, '..', 'flow-debug.log');
function dbg(...args) {
  const line =
    `[${new Date().toISOString()}] ` +
    args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' ') +
    '\n';
  try { fs.appendFileSync(LOG_PATH, line); } catch {}
  console.log('[FlowEndpoint]', ...args);
}

/* ─────────────────── Encryption ─────────────────── */
const FLOW_PRIVATE_KEY_RAW = process.env.FLOW_PRIVATE_KEY || '';
const FLOW_PRIVATE_KEY = FLOW_PRIVATE_KEY_RAW.split('\\n').join('\n');

function decryptRequest(body) {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body || {};
  if (!FLOW_PRIVATE_KEY) {
    return { decryptedBody: body, aesKeyBuffer: null, ivBuffer: null };
  }
  if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
    throw new Error('Missing encryption fields');
  }
  const privateKey = crypto.createPrivateKey({ key: FLOW_PRIVATE_KEY, format: 'pem' });
  const aesKeyBuffer = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(encrypted_aes_key, 'base64')
  );
  const ivBuffer = Buffer.from(initial_vector, 'base64');
  const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
  const TAG_LEN = 16;
  const authTag = flowDataBuffer.slice(-TAG_LEN);
  const ciphertext = flowDataBuffer.slice(0, -TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-128-gcm', aesKeyBuffer, ivBuffer);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return { decryptedBody: JSON.parse(plain.toString('utf-8')), aesKeyBuffer, ivBuffer };
}

function encryptResponse(obj, aesKeyBuffer, ivBuffer) {
  if (!aesKeyBuffer || !ivBuffer) return obj;
  const flipped = Buffer.alloc(ivBuffer.length);
  for (let i = 0; i < ivBuffer.length; i++) flipped[i] = ~ivBuffer[i] & 0xff;
  const cipher = crypto.createCipheriv('aes-128-gcm', aesKeyBuffer, flipped);
  const out = Buffer.concat([
    cipher.update(JSON.stringify(obj), 'utf-8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return out.toString('base64');
}

/* ─────────────────── Image cache ─────────────────── */
let imgCache = { data: null, ts: 0 };
const IMG_TTL = 10 * 60 * 1000;

function clearImageCache() {
  imgCache = { data: null, ts: 0 };
}

async function loadImagesB64() {
  if (imgCache.data && Date.now() - imgCache.ts < IMG_TTL) return imgCache.data;
  const keys = [
    'flow_welcome_banner',
    'icon_register', 'icon_profile',
    'icon_ttc', 'icon_practice', 'icon_retreat',
    'icon_events', 'icon_enquiry', 'icon_pdfs',
    'banner_register', 'banner_profile',
    'banner_ttc', 'banner_practice', 'banner_retreat',
    'banner_events', 'banner_enquiry',
    'chat_welcome_header',
  ];
  const map = await flowImages.getMap(keys);
  const entries = await Promise.all(
    keys.map(async (k) => {
      const url = map[k];
      if (!url) return [k, ''];
      const isIcon = k.startsWith('icon_');
      const opts = isIcon
        ? { width: 200, height: 200, crop: 'fill', quality: 75, format: 'jpg' }
        : { width: 1000, height: 125, crop: 'fill', quality: 70, format: 'jpg' };
      const b64 = await urlToBase64(url, opts);
      return [k, b64];
    })
  );
  const data = Object.fromEntries(entries);
  imgCache = { data, ts: Date.now() };
  return data;
}

/* ─────────────────── Helpers ─────────────────── */
function withImage(item, b64) {
  if (b64) item.image = b64;
  return item;
}

function phoneFromToken(token) {
  if (!token) return '';
  return String(token).replace(/^welcome_/, '').replace(/\D/g, '');
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function flowMode() {
  return String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED'
    ? 'published' : 'draft';
}

async function buildServiceList(images, isRegistered) {
  const list = [];
  // TTC, Practice, Retreat always shown first
  list.push(
    withImage({ id: 'ttc', title: '🎓 Become a Teacher', description: 'YA-certified TTC programs in Rishikesh' }, images.icon_ttc),
    withImage({ id: 'practice', title: '🧘 Deepen Practice', description: 'Immersive yoga practice programs' }, images.icon_practice),
    withImage({ id: 'retreat', title: '🏕️ Retreat / Short Program', description: '7–26 night Himalayan retreats' }, images.icon_retreat)
  );
  if (isRegistered) {
    list.push(withImage({ id: 'profile', title: '👤 My Profile', description: 'View your registration details' }, images.icon_profile));
  } else {
    list.push(withImage({ id: 'register', title: '👤 Register', description: 'Join Himalayan Yoga Academy' }, images.icon_register));
  }
  list.push(
    withImage({ id: 'events', title: '📅 Events', description: 'Upcoming events & workshops' }, images.icon_events),
    withImage({ id: 'enquiry', title: '✉️ Enquiry', description: 'Send us a message' }, images.icon_enquiry)
  );
  const pdfCount = await Pdf.countDocuments({ active: true });
  if (pdfCount > 0) {
    list.push(withImage(
      { id: 'pdfs', title: '📄 PDF Resources', description: `${pdfCount} document${pdfCount > 1 ? 's' : ''} available` },
      images.icon_pdfs
    ));
  }
  return list;
}

/** Load active programs of a type as flow radio items (with logo as base64 image) */
async function buildProgramItems(type) {
  const programs = await Program.find({ type, active: true }).sort({ sortOrder: 1 }).lean();
  return Promise.all(programs.map(async (p) => {
    const item = {
      id: p._id.toString(),
      title: p.name.substring(0, 30),
      description: `${p.durationDays ? p.durationDays + ' days · ' : ''}₹${p.price.toLocaleString('en-IN')}`,
    };
    if (p.logoUrl) {
      const b64 = await urlToBase64(p.logoUrl, { width: 200, height: 200, crop: 'fill', quality: 75, format: 'jpg' });
      if (b64) item.image = b64;
    }
    return item;
  }));
}

/** Load active batches for a program as flow radio items */
async function buildBatchItems(programId, programType) {
  const filter = { active: true };
  if (programId) filter.programId = programId;
  if (programType) filter.programType = programType;
  const now = new Date();
  // Show batches whose end date is in the future (covers ongoing courses too)
  filter.endDate = { $gte: now };
  const batches = await Batch.find(filter).sort({ startDate: 1 }).lean();
  return batches.map((b) => {
    const spotsLeft = Math.max(0, b.spotsTotal - b.spotsBooked);
    const price = b.price || 0;
    const timing = b.sessionTiming ? ` · ${b.sessionTiming}` : '';
    return {
      id: b._id.toString(),
      title: b.name.substring(0, 30),
      description: `₹${price.toLocaleString('en-IN')}${timing} · ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`,
    };
  });
}

async function buildEventsList() {
  const now = new Date();
  const events = await Event.find({ active: true, toDate: { $gte: now } }).sort({ fromDate: 1 }).limit(10).lean();
  if (!events.length) return [];
  return Promise.all(events.map(async (ev) => {
    const item = {
      id: ev._id.toString(),
      title: ev.title.substring(0, 30),
      description: `${formatDate(ev.fromDate)} – ${formatDate(ev.toDate)}`,
    };
    if (ev.image) {
      const b64 = await urlToBase64(ev.image, { width: 200, height: 200, format: 'png' });
      if (b64) item.image = b64;
    }
    return item;
  }));
}

async function buildPdfsList() {
  const pdfs = await Pdf.find({ active: true }).sort({ createdAt: -1 }).limit(20).lean();
  return Promise.all(pdfs.map(async (p) => {
    const item = {
      id: p._id.toString(),
      title: (p.name || 'Resource').substring(0, 30),
      description: (p.description || 'PDF document').substring(0, 60),
    };
    if (p.imageUrl) {
      const b64 = await urlToBase64(p.imageUrl, { width: 200, height: 200, crop: 'fill', quality: 75, format: 'jpg' });
      if (b64) item.image = b64;
    }
    return item;
  }));
}

/** Send the post-flow intent message (PDF brochure + body + Yes/No reply buttons) */
async function sendIntentMessage(phone, { programId, batchId, programType }) {
  try {
    const program = programId ? await Program.findById(programId).lean() : null;
    const batch = batchId ? await Batch.findById(batchId).lean() : null;
    if (!program) return;

    const price = (batch?.price || program.price || 0).toLocaleString('en-IN');
    const batchName = batch?.name || '';
    const dates = batch
      ? `${formatDate(batch.startDate)} – ${formatDate(batch.endDate)}`
      : '';
    const timing = batch?.sessionTiming || '';

    let body = `*${program.name}*\n\n`;
    if (dates) body += `📅 ${batchName}${dates ? ': ' + dates : ''}${timing ? ' · ' + timing : ''}\n`;
    body += `📍 Rishikesh, Uttarakhand\n`;
    body += `💰 Fee: ₹${price}\n\n`;
    body += `Are you ready to secure your spot? 🙏`;

    const flowId = process.env.WHATSAPP_FLOW_ID;
    const mode = flowMode();

    // Store pending booking intent for Yes/No handler
    await Booking.findOneAndUpdate(
      { phone, paymentStatus: { $in: ['pending', 'failed'] }, programId },
      {
        $set: {
          phone,
          programId: program._id,
          batchId: batch?._id || null,
          programType: program.type,
          programName: program.name,
          batchName: batch?.name || '',
          amountPaid: batch?.price || program.price || 0,
          paymentStatus: 'pending',
          currentFlow: 'w1',
          intent: program.type,
        },
      },
      { upsert: true, new: true }
    );

    if (program.brochurePdfUrl && flowId) {
      await meta.sendFlowMessage(phone, {
        flowId,
        flowCta: 'Yes, Book Now',
        headerDocumentUrl: program.brochurePdfUrl,
        headerDocumentFilename: program.brochurePdfName || 'Brochure.pdf',
        bodyText: body,
        footerText: 'Himalayan Yoga Academy',
        flowToken: `welcome_${phone}`,
        mode,
      });
    } else if (flowId) {
      await meta.sendFlowMessage(phone, {
        flowId,
        flowCta: 'Yes, Book Now',
        headerText: 'Himalayan Yoga Academy',
        bodyText: body,
        footerText: 'Himalayan Yoga Academy',
        flowToken: `welcome_${phone}`,
        mode,
      });
    } else {
      await meta.sendText(phone, body);
    }

    // Also send plain reply buttons (Yes/No)
    await meta.sendReplyButtons(phone, {
      bodyText: 'Ready to confirm your booking?',
      buttons: [
        { id: 'yes_book', title: 'Yes, Book Now ✅' },
        { id: 'no_later', title: 'No, Not Yet ❌' },
      ],
    }).catch(() => {}); // graceful fallback if not supported
  } catch (err) {
    console.error('[flowEndpoint] sendIntentMessage error:', err.message);
  }
}

/* ─────────────────── Router handler ─────────────────── */
router.post('/', async (req, res) => {
  let aesKeyBuffer, ivBuffer, decryptedBody;
  try {
    ({ decryptedBody, aesKeyBuffer, ivBuffer } = decryptRequest(req.body));
  } catch (err) {
    console.error('[FlowEndpoint] decrypt failed:', err.message);
    return res.status(421).send();
  }

  const { action, screen, data, flow_token, version } = decryptedBody || {};
  dbg('REQUEST', { action, screen, flow_token, version, data });

  if (action === 'ping') {
    return sendResponse(res, { data: { status: 'active' } }, aesKeyBuffer, ivBuffer);
  }
  if (data?.error) {
    dbg('CLIENT_ERROR', data);
    return sendResponse(res, { data: { acknowledged: true } }, aesKeyBuffer, ivBuffer);
  }

  try {
    let response;
    if (action === 'INIT' || action === 'BACK') {
      response = await handleInit(flow_token);
    } else if (action === 'data_exchange') {
      response = await handleDataExchange({ screen, data, flow_token });
    } else {
      response = await handleInit(flow_token);
    }
    dbg('RESPONSE', { screen: response?.screen, dataKeys: Object.keys(response?.data || {}) });
    return sendResponse(res, response, aesKeyBuffer, ivBuffer);
  } catch (err) {
    dbg('HANDLER_ERROR', { message: err.message, stack: err.stack });
    return sendResponse(res, {
      screen: 'INFO',
      data: { info_title: 'Something went wrong', info_body: 'Please try again later.' },
    }, aesKeyBuffer, ivBuffer);
  }
});

function sendResponse(res, obj, aesKeyBuffer, ivBuffer) {
  const payload = { version: '3.0', ...obj };
  const out = encryptResponse(payload, aesKeyBuffer, ivBuffer);
  if (typeof out === 'string') {
    res.set('Content-Type', 'text/plain');
    return res.send(out);
  }
  return res.json(out);
}

/* ─────────────────── INIT ─────────────────── */
async function handleInit(flow_token) {
  const phone = phoneFromToken(flow_token);
  const images = await loadImagesB64();
  const user = phone ? await User.findOne({ phone }).lean() : null;
  const services = await buildServiceList(images, !!user);

  return {
    screen: 'SERVICE_SELECT',
    data: {
      welcome_banner: images.flow_welcome_banner || '',
      has_welcome_banner: !!images.flow_welcome_banner,
      services,
    },
  };
}

/* ─────────────────── data_exchange ─────────────────── */
async function handleDataExchange({ screen, data, flow_token }) {
  const phone = phoneFromToken(flow_token);
  const images = await loadImagesB64();

  /* ── SERVICE_SELECT routing ── */
  if (screen === 'SERVICE_SELECT') {
    const sel = data?.selected_service;

    if (sel === 'ttc') {
      const programs = await buildProgramItems('ttc');
      if (!programs.length) {
        return { screen: 'INFO', data: { info_title: 'No programs available', info_body: 'No TTC programs are listed right now. Please send an Enquiry 🙏' } };
      }
      return {
        screen: 'TTC_PROGRAM_SELECT',
        data: {
          ttc_banner: images.banner_ttc || '',
          has_ttc_banner: !!images.banner_ttc,
          programs,
        },
      };
    }

    if (sel === 'practice') {
      const programs = await buildProgramItems('practice');
      if (!programs.length) {
        return { screen: 'INFO', data: { info_title: 'No programs yet', info_body: 'Practice programs are being scheduled. Please enquire and we will reach out 🙏' } };
      }
      return {
        screen: 'PRACTICE_PROGRAM_SELECT',
        data: {
          practice_banner: images.banner_practice || '',
          has_practice_banner: !!images.banner_practice,
          programs,
        },
      };
    }

    if (sel === 'retreat') {
      const programs = await buildProgramItems('retreat');
      if (!programs.length) {
        return { screen: 'INFO', data: { info_title: 'No retreats yet', info_body: 'Retreat programs are being updated. Please enquire and we will contact you 🙏' } };
      }
      return {
        screen: 'RETREAT_PROGRAM_SELECT',
        data: {
          retreat_banner: images.banner_retreat || '',
          has_retreat_banner: !!images.banner_retreat,
          programs,
        },
      };
    }

    if (sel === 'register') {
      return {
        screen: 'REGISTER',
        data: {
          register_banner: images.banner_register || '',
          has_register_banner: !!images.banner_register,
          init_phone: phone,
        },
      };
    }

    if (sel === 'profile') {
      const user = phone ? await User.findOne({ phone }).lean() : null;
      const info = user
        ? [`Name: ${user.name}`, user.email ? `Email: ${user.email}` : null, `WhatsApp: ${user.phone}`, user.dob ? `DOB: ${user.dob}` : null, user.gender ? `Gender: ${user.gender}` : null, `Member since: ${formatDate(user.registeredAt || user.createdAt)}`].filter(Boolean).join('\n')
        : 'No profile found. Please register first.';
      return {
        screen: 'PROFILE',
        data: { profile_banner: images.banner_profile || '', has_profile_banner: !!images.banner_profile, profile_info: info },
      };
    }

    if (sel === 'events') {
      const events = await buildEventsList();
      if (!events.length) {
        return { screen: 'INFO', data: { info_title: 'No upcoming events', info_body: 'No events scheduled right now. Please check back soon 🙏' } };
      }
      return {
        screen: 'EVENTS',
        data: { events_banner: images.banner_events || '', has_events_banner: !!images.banner_events, events },
      };
    }

    if (sel === 'enquiry') {
      const user = phone ? await User.findOne({ phone }).lean() : null;
      return {
        screen: 'ENQUIRY',
        data: { enquiry_banner: images.banner_enquiry || '', has_enquiry_banner: !!images.banner_enquiry, init_phone: phone, init_name: user?.name || '' },
      };
    }

    if (sel === 'pdfs') {
      const pdfs = await buildPdfsList();
      if (!pdfs.length) {
        return { screen: 'INFO', data: { info_title: 'No resources yet', info_body: 'PDF resources will be published here soon 🙏' } };
      }
      return { screen: 'PDFS', data: { pdfs } };
    }

    return handleInit(flow_token);
  }

  /* ── TTC program picked → show batches ── */
  if (screen === 'TTC_PROGRAM_SELECT') {
    const programId = data?.selected_program;
    const batches = await buildBatchItems(programId, 'ttc');
    if (!batches.length) {
      return { screen: 'INFO', data: { info_title: 'No batches available', info_body: 'No batches are scheduled for this program right now. Please check back soon or send an Enquiry 🙏' } };
    }
    return {
      screen: 'TTC_COURSE_SELECT',
      data: {
        ttc_banner: images.banner_ttc || '',
        has_ttc_banner: !!images.banner_ttc,
        batches,
      },
    };
  }

  /* ── TTC batch picked — handled via nfm_reply in webhook (terminal screen) ── */

  /* ── Practice program picked → show sessions ── */
  if (screen === 'PRACTICE_PROGRAM_SELECT') {
    const programId = data?.selected_program;
    const program = programId ? await Program.findById(programId).lean() : null;
    const sessions = await buildBatchItems(programId, 'practice');
    if (!sessions.length) {
      return { screen: 'INFO', data: { info_title: 'No sessions available', info_body: 'No sessions are currently scheduled for this program. Please enquire 🙏' } };
    }
    return {
      screen: 'PRACTICE_SESSION_SELECT',
      data: {
        program_name: program?.name || 'Practice Program',
        sessions,
      },
    };
  }

  /* ── Practice session picked ── */
  if (screen === 'PRACTICE_SESSION_SELECT') {
    const batchId = data?.selected_session;
    const batch = batchId ? await Batch.findById(batchId).lean() : null;
    const program = batch ? await Program.findById(batch.programId).lean() : null;
    const confirmText = program
      ? `${program.name} — ${formatDate(batch?.startDate)}${batch?.sessionTiming ? ' · ' + batch.sessionTiming : ''}`
      : 'Session selected';
    return {
      screen: 'PRACTICE_CONFIRM',
      data: {
        confirm_text: confirmText,
        selected_batch: batchId || '',
        selected_program: batch?.programId?.toString() || '',
      },
    };
  }

  /* ── Retreat program picked → show dates ── */
  if (screen === 'RETREAT_PROGRAM_SELECT') {
    const programId = data?.selected_program;
    const program = programId ? await Program.findById(programId).lean() : null;
    const dates = await buildBatchItems(programId, 'retreat');
    if (!dates.length) {
      return { screen: 'INFO', data: { info_title: 'No dates available', info_body: 'No retreat dates are scheduled right now. Please enquire 🙏' } };
    }
    return {
      screen: 'RETREAT_DATE_SELECT',
      data: {
        program_name: program?.name || 'Retreat Program',
        dates,
      },
    };
  }

  /* ── Retreat date picked ── */
  if (screen === 'RETREAT_DATE_SELECT') {
    const batchId = data?.selected_date;
    const batch = batchId ? await Batch.findById(batchId).lean() : null;
    const program = batch ? await Program.findById(batch.programId).lean() : null;
    const dateStr = batch ? `${formatDate(batch.startDate)} – ${formatDate(batch.endDate)}` : '';
    const confirmText = program ? `${program.name} — ${dateStr}` : 'Retreat dates selected';
    return {
      screen: 'RETREAT_CONFIRM',
      data: {
        confirm_text: confirmText,
        selected_batch: batchId || '',
        selected_program: batch?.programId?.toString() || '',
      },
    };
  }

  /* ── REGISTER submit ── */
  if (screen === 'REGISTER') {
    const name = (data.full_name || '').trim();
    const email = (data.email || '').trim();
    const dob = data.dob || '';
    const gender = (data.gender || '').toLowerCase();
    if (!name || !phone) {
      return { screen: 'INFO', data: { info_title: 'Missing details', info_body: 'Name and WhatsApp number are required.' } };
    }
    await User.findOneAndUpdate(
      { phone },
      { $set: { phone, name, email, dob, gender: ['male', 'female', 'other'].includes(gender) ? gender : '' }, $setOnInsert: { registeredAt: new Date() } },
      { upsert: true, new: true }
    );
    return {
      screen: 'INFO',
      data: { info_title: '🙏 Registration successful', info_body: `Welcome to Himalayan Yoga Academy, ${name}!\n\nYou can come back any time and choose *My Profile* from the menu.` },
    };
  }

  /* ── PROFILE close ── */
  if (screen === 'PROFILE') {
    return { screen: 'INFO', data: { info_title: 'Namaste 🙏', info_body: 'Type *hi* anytime to open the menu again.' } };
  }

  /* ── EVENTS pick ── */
  if (screen === 'EVENTS') {
    const evId = data.selected_event;
    let ev = null;
    try { ev = await Event.findById(evId).lean(); } catch { ev = null; }
    if (!ev) {
      return { screen: 'INFO', data: { info_title: 'Event not found', info_body: 'Please go back and try again.' } };
    }
    let imgB64 = '';
    if (ev.image) imgB64 = await urlToBase64(ev.image, { width: 1000, height: 500, format: 'jpeg' });
    return {
      screen: 'EVENT_DETAILS',
      data: {
        event_image: imgB64 || '',
        has_event_image: !!imgB64,
        event_title: ev.title,
        event_meta: `${formatDate(ev.fromDate)} – ${formatDate(ev.toDate)}`,
        event_description: ev.description || '',
      },
    };
  }

  /* ── EVENT_DETAILS register interest ── */
  if (screen === 'EVENT_DETAILS') {
    const user = phone ? await User.findOne({ phone }).lean() : null;
    await Enquiry.create({ name: user?.name || 'WhatsApp User', phone, enquiry: 'Interested in attending an event' }).catch(() => {});
    return { screen: 'INFO', data: { info_title: '🎉 Interest noted', info_body: 'Thanks! Our team will follow up with full event details on WhatsApp.' } };
  }

  /* ── ENQUIRY submit ── */
  if (screen === 'ENQUIRY') {
    const name = (data.name || '').trim();
    const enquiry = (data.enquiry || '').trim();
    if (!name || !enquiry || !phone) {
      return { screen: 'INFO', data: { info_title: 'Missing details', info_body: 'Please fill in your name and enquiry.' } };
    }
    await Enquiry.create({ name, phone, enquiry });
    return { screen: 'INFO', data: { info_title: '🙏 Thank you', info_body: `Hi ${name}, we have received your enquiry and will get back to you soon.` } };
  }

  return { screen: 'INFO', data: { info_title: 'Namaste 🙏', info_body: 'Type *hi* to open the menu again.' } };
}

module.exports = router;
module.exports.clearImageCache = clearImageCache;
module.exports.sendIntentMessage = sendIntentMessage;
