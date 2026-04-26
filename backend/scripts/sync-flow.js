/**
 * Push the latest local flow JSON to the existing Meta flow and re-publish.
 *
 * Usage: node scripts/sync-flow.js
 */
require('dotenv').config();
const meta = require('../services/metaCloud');
const { buildFlowJSON } = require('../services/flowJson');
const { setKeys } = require('./_envFile');

(async () => {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!flowId) {
    console.error('❌ WHATSAPP_FLOW_ID is not set in .env');
    process.exit(1);
  }
  console.log('• Updating flow JSON for', flowId);
  try {
    const res = await meta.updateFlowJSON(flowId, buildFlowJSON());
    if (res?.validation_errors?.length) {
      console.warn('⚠️  Validation warnings:');
      console.warn(JSON.stringify(res.validation_errors, null, 2));
    } else {
      console.log('✅ Flow JSON uploaded');
    }
  } catch (err) {
    console.error('❌ updateFlowJSON failed:', err.response?.data || err.message);
    process.exit(1);
  }

  try {
    await meta.publishFlow(flowId);
    setKeys({ WHATSAPP_FLOW_STATUS: 'PUBLISHED' });
    console.log('✅ Flow published');
  } catch (err) {
    console.error('❌ publishFlow failed:', err.response?.data || err.message);
    process.exit(1);
  }
})();
