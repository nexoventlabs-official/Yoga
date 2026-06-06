const express = require('express');
const auth = require('../middleware/auth');
const Batch = require('../models/Batch');
const Program = require('../models/Program');

const router = express.Router();

/** GET /api/batches — all batches (admin), optionally filter by programId or type */
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.programId) filter.programId = req.query.programId;
    if (req.query.type) filter.programType = req.query.type;
    const batches = await Batch.find(filter)
      .populate('programId', 'name type')
      .sort({ startDate: 1 })
      .lean();
    res.json({ batches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/batches/public — active batches for flow (no auth) */
router.get('/public', async (req, res) => {
  try {
    const filter = { active: true };
    if (req.query.programId) filter.programId = req.query.programId;
    if (req.query.type) filter.programType = req.query.type;
    const now = new Date();
    filter.startDate = { $gte: now };
    const batches = await Batch.find(filter).sort({ startDate: 1 }).lean();
    res.json({ batches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/batches */
router.post('/', auth, async (req, res) => {
  try {
    const {
      programId, name, startDate, endDate, sessionTiming,
      spotsTotal, price, earlyBirdPrice, earlyBirdDeadline, active,
    } = req.body;

    if (!programId || !name || !startDate || !endDate) {
      return res.status(400).json({ error: 'programId, name, startDate, endDate are required' });
    }

    const program = await Program.findById(programId).lean();
    if (!program) return res.status(400).json({ error: 'Program not found' });

    const batch = await Batch.create({
      programId,
      programType: program.type,
      name: name.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      sessionTiming: sessionTiming || '',
      spotsTotal: Number(spotsTotal) || 20,
      spotsBooked: 0,
      price: Number(price) || program.price || 0,
      earlyBirdPrice: Number(earlyBirdPrice) || 0,
      earlyBirdDeadline: earlyBirdDeadline ? new Date(earlyBirdDeadline) : null,
      active: active === 'false' ? false : true,
    });
    res.json({ batch });
  } catch (err) {
    console.error('[batches] create error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/batches/:id */
router.put('/:id', auth, async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Not found' });

    const fields = ['name', 'startDate', 'endDate', 'sessionTiming', 'spotsTotal', 'price', 'earlyBirdPrice', 'earlyBirdDeadline', 'active'];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (['startDate', 'endDate', 'earlyBirdDeadline'].includes(f)) {
          batch[f] = req.body[f] ? new Date(req.body[f]) : null;
        } else if (['spotsTotal', 'price', 'earlyBirdPrice'].includes(f)) {
          batch[f] = Number(req.body[f]) || 0;
        } else if (f === 'active') {
          batch[f] = req.body[f] === 'true' || req.body[f] === true;
        } else {
          batch[f] = req.body[f];
        }
      }
    }
    await batch.save();
    res.json({ batch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/batches/:id */
router.delete('/:id', auth, async (req, res) => {
  try {
    await Batch.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
