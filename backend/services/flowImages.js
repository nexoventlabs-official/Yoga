const FlowImage = require('../models/FlowImage');

/**
 * Catalog of every image key the WhatsApp flow / chatbot expects.
 * The admin panel pulls this list and lets the user upload an image for each key.
 */
const IMAGE_KEYS = [
  // Welcome banner
  { key: 'flow_welcome_banner', label: 'Welcome Flow Banner (top of service screen)', group: 'banners' },

  // Service-screen icons
  { key: 'icon_register', label: 'Service icon: Register', group: 'service_icons' },
  { key: 'icon_profile', label: 'Service icon: Profile (registered users)', group: 'service_icons' },
  { key: 'icon_yoga_packages', label: 'Service icon: Yoga Packages', group: 'service_icons' },
  { key: 'icon_training_packages', label: 'Service icon: Training Packages', group: 'service_icons' },
  { key: 'icon_events', label: 'Service icon: Events', group: 'service_icons' },
  { key: 'icon_enquiry', label: 'Service icon: Enquiry', group: 'service_icons' },
  { key: 'icon_pdfs', label: 'Service icon: PDFs / Resources', group: 'service_icons' },

  // Yoga Packages icons
  { key: 'icon_yoga_retreats', label: 'Yoga Packages icon: Yoga Retreats', group: 'yoga_packages' },
  { key: 'icon_sound_healing', label: 'Yoga Packages icon: Sound Healing', group: 'yoga_packages' },
  { key: 'icon_special_yoga_day', label: 'Yoga Packages icon: Special Yoga Day Package', group: 'yoga_packages' },

  // Training Packages icons
  { key: 'icon_meditation_training', label: 'Training icon: Meditation Training', group: 'training_packages' },
  { key: 'icon_sound_healing_training', label: 'Training icon: Sound Healing', group: 'training_packages' },
  { key: 'icon_yoga_training', label: 'Training icon: Yoga Training', group: 'training_packages' },

  // Sub-screen banners (optional)
  { key: 'banner_register', label: 'Banner — Register screen', group: 'sub_banners' },
  { key: 'banner_profile', label: 'Banner — Profile screen', group: 'sub_banners' },
  { key: 'banner_yoga_packages', label: 'Banner — Yoga Packages screen', group: 'sub_banners' },
  { key: 'banner_training_packages', label: 'Banner — Training Packages screen', group: 'sub_banners' },
  { key: 'banner_events', label: 'Banner — Events screen', group: 'sub_banners' },
  { key: 'banner_enquiry', label: 'Banner — Enquiry screen', group: 'sub_banners' },

  // Chatbot welcome message header image (sent before the flow)
  { key: 'chat_welcome_header', label: 'Chatbot welcome-message header image', group: 'chatbot' },
];

async function ensureKeysExist() {
  for (const item of IMAGE_KEYS) {
    await FlowImage.updateOne(
      { key: item.key },
      { $setOnInsert: { key: item.key, label: item.label, url: '', publicId: '' } },
      { upsert: true }
    );
  }
}

async function getUrl(key) {
  const doc = await FlowImage.findOne({ key }).lean();
  return doc?.url || '';
}

async function getMap(keys) {
  const docs = await FlowImage.find({ key: { $in: keys } }).lean();
  const out = {};
  keys.forEach((k) => (out[k] = ''));
  docs.forEach((d) => {
    out[d.key] = d.url || '';
  });
  return out;
}

module.exports = { IMAGE_KEYS, ensureKeysExist, getUrl, getMap };
