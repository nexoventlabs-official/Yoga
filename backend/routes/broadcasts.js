const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const BroadcastCampaign = require('../models/BroadcastCampaign');
const { uploadBuffer, destroy } = require('../services/cloudinary');
const broadcastService = require('../services/broadcastService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Only image uploads allowed'));
    cb(null, true);
  },
});

const router = express.Router();

router.get('/', auth, async (_req, res) => {
  try {
    const campaigns = await BroadcastCampaign.find({}).sort({ createdAt: -1 }).lean();
    res.json({ campaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, upload.single('headerImage'), async (req, res) => {
  try {
    const {
      name, triggerType, scheduledAt, segments,
      headerType, headerUrl, headerFilename,
      bodyText, footerText, ctaLabel, language,
    } = req.body;

    if (!name || !bodyText) return res.status(400).json({ error: 'name and bodyText required' });

    let finalHeaderUrl = headerUrl || '';
    let headerPublicId = '';

    if (req.file) {
      const up = await uploadBuffer(req.file.buffer, { folder: 'himalayan-yoga/broadcasts' });
      finalHeaderUrl = up.secure_url;
      headerPublicId = up.public_id;
    }

    const campaign = await BroadcastCampaign.create({
      name: name.trim(),
      triggerType: triggerType || 'manual',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      segments: Array.isArray(segments) ? segments : (segments ? [segments] : ['all']),
      headerType: headerType || 'text',
      headerUrl: finalHeaderUrl,
      headerPublicId,
      headerFilename: headerFilename || '',
      bodyText: bodyText.trim(),
      footerText: (footerText || 'Himalayan Yoga Academy').trim(),
      ctaLabel: (ctaLabel || 'Choose Service').trim(),
      language: (language || 'EN').toUpperCase(),
    });
    res.json({ campaign });
  } catch (err) {
    console.error('[broadcasts] create error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, upload.single('headerImage'), async (req, res) => {
  try {
    const campaign = await BroadcastCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    if (campaign.status === 'sent') return res.status(400).json({ error: 'Cannot edit a sent campaign' });

    const fields = ['name', 'triggerType', 'scheduledAt', 'headerType', 'headerUrl', 'headerFilename', 'bodyText', 'footerText', 'ctaLabel', 'language'];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        campaign[f] = f === 'scheduledAt' ? (req.body[f] ? new Date(req.body[f]) : null) : req.body[f];
      }
    }
    if (req.body.segments) {
      campaign.segments = Array.isArray(req.body.segments) ? req.body.segments : [req.body.segments];
    }
    if (req.file) {
      if (campaign.headerPublicId) await destroy(campaign.headerPublicId).catch(() => {});
      const up = await uploadBuffer(req.file.buffer, { folder: 'himalayan-yoga/broadcasts' });
      campaign.headerUrl = up.secure_url;
      campaign.headerPublicId = up.public_id;
    }
    await campaign.save();
    res.json({ campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/broadcasts/:id/send — execute the campaign now */
router.post('/:id/send', auth, async (req, res) => {
  try {
    const campaign = await BroadcastCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    if (campaign.status === 'sent') return res.status(400).json({ error: 'Already sent' });

    // Fire async — don't wait for full completion
    broadcastService.executeCampaign(campaign._id.toString()).catch((e) =>
      console.error('[broadcasts] executeCampaign error:', e.message)
    );

    campaign.status = 'sending';
    await campaign.save();
    res.json({ ok: true, message: 'Broadcast started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const campaign = await BroadcastCampaign.findById(req.params.id);
    if (campaign?.headerPublicId) await destroy(campaign.headerPublicId).catch(() => {});
    await BroadcastCampaign.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
