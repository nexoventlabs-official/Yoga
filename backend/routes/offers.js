const express = require('express');
const auth = require('../middleware/auth');
const Offer = require('../models/Offer');

const router = express.Router();

router.get('/', auth, async (_req, res) => {
  try {
    const offers = await Offer.find({}).sort({ createdAt: -1 }).lean();
    res.json({ offers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Public — used by sequence worker to get active offer text */
router.get('/active', async (_req, res) => {
  try {
    const offer = await Offer.findOne({ active: true }).sort({ createdAt: -1 }).lean();
    res.json({ offer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, depositAmount, balanceAmount, balanceDueDays, active } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const offer = await Offer.create({
      name: name.trim(),
      description: (description || '').trim(),
      depositAmount: Number(depositAmount) || 0,
      balanceAmount: Number(balanceAmount) || 0,
      balanceDueDays: Number(balanceDueDays) || 30,
      active: active === 'false' ? false : true,
    });
    res.json({ offer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Not found' });
    const { name, description, depositAmount, balanceAmount, balanceDueDays, active } = req.body;
    if (name !== undefined) offer.name = name.trim();
    if (description !== undefined) offer.description = description.trim();
    if (depositAmount !== undefined) offer.depositAmount = Number(depositAmount) || 0;
    if (balanceAmount !== undefined) offer.balanceAmount = Number(balanceAmount) || 0;
    if (balanceDueDays !== undefined) offer.balanceDueDays = Number(balanceDueDays) || 30;
    if (active !== undefined) offer.active = active === 'true' || active === true;
    await offer.save();
    res.json({ offer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
