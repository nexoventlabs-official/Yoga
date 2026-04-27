const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const Pdf = require('../models/Pdf');
const { uploadBuffer, uploadRawBuffer, destroy } = require('../services/cloudinary');

// Lazy require to avoid circular dependency with flowEndpoint module
function bustFlowCache() {
  try {
    const fe = require('./flowEndpoint');
    if (typeof fe.clearImageCache === 'function') fe.clearImageCache();
  } catch {
    /* ignore */
  }
}

// Local multer that accepts both image (icon) and pdf in one multipart request.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max per file
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'image') {
      if (!/^image\//.test(file.mimetype)) return cb(new Error('icon must be an image'));
    } else if (file.fieldname === 'pdf') {
      if (file.mimetype !== 'application/pdf') return cb(new Error('pdf must be application/pdf'));
    }
    cb(null, true);
  },
});

const fields = upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

const router = express.Router();

router.get('/', auth, async (_req, res) => {
  const pdfs = await Pdf.find({}).sort({ createdAt: -1 }).lean();
  res.json({ pdfs });
});

router.post('/', auth, fields, async (req, res) => {
  try {
    const { name, description, active } = req.body;
    const pdfFile = req.files?.pdf?.[0];
    const imageFile = req.files?.image?.[0];

    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
    if (!pdfFile) return res.status(400).json({ error: 'pdf file required' });

    const pdfUp = await uploadRawBuffer(pdfFile.buffer, {
      folder: 'himalayan-yoga/pdfs',
      originalName: pdfFile.originalname,
    });

    let imageUrl = '';
    let imagePublicId = '';
    if (imageFile) {
      const imgUp = await uploadBuffer(imageFile.buffer, { folder: 'himalayan-yoga/pdfs/icons' });
      imageUrl = imgUp.secure_url;
      imagePublicId = imgUp.public_id;
    }

    const doc = await Pdf.create({
      name: name.trim(),
      description: (description || '').trim(),
      pdfUrl: pdfUp.secure_url,
      pdfPublicId: pdfUp.public_id,
      imageUrl,
      imagePublicId,
      active: active === 'false' || active === false ? false : true,
    });
    bustFlowCache();
    res.json({ pdf: doc });
  } catch (err) {
    console.error('[pdfs] create error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, fields, async (req, res) => {
  try {
    const doc = await Pdf.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    const { name, description, active } = req.body;
    if (name !== undefined) doc.name = name.trim();
    if (description !== undefined) doc.description = description.trim();
    if (active !== undefined) doc.active = active === 'true' || active === true;

    const pdfFile = req.files?.pdf?.[0];
    const imageFile = req.files?.image?.[0];

    if (pdfFile) {
      if (doc.pdfPublicId) await destroy(doc.pdfPublicId, { resource_type: 'raw' }).catch(() => {});
      const up = await uploadRawBuffer(pdfFile.buffer, {
        folder: 'himalayan-yoga/pdfs',
        originalName: pdfFile.originalname,
      });
      doc.pdfUrl = up.secure_url;
      doc.pdfPublicId = up.public_id;
    }

    if (imageFile) {
      if (doc.imagePublicId) await destroy(doc.imagePublicId).catch(() => {});
      const up = await uploadBuffer(imageFile.buffer, { folder: 'himalayan-yoga/pdfs/icons' });
      doc.imageUrl = up.secure_url;
      doc.imagePublicId = up.public_id;
    }

    await doc.save();
    bustFlowCache();
    res.json({ pdf: doc });
  } catch (err) {
    console.error('[pdfs] update error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Pdf.findById(req.params.id);
    if (!doc) return res.json({ ok: true });
    if (doc.pdfPublicId) await destroy(doc.pdfPublicId, { resource_type: 'raw' }).catch(() => {});
    if (doc.imagePublicId) await destroy(doc.imagePublicId).catch(() => {});
    await doc.deleteOne();
    bustFlowCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
