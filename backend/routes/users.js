const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const InboundMessage = require('../models/InboundMessage');

const router = express.Router();

/** Registered users */
router.get('/registered', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q
      ? {
          $or: [
            { name: new RegExp(q, 'i') },
            { phone: new RegExp(q, 'i') },
            { email: new RegExp(q, 'i') },
          ],
        }
      : {};
    const users = await User.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Non-registered users — anyone in InboundMessage but not in User */
router.get('/non-registered', auth, async (req, res) => {
  try {
    const registered = await User.find({}, { phone: 1 }).lean();
    const registeredPhones = new Set(registered.map((u) => u.phone));

    const inbounds = await InboundMessage.find({}).sort({ lastSeenAt: -1 }).lean();
    const list = inbounds.filter((m) => !registeredPhones.has(m.phone));
    res.json({ users: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/registered/:id', auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
