const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' }, // Cloudinary URL
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

EventSchema.index({ active: 1, fromDate: 1 });

module.exports = mongoose.model('Event', EventSchema);
