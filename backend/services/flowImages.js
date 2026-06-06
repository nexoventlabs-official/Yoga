const FlowImage = require('../models/FlowImage');

/**
 * Catalog of every image key the WhatsApp flow / chatbot expects.
 * The admin panel pulls this list and lets the user upload an image for each key.
 */
const IMAGE_KEYS = [
  // Welcome banner
  { key: 'flow_welcome_banner', label: 'Welcome Flow Banner (top of service screen)', group: 'banners' },

  // Service-screen icons — new intent icons
  { key: 'icon_ttc', label: 'Service icon: Become a Teacher (TTC)', group: 'service_icons' },
  { key: 'icon_practice', label: 'Service icon: Deepen Practice', group: 'service_icons' },
  { key: 'icon_retreat', label: 'Service icon: Retreat / Short Program', group: 'service_icons' },
  { key: 'icon_register', label: 'Service icon: Register', group: 'service_icons' },
  { key: 'icon_profile', label: 'Service icon: Profile (registered users)', group: 'service_icons' },
  { key: 'icon_events', label: 'Service icon: Events', group: 'service_icons' },
  { key: 'icon_enquiry', label: 'Service icon: Enquiry', group: 'service_icons' },
  { key: 'icon_pdfs', label: 'Service icon: PDFs / Resources', group: 'service_icons' },

  // Sub-screen banners
  { key: 'banner_ttc', label: 'Banner — Become a Teacher (TTC) screen', group: 'sub_banners' },
  { key: 'banner_practice', label: 'Banner — Deepen Practice screen', group: 'sub_banners' },
  { key: 'banner_retreat', label: 'Banner — Retreat / Short Program screen', group: 'sub_banners' },
  { key: 'banner_register', label: 'Banner — Register screen', group: 'sub_banners' },
  { key: 'banner_profile', label: 'Banner — Profile screen', group: 'sub_banners' },
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
