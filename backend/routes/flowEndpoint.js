/**
 * WhatsApp Flow Endpoint — RSA + AES-128-GCM encrypted exchange.
 *
 * Receives INIT / data_exchange / BACK / ping actions from Meta and returns the
 * next screen with dynamic content (banners as base64, registered-user state, events, etc.).
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const flowImages = require('../services/flowImages');
const { urlToBase64 } = require('../services/imageBase64');
const User = require('../models/User');
const Event = require('../models/Event');
const Enquiry = require('../models/Enquiry');

const router = express.Router();

const LOG_PATH = path.join(__dirname, '..', 'flow-debug.log');
function dbg(...args) {
  const line =
    `[${new Date().toISOString()}] ` +
    args
      .map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2)))
      .join(' ') +
    '\n';
  try {
    fs.appendFileSync(LOG_PATH, line);
  } catch {}
  console.log('[FlowEndpoint]', ...args);
}

/* ───────── Encryption helpers ───────── */

const FLOW_PRIVATE_KEY_RAW = process.env.FLOW_PRIVATE_KEY || '';
const FLOW_PRIVATE_KEY = FLOW_PRIVATE_KEY_RAW.split('\\n').join('\n');

function decryptRequest(body) {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body || {};

  if (!FLOW_PRIVATE_KEY) {
    // Development fallback: accept plain JSON
    return { decryptedBody: body, aesKeyBuffer: null, ivBuffer: null };
  }
  if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
    throw new Error('Missing encryption fields');
  }

  const privateKey = crypto.createPrivateKey({ key: FLOW_PRIVATE_KEY, format: 'pem' });
  const aesKeyBuffer = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
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
  const decryptedBody = JSON.parse(plain.toString('utf-8'));

  return { decryptedBody, aesKeyBuffer, ivBuffer };
}

