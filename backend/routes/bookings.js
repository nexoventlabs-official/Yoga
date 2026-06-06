const express = require('express');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const Batch = require('../models/Batch');
const NurtureSequence = require('../models/NurtureSequence');

const router = express.Router();

/** GET /api/bookings — admin list */
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.paymentStatus = req.query.status;
    if (req.query.flow) filter.currentFlow = req.query.flow;
    const bookings = await Booking.find(filter)
      .populate('programId', 'name type')
      .populate('batchId', 'name startDate endDate')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/bookings/stats — dashboard counts */
router.get('/stats', auth, async (req, res) => {
  try {
    const [total, confirmed, pending, w2Active] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ paymentStatus: 'confirmed' }),
      Booking.countDocuments({ paymentStatus: 'pending' }),
      NurtureSequence.countDocuments({ flowType: 'w2', status: 'active' }),
    ]);
    res.json({ total, confirmed, pending, w2Active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/bookings/:phone — bookings for a phone number */
router.get('/:phone', auth, async (req, res) => {
  try {
    const phone = String(req.params.phone).replace(/\D/g, '');
    const bookings = await Booking.find({ phone })
      .populate('programId', 'name type')
      .populate('batchId', 'name startDate endDate')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/bookings/:id/flow — update flow state (internal / admin) */
router.patch('/:id/flow', auth, async (req, res) => {
  try {
    const { currentFlow } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { currentFlow },
      { new: true }
    );
    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
