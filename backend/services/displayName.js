/**
 * Resolves the best display name for a phone number:
 *   1. Registered user's name (User.name)
 *   2. WhatsApp profile name captured at first contact (InboundMessage.profileName)
 *   3. Any name already stored on the record (e.g. an enquiry typed by the user)
 *   4. Fallback: 'WhatsApp User'
 *
 * Designed for batch use — pass a list of records that each have a `phone`
 * (and optionally a `name`) and get back the same list with `name` overridden
 * by the dynamically resolved value. Records with a registered User name
 * always reflect the latest registration, even on historical entries.
 */
const User = require('../models/User');
const InboundMessage = require('../models/InboundMessage');

const FALLBACK = 'WhatsApp User';

function isFallback(name) {
  return !name || !name.trim() || name.trim().toLowerCase() === FALLBACK.toLowerCase();
}

/**
 * @param {Array<{ phone: string, name?: string }>} records
 * @returns {Promise<Array>} same records with `name` resolved
 */
async function resolveNames(records) {
  if (!Array.isArray(records) || records.length === 0) return records;

  const phones = [...new Set(records.map((r) => String(r.phone || '').replace(/\D/g, '')).filter(Boolean))];
  if (phones.length === 0) return records;

  const [users, inbounds] = await Promise.all([
    User.find({ phone: { $in: phones } }, { phone: 1, name: 1 }).lean(),
    InboundMessage.find({ phone: { $in: phones } }, { phone: 1, profileName: 1 }).lean(),
  ]);

  const userByPhone = new Map(users.map((u) => [u.phone, u.name]));
  const profileByPhone = new Map(inbounds.map((i) => [i.phone, i.profileName]));

  return records.map((r) => {
    const phone = String(r.phone || '').replace(/\D/g, '');
    // 1. Registered user always wins → keeps display fresh after registration.
    const registered = userByPhone.get(phone);
    if (registered && registered.trim()) return { ...r, name: registered };

    // 2. Use the existing record's name if it's a real one (not the placeholder).
    if (!isFallback(r.name)) return r;

    // 3. Fall back to the WhatsApp profile name we captured on first contact.
    const profile = profileByPhone.get(phone);
    if (profile && profile.trim()) return { ...r, name: profile };

    // 4. Final fallback.
    return { ...r, name: FALLBACK };
  });
}

module.exports = { resolveNames, FALLBACK };
