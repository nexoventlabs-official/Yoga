const express = require('express');
const auth = require('../middleware/auth');
const FAQ = require('../models/FAQ');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.language) filter.language = req.query.language.toUpperCase();
    const faqs = await FAQ.find(filter).sort({ language: 1, sortOrder: 1 }).lean();
    res.json({ faqs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Public — used by flow endpoint for FAQ flow screen */
router.get('/public', async (req, res) => {
  try {
    const language = (req.query.language || 'EN').toUpperCase();
    const faqs = await FAQ.find({ language, active: true }).sort({ sortOrder: 1 }).lean();
    res.json({ faqs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { question, answer, language, sortOrder, active } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'question and answer required' });
    const faq = await FAQ.create({
      question: question.trim(),
      answer: answer.trim(),
      language: (language || 'EN').toUpperCase(),
      sortOrder: Number(sortOrder) || 0,
      active: active === 'false' ? false : true,
    });
    res.json({ faq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) return res.status(404).json({ error: 'Not found' });
    const { question, answer, language, sortOrder, active } = req.body;
    if (question !== undefined) faq.question = question.trim();
    if (answer !== undefined) faq.answer = answer.trim();
    if (language !== undefined) faq.language = language.toUpperCase();
    if (sortOrder !== undefined) faq.sortOrder = Number(sortOrder) || 0;
    if (active !== undefined) faq.active = active === 'true' || active === true;
    await faq.save();
    res.json({ faq });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await FAQ.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
