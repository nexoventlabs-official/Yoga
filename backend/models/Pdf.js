const mongoose = require('mongoose');

/**
 * A PDF resource that the WhatsApp flow can deliver to users.
 *
 * Admin uploads:
 *   - name      → label shown in the flow's PDF list (e.g. "30-Day Yoga Guide")
 *   - pdfUrl    → Cloudinary URL of the PDF (resource_type: raw)
 *   - imageUrl  → small icon shown next to the name inside the flow's RadioButtonsGroup
 */
const PdfSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    pdfUrl: { type: String, required: true },
    pdfPublicId: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pdf', PdfSchema);
