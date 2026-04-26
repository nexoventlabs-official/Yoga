const axios = require('axios');

/**
 * Download an image URL and return raw base64 (no data: prefix).
 * WhatsApp Flow `Image` and data-source `image` fields require raw base64 PNG/JPG.
 *
 * If the URL is hosted on Cloudinary (`/upload/`), we apply on-the-fly transformation
 * parameters (width/height/quality/format) so the downloaded payload is already optimized.
 * This keeps each base64 image well under the per-flow size limits (~250 KB total)
 * and is much faster than processing locally with sharp.
 *
 * @param {string} url
 * @param {object} [opts]
 * @param {number} [opts.width]   resize width  (default 1000 for banners)
 * @param {number} [opts.height]  resize height (default 125  for banners — 8:1)
 * @param {string} [opts.format]  'jpg' | 'png' | 'auto' (default 'jpg')
 * @param {number} [opts.quality] 1‑100 (default 70)
 * @param {string} [opts.crop]    'fill' | 'fit' | 'pad' (default 'fill')
 */
async function urlToBase64(url, opts = {}) {
  if (!url) return '';
  try {
    const fetchUrl = withCloudinaryTransform(url, opts);
    const resp = await axios.get(fetchUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 10 * 1024 * 1024,
    });
    const base64 = Buffer.from(resp.data).toString('base64');
    return base64.replace(/^data:image\/[^;]+;base64,/, '');
  } catch (err) {
    console.warn('[imageBase64] failed for', url, err.message);
    return '';
  }
}

function withCloudinaryTransform(url, opts = {}) {
  if (!url || !url.includes('/upload/')) return url;
  const parts = [];
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);
  parts.push(`c_${opts.crop || 'fill'}`);
  parts.push(`q_${opts.quality || 70}`);
  parts.push(`f_${opts.format || 'jpg'}`);
  return url.replace('/upload/', `/upload/${parts.join(',')}/`);
}

module.exports = { urlToBase64, withCloudinaryTransform };
