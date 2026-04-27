const express = require('express');
const auth = require('../middleware/auth');
const Enquiry = require('../models/Enquiry');
const { resolveNames } = require('../services/displayName');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const items = await Enquiry.find(filter).sort({ createdAt: -1 }).lean();
  const enquiries = await resolveNames(items);
  res.json({ enquiries });
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const { status, notes } = req.body || {};
    const update = {};
    if (status && ['new', 'in_progress', 'resolved'].includes(status)) update.status = status;
    if (notes !== undefined) update.notes = notes;
    const item = await Enquiry.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ enquiry: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  await Enquiry.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
