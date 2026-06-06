/**
 * Sequence Worker — runs as a background cron job.
 * Checks all active NurtureSequence docs every hour and fires due messages.
 *
 * Usage: node scripts/sequenceWorker.js
 * Or add to package.json: "worker": "node scripts/sequenceWorker.js"
 *
 * In production, run this as a separate process (PM2, etc.) alongside the server.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { processTick } = require('../services/sequenceEngine');

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('[worker] MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('[worker] MongoDB connected');

  console.log('[worker] Running initial tick...');
  await processTick().catch((e) => console.error('[worker] processTick error:', e.message));

  setInterval(async () => {
    console.log('[worker] Hourly tick...');
    await processTick().catch((e) => console.error('[worker] processTick error:', e.message));
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error('[worker] Fatal:', err.message);
  process.exit(1);
});
