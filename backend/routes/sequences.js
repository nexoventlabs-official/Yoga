const express = require('express');
const auth = require('../middleware/auth');
const NurtureSequence = require('../models/NurtureSequence');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.flowType) filter.flowType = req.query.flowType;
    if (req.query.status) filter.status = req.query.status;
    const sequences = await NurtureSequence.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ sequences });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pause/:id', auth, async (req, res) => {
  try {
    await NurtureSequence.findByIdAndUpdate(req.params.id, { status: 'paused' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/resume/:id', auth, async (req, res) => {
  try {
    await NurtureSequence.findByIdAndUpdate(req.params.id, { status: 'active' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cancel/:id', auth, async (req, res) => {
  try {
    await NurtureSequence.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
