require('dotenv').config();
const mongoose = require('mongoose');
const FlowImage = require('../models/FlowImage');
const { urlToBase64, withCloudinaryTransform } = require('../services/imageBase64');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await FlowImage.find({ url: { $ne: '' } }).lean();
  console.log(`Uploaded flow images: ${docs.length}`);
  for (const d of docs) {
    const isIcon = d.key.startsWith('icon_');
    const opts = isIcon
      ? { width: 200, height: 200, crop: 'fill', quality: 75, format: 'jpg' }
      : { width: 1000, height: 125, crop: 'fill', quality: 70, format: 'jpg' };
    const transformed = withCloudinaryTransform(d.url, opts);
    const b64 = await urlToBase64(d.url, opts);
    console.log(
      `- ${d.key.padEnd(28)}  size=${(b64.length / 1024).toFixed(1).padStart(5)} KB  ${transformed.slice(0, 90)}...`
    );
  }
  await mongoose.disconnect();
})();