function encryptResponse(obj, aesKeyBuffer, ivBuffer) {
  if (!aesKeyBuffer || !ivBuffer) return obj; // dev plain mode

  // Flip IV bits for response
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

/* ───────── Image cache (10 min, manually invalidated on admin upload) ───────── */

let imgCache = { data: null, ts: 0 };
const IMG_TTL = 10 * 60 * 1000;

function clearImageCache() {
  imgCache = { data: null, ts: 0 };
}

async function loadImagesB64() {
  if (imgCache.data && Date.now() - imgCache.ts < IMG_TTL) return imgCache.data;

  const keys = [
    'flow_welcome_banner',
    'icon_register',
    'icon_profile',
    'icon_yoga_packages',
    'icon_training_packages',
    'icon_events',
    'icon_enquiry',
    'icon_yoga_retreats',
    'icon_sound_healing',
    'icon_special_yoga_day',
    'icon_meditation_training',
    'icon_sound_healing_training',
    'icon_yoga_training',
    'banner_register',
    'banner_profile',
    'banner_yoga_packages',
    'banner_training_packages',
    'banner_events',
    'banner_enquiry',
  ];
  const map = await flowImages.getMap(keys);

  // Convert all in parallel
  const entries = await Promise.all(
    keys.map(async (k) => {
      const url = map[k];
      if (!url) return [k, ''];
      // Icons: 200x200 square (used inside RadioButton data-source items)
      // Banners: 1000x125 (8:1 — matches the Image component dimensions in flowJson.js)
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

/* ───────── Helpers ───────── */

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

async function buildServiceList(images, isRegistered) {
  const list = [];
  if (isRegistered) {
    list.push(
      withImage(
        { id: 'profile', title: 'My Profile', description: 'View your registration details' },
        images.icon_profile
      )
    );
  } else {
    list.push(
      withImage(
        { id: 'register', title: 'Register', description: 'Join Himalayan Yoga Academy' },
        images.icon_register
      )
    );
  }
  list.push(
    withImage(
      { id: 'yoga_packages', title: 'Yoga Packages', description: 'Retreats, sound healing & more' },
      images.icon_yoga_packages
    ),
    withImage(
      { id: 'training_packages', title: 'Training Packages', description: 'Yoga, meditation & sound training' },
      images.icon_training_packages
    ),
    withImage(
      { id: 'events', title: 'Events', description: 'Upcoming events & workshops' },
      images.icon_events
    ),
    withImage(
      { id: 'enquiry', title: 'Enquiry', description: 'Send us a message' },
      images.icon_enquiry
    )
  );
  return list;
}

function buildYogaPackages(images) {
  return [
    withImage(
      { id: 'yoga_retreats', title: 'Yoga Retreats', description: 'Multi-day retreats in the Himalayas' },
      images.icon_yoga_retreats
    ),
    withImage(
      { id: 'sound_healing', title: 'Sound Healing', description: 'Restorative sound therapy sessions' },
      images.icon_sound_healing
    ),
    withImage(
      {
        id: 'special_yoga_day',
        title: 'Special Yoga Day Package',
        description: 'Curated single-day immersive package',
      },
      images.icon_special_yoga_day
    ),
  ];
}

function buildTrainingPackages(images) {
  return [
    withImage(
      { id: 'meditation_training', title: 'Meditation Training', description: 'Guided daily meditation course' },
      images.icon_meditation_training
    ),
    withImage(
      { id: 'sound_healing_training', title: 'Sound Healing', description: 'Become a certified sound healer' },
      images.icon_sound_healing_training
    ),
    withImage(
      { id: 'yoga_training', title: 'Yoga Training', description: 'Yoga teacher training program' },
      images.icon_yoga_training
    ),
  ];
}

async function buildEventsList() {
  const now = new Date();
  const events = await Event.find({ active: true, toDate: { $gte: now } })
    .sort({ fromDate: 1 })
    .limit(10)
    .lean();

  if (!events.length) return [];

  // Convert each event image to base64
  return Promise.all(
    events.map(async (ev) => {
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
    })
  );
}

/* ───────── Handler ───────── */

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

  // ping health-check
  if (action === 'ping') {
    return sendResponse(res, { data: { status: 'active' } }, aesKeyBuffer, ivBuffer);
  }

  // error notification
  if (data?.error) {
    dbg('CLIENT_ERROR', data);
    return sendResponse(res, { data: { acknowledged: true } }, aesKeyBuffer, ivBuffer);
  }

  try {
    let response;

    if (action === 'INIT') {
      response = await handleInit(flow_token);
    } else if (action === 'BACK') {
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
    const fallback = {
      screen: 'INFO',
      data: {
        info_title: 'Something went wrong',
        info_body: 'Please try again later.',
      },
    };
    return sendResponse(res, fallback, aesKeyBuffer, ivBuffer);
  }
});

function sendResponse(res, obj, aesKeyBuffer, ivBuffer) {
  // Meta data-API 3.0 requires every response to include the version.
  const payload = { version: '3.0', ...obj };
  const out = encryptResponse(payload, aesKeyBuffer, ivBuffer);
  if (typeof out === 'string') {
    res.set('Content-Type', 'text/plain');
    return res.send(out);
  }
  return res.json(out);
}

/* ───────── INIT ───────── */
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

/* ───────── data_exchange ───────── */
async function handleDataExchange({ screen, data, flow_token }) {
  const phone = phoneFromToken(flow_token);
  const images = await loadImagesB64();

  // ─── From SERVICE_SELECT — route to next screen ───
  if (screen === 'SERVICE_SELECT') {
    const sel = data?.selected_service;

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
        ? [
            `Name: ${user.name}`,
            user.email ? `Email: ${user.email}` : null,
            `WhatsApp: ${user.phone}`,
            user.dob ? `DOB: ${user.dob}` : null,
            user.gender ? `Gender: ${user.gender}` : null,
            `Member since: ${formatDate(user.registeredAt || user.createdAt)}`,
          ]
            .filter(Boolean)
            .join('\n')
        : 'No profile found. Please register first.';

      return {
        screen: 'PROFILE',
        data: {
          profile_banner: images.banner_profile || '',
          has_profile_banner: !!images.banner_profile,
          profile_info: info,
        },
      };
    }
    if (sel === 'yoga_packages') {
      return {
        screen: 'YOGA_PACKAGES',
        data: {
          yoga_banner: images.banner_yoga_packages || '',
          has_yoga_banner: !!images.banner_yoga_packages,
          packages: buildYogaPackages(images),
        },
      };
    }
    if (sel === 'training_packages') {
      return {
        screen: 'TRAINING_PACKAGES',
        data: {
          training_banner: images.banner_training_packages || '',
          has_training_banner: !!images.banner_training_packages,
          trainings: buildTrainingPackages(images),
        },
      };
    }
    if (sel === 'events') {
      const events = await buildEventsList();
      if (!events.length) {
        return {
          screen: 'INFO',
          data: {
            info_title: 'No upcoming events',
            info_body: 'There are no events scheduled right now. Please check back soon 🙏',
          },
        };
      }
      return {
        screen: 'EVENTS',
        data: {
          events_banner: images.banner_events || '',
          has_events_banner: !!images.banner_events,
          events,
        },
      };
    }
    if (sel === 'enquiry') {
      const user = phone ? await User.findOne({ phone }).lean() : null;
      return {
        screen: 'ENQUIRY',
        data: {
          enquiry_banner: images.banner_enquiry || '',
          has_enquiry_banner: !!images.banner_enquiry,
          init_phone: phone,
          init_name: user?.name || '',
        },
      };
    }
    // Unknown selection -> back to start
    return handleInit(flow_token);
  }

  // ─── REGISTER form submitted ───
  if (screen === 'REGISTER') {
    const name = (data.full_name || '').trim();
    const email = (data.email || '').trim();
    const dob = data.dob || '';
    const gender = (data.gender || '').toLowerCase();

    if (!name || !phone) {
      return {
        screen: 'INFO',
        data: { info_title: 'Missing details', info_body: 'Name and WhatsApp number are required.' },
      };
    }

    await User.findOneAndUpdate(
      { phone },
      {
        $set: {
          phone,
          name,
          email,
          dob,
          gender: ['male', 'female', 'other'].includes(gender) ? gender : '',
        },
        $setOnInsert: { registeredAt: new Date() },
      },
      { upsert: true, new: true }
    );

    return {
      screen: 'INFO',
      data: {
        info_title: '🙏 Registration successful',
        info_body: `Welcome to Himalayan Yoga Academy, ${name}!\n\nYou can come back any time and choose *My Profile* from the menu.`,
      },
    };
  }

  // ─── PROFILE close ───
  if (screen === 'PROFILE') {
    return {
      screen: 'INFO',
      data: { info_title: 'Namaste 🙏', info_body: 'Type *hi* anytime to open the menu again.' },
    };
  }

  // ─── YOGA_PACKAGES selection ───
  if (screen === 'YOGA_PACKAGES') {
    const map = {
      yoga_retreats: 'Yoga Retreats',
      sound_healing: 'Sound Healing',
      special_yoga_day: 'Special Yoga Day Package',
    };
    const title = map[data.selected_package] || 'Yoga Package';
    // Auto-record an enquiry
    const user = phone ? await User.findOne({ phone }).lean() : null;
    await Enquiry.create({
      name: user?.name || 'WhatsApp User',
      phone,
      enquiry: `Interested in Yoga Package: ${title}`,
    }).catch(() => {});

    return {
      screen: 'INFO',
      data: {
        info_title: `${title} 🧘`,
        info_body:
          `Thank you for your interest in *${title}*.\n\n` +
          `Our team will reach out shortly with details and pricing.`,
      },
    };
  }

  // ─── TRAINING_PACKAGES selection ───
  if (screen === 'TRAINING_PACKAGES') {
    const map = {
      meditation_training: 'Meditation Training',
      sound_healing_training: 'Sound Healing',
      yoga_training: 'Yoga Training',
    };
    const title = map[data.selected_training] || 'Training Package';
    const user = phone ? await User.findOne({ phone }).lean() : null;
    await Enquiry.create({
      name: user?.name || 'WhatsApp User',
      phone,
      enquiry: `Interested in Training Package: ${title}`,
    }).catch(() => {});

    return {
      screen: 'INFO',
      data: {
        info_title: `${title} 🧘‍♂️`,
        info_body:
          `Thank you for your interest in *${title}*.\n\n` +
          `Our team will reach out shortly with details and pricing.`,
      },
    };
  }

  // ─── EVENTS — pick an event ───
  if (screen === 'EVENTS') {
    const evId = data.selected_event;
    let ev = null;
    try {
      ev = await Event.findById(evId).lean();
    } catch {
      ev = null;
    }
    if (!ev) {
      return {
        screen: 'INFO',
        data: { info_title: 'Event not found', info_body: 'Please go back and try again.' },
      };
    }
    let imgB64 = '';
    if (ev.image) {
      imgB64 = await urlToBase64(ev.image, { width: 1000, height: 500, format: 'jpeg' });
    }
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

  // ─── EVENT_DETAILS — register interest ───
  if (screen === 'EVENT_DETAILS') {
    const user = phone ? await User.findOne({ phone }).lean() : null;
    await Enquiry.create({
      name: user?.name || 'WhatsApp User',
      phone,
      enquiry: 'Interested in attending an event',
    }).catch(() => {});
    return {
      screen: 'INFO',
      data: {
        info_title: '🎉 Interest noted',
        info_body: 'Thanks! Our team will follow up with full event details on WhatsApp.',
      },
    };
  }

  // ─── ENQUIRY submitted ───
  if (screen === 'ENQUIRY') {
    const name = (data.name || '').trim();
    const enquiry = (data.enquiry || '').trim();
    if (!name || !enquiry || !phone) {
      return {
        screen: 'INFO',
        data: { info_title: 'Missing details', info_body: 'Please fill in your name and enquiry.' },
      };
    }
    await Enquiry.create({ name, phone, enquiry });
    return {
      screen: 'INFO',
      data: {
        info_title: '🙏 Thank you',
        info_body: `Hi ${name}, we have received your enquiry and will get back to you soon.`,
      },
    };
  }

  // Fallback
  return {
    screen: 'INFO',
    data: { info_title: 'Namaste 🙏', info_body: 'Type *hi* to open the menu again.' },
  };
}

module.exports = router;
module.exports.clearImageCache = clearImageCache;
