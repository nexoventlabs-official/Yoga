const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Event = require('../models/Event');
const { uploadBuffer, destroy } = require('../services/cloudinary');

const router = express.Router();

router.get('/', auth, async (_req, res) => {
  const events = await Event.find({}).sort({ fromDate: 1 }).lean();
  res.json({ events });
});

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, fromDate, toDate, active } = req.body;
    if (!title || !fromDate || !toDate) return res.status(400).json({ error: 'title, fromDate, toDate required' });

    let imageUrl = '';
    let publicId = '';
    if (req.file) {
      const result = await uploadBuffer(req.file.buffer, { folder: 'himalayan-yoga/events' });
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    const ev = await Event.create({
      title: title.trim(),
      description: (description || '').trim(),
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      image: imageUrl,
      active: active === 'false' ? false : true,
    });
    // Stash publicId for later cleanup using event _id metadata channel via description? Simpler: don't track for now.
    res.json({ event: ev, publicId });
  } catch (err) {
    console.error('[events] create error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Not found' });

    const { title, description, fromDate, toDate, active } = req.body;
    if (title) ev.title = title.trim();
    if (description !== undefined) ev.description = description;
    if (fromDate) ev.fromDate = new Date(fromDate);
    if (toDate) ev.toDate = new Date(toDate);
    if (active !== undefined) ev.active = active === 'true' || active === true;

    if (req.file) {
      const result = await uploadBuffer(req.file.buffer, { folder: 'himalayan-yoga/events' });
      ev.image = result.secure_url;
    }
    await ev.save();
    res.json({ event: ev });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
