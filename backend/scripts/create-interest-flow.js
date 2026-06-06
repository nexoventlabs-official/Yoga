/**
 * Creates the "Interest Capture" flow on Meta:
 *   1. Update the already-created draft flow with endpoint_uri
 *   2. Upload the corrected Flow JSON
 *   3. Publish it
 *   4. Write INTEREST_FLOW_ID + INTEREST_FLOW_STATUS to backend/.env
 *
 * Usage: node scripts/create-interest-flow.js
 */
require('dotenv').config();
const axios = require('axios');
const meta = require('../services/metaCloud');
const { buildInterestFlowJSON } = require('../services/interestFlowJson');
const { setKeys } = require('./_envFile');

(async () => {
  const backend = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
  const endpointUri = `${backend}/api/flow-endpoint`;
  const existingFlowId = process.env.INTEREST_FLOW_ID;

  console.log('\n══════════════════════════════════════════════');
  console.log(' Himalayan Yoga — Interest Capture Flow Setup');
  console.log('══════════════════════════════════════════════');
  console.log('WABA ID     :', process.env.META_WABA_ID);
  console.log('Endpoint URI:', endpointUri);

  let flowId = existingFlowId;

  /* ── Step 1: Create or reuse flow ── */
  if (flowId) {
    console.log(`\n[1/3] Reusing existing draft flow: ${flowId}`);
    // Set endpoint_uri on the existing draft
    try {
      const { accessToken, graphVersion } = meta.cfg();
      await axios.post(
        `https://graph.facebook.com/${graphVersion}/${flowId}`,
        { endpoint_uri: endpointUri },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      console.log('      ✅ endpoint_uri set');
    } catch (err) {
      console.warn('      ⚠️  Could not set endpoint_uri:', err.response?.data || err.message);
    }
  } else {
    console.log('\n[1/3] Creating flow "HYA Interest Capture"...');
    try {
      const res = await meta.createFlow('HYA Interest Capture', ['OTHER'], { endpointUri });
      flowId = res.id;
      console.log('      ✅ Flow created:', flowId);
    } catch (err) {
      console.error('      ❌ createFlow failed:', err.response?.data || err.message);
      process.exit(1);
    }
  }

  /* ── Step 2: Upload flow JSON ── */
  console.log('\n[2/3] Uploading Flow JSON...');
  try {
    const flowJson = buildInterestFlowJSON();
    const res = await meta.updateFlowJSON(flowId, flowJson);
    if (res?.validation_errors?.length) {
      console.warn('      ⚠️  Validation warnings:');
      console.warn(JSON.stringify(res.validation_errors, null, 2));
    } else {
      console.log('      ✅ Flow JSON uploaded');
    }
  } catch (err) {
    console.error('      ❌ updateFlowJSON failed:', err.response?.data || err.message);
    process.exit(1);
  }

  /* ── Step 3: Publish ── */
  console.log('\n[3/3] Publishing flow...');
  let status = 'DRAFT';
  try {
    await meta.publishFlow(flowId);
    status = 'PUBLISHED';
    console.log('      ✅ Flow published!');
  } catch (err) {
    console.warn('      ⚠️  Publish failed — saved as DRAFT.');
    console.warn('         Error:', err.response?.data || err.message);
  }

  /* ── Write to .env ── */
  setKeys({
    INTEREST_FLOW_ID: flowId,
    INTEREST_FLOW_STATUS: status,
  });

  console.log('\n══════════════════════════════════════════════');
  console.log(' ✅ Done! .env updated.');
  console.log('══════════════════════════════════════════════');
  console.log(`\n  INTEREST_FLOW_ID     = ${flowId}`);
  console.log(`  INTEREST_FLOW_STATUS = ${status}\n`);
})();
