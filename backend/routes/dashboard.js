const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Event = require('../models/Event');
const Enquiry = require('../models/Enquiry');
const InboundMessage = require('../models/InboundMessage');
const { resolveNames } = require('../services/displayName');

const router = express.Router();

router.get('/stats', auth, async (_req, res) => {
  try {
    const [registered, totalContacts, events, enquiries, newEnquiries] = await Promise.all([
      User.countDocuments(),
      InboundMessage.countDocuments(),
      Event.countDocuments({ active: true }),
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ status: 'new' }),
    ]);

    const nonRegistered = Math.max(totalContacts - registered, 0);

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).lean();
    const recentEnquiriesRaw = await Enquiry.find().sort({ createdAt: -1 }).limit(5).lean();
    const recentEnquiries = await resolveNames(recentEnquiriesRaw);

    res.json({
      stats: {
        registeredUsers: registered,
        nonRegisteredUsers: nonRegistered,
        totalContacts,
        events,
        enquiries,
        newEnquiries,
      },
      recentUsers,
      recentEnquiries,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
