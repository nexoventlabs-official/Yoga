const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const Program = require('../models/Program');
const { uploadBuffer, uploadRawBuffer, destroy } = require('../services/cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'logo') {
      if (!/^image\//.test(file.mimetype)) return cb(new Error('logo must be an image'));
    } else if (file.fieldname === 'brochure') {
      if (file.mimetype !== 'application/pdf') return cb(new Error('brochure must be a PDF'));
    }
    cb(null, true);
  },
});

const fields = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'brochure', maxCount: 1 },
]);

const router = express.Router();

/** GET /api/programs — list all programs (optionally filter by type) */
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    const programs = await Program.find(filter).sort({ type: 1, sortOrder: 1, createdAt: -1 }).lean();
    res.json({ programs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/programs/public — active programs only (used by flow endpoint) */
router.get('/public', async (req, res) => {
  try {
    const filter = { active: true };
    if (req.query.type) filter.type = req.query.type;
    const programs = await Program.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();
    res.json({ programs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/programs */
router.post('/', auth, fields, async (req, res) => {
  try {
    const { type, name, description, price, durationDays, sortOrder, active } = req.body;
    if (!type || !name) return res.status(400).json({ error: 'type and name are required' });

    let logoUrl = '', logoPublicId = '';
    let brochurePdfUrl = '', brochurePdfPublicId = '', brochurePdfName = '';

    const logoFile = req.files?.logo?.[0];
    const brochureFile = req.files?.brochure?.[0];

    if (logoFile) {
      const up = await uploadBuffer(logoFile.buffer, { folder: 'himalayan-yoga/programs/logos' });
      logoUrl = up.secure_url;
      logoPublicId = up.public_id;
    }
    if (brochureFile) {
      const up = await uploadRawBuffer(brochureFile.buffer, {
        folder: 'himalayan-yoga/programs/brochures',
        originalName: brochureFile.originalname,
      });
      brochurePdfUrl = up.secure_url;
      brochurePdfPublicId = up.public_id;
      brochurePdfName = brochureFile.originalname;
    }

    const program = await Program.create({
      type,
      name: name.trim(),
      description: (description || '').trim(),
      logoUrl,
      logoPublicId,
      brochurePdfUrl,
      brochurePdfPublicId,
      brochurePdfName,
      price: Number(price) || 0,
      durationDays: Number(durationDays) || 0,
      sortOrder: Number(sortOrder) || 0,
      active: active === 'false' ? false : true,
    });
    res.json({ program });
  } catch (err) {
    console.error('[programs] create error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/programs/:id */
router.put('/:id', auth, fields, async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) return res.status(404).json({ error: 'Not found' });

    const { type, name, description, price, durationDays, sortOrder, active } = req.body;
    if (type) program.type = type;
    if (name) program.name = name.trim();
    if (description !== undefined) program.description = description.trim();
    if (price !== undefined) program.price = Number(price) || 0;
    if (durationDays !== undefined) program.durationDays = Number(durationDays) || 0;
    if (sortOrder !== undefined) program.sortOrder = Number(sortOrder) || 0;
    if (active !== undefined) program.active = active === 'true' || active === true;

    const logoFile = req.files?.logo?.[0];
    const brochureFile = req.files?.brochure?.[0];

    if (logoFile) {
      if (program.logoPublicId) await destroy(program.logoPublicId).catch(() => {});
      const up = await uploadBuffer(logoFile.buffer, { folder: 'himalayan-yoga/programs/logos' });
      program.logoUrl = up.secure_url;
      program.logoPublicId = up.public_id;
    }
    if (brochureFile) {
      if (program.brochurePdfPublicId) await destroy(program.brochurePdfPublicId, { resource_type: 'raw' }).catch(() => {});
      const up = await uploadRawBuffer(brochureFile.buffer, {
        folder: 'himalayan-yoga/programs/brochures',
        originalName: brochureFile.originalname,
      });
      program.brochurePdfUrl = up.secure_url;
      program.brochurePdfPublicId = up.public_id;
      program.brochurePdfName = brochureFile.originalname;
    }

    await program.save();
    res.json({ program });
  } catch (err) {
    console.error('[programs] update error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/programs/:id */
router.delete('/:id', auth, async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) return res.json({ ok: true });
    if (program.logoPublicId) await destroy(program.logoPublicId).catch(() => {});
    if (program.brochurePdfPublicId) await destroy(program.brochurePdfPublicId, { resource_type: 'raw' }).catch(() => {});
    await program.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
