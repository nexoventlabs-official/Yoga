const mongoose = require('mongoose');

/**
 * Tracks every WhatsApp contact who has messaged the bot, even if they never registered.
 * Used by the admin "Non-Registered Users" page.
 */
const InboundMessageSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    profileName: { type: String, default: '' },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 1 },
    lastMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InboundMessage', InboundMessageSchema);
