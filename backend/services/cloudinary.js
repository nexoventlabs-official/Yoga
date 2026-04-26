const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload an in-memory image buffer to Cloudinary.
 */
function uploadBuffer(buffer, { folder = 'himalayan-yoga', publicId } = {}) {
  return new Promise((resolve, reject) => {
    const opts = { folder, resource_type: 'image' };
    if (publicId) opts.public_id = publicId;
    const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function destroy(publicId) {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('[cloudinary] destroy failed:', err.message);
    return null;
  }
}

module.exports = { cloudinary, uploadBuffer, destroy };
