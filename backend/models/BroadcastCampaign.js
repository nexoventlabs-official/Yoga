const mongoose = require('mongoose');

/**
 * W6 Broadcast Campaign — admin creates and sends to one or more lead segments.
 */
const BroadcastCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    triggerType: {
      type: String,
      enum: ['season_opening', 'batch_launch', 'new_year', 'milestone', 'manual'],
      default: 'manual',
    },
    scheduledAt: { type: Date, default: null },
    // Target segments
    segments: {
      type: [String],
      enum: ['cold', 'warm', 'alumni', 'all'],
      default: ['all'],
    },
    // Message content
    headerType: { type: String, enum: ['image', 'video', 'document', 'text'], default: 'text' },
    headerUrl: { type: String, default: '' }, // Cloudinary URL of image/video/doc
    headerPublicId: { type: String, default: '' },
    headerFilename: { type: String, default: '' },
    bodyText: { type: String, default: '' },
    footerText: { type: String, default: 'Himalayan Yoga Academy' },
    ctaLabel: { type: String, default: 'Choose Service' },
    language: { type: String, default: 'EN' },
    // Execution tracking
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
      default: 'draft',
      index: true,
    },
    sentCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BroadcastCampaign', BroadcastCampaignSchema);
