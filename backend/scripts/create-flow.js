/**
 * Create the Himalayan Yoga welcome flow on Meta:
 *   1. Create flow with endpoint_uri = ${BACKEND_URL}/api/flow-endpoint
 *   2. Upload Flow JSON
 *   3. Publish (or leave as draft if validation fails)
 *
 * Usage: npm run flow:create
 *
 * After it succeeds, copy the printed WHATSAPP_FLOW_ID into .env and restart server.
 */
require('dotenv').config();
const meta = require('../services/metaCloud');
const { buildFlowJSON } = require('../services/flowJson');

(async () => {
  const backend = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
  if (!backend.startsWith('https://')) {
    console.warn(
      '⚠️  BACKEND_URL is not HTTPS. Meta requires HTTPS for the Flow endpoint. ' +
        'Set BACKEND_URL to your public HTTPS URL before running this script.'
    );
  }

  const endpointUri = `${backend}/api/flow-endpoint`;
  console.log('Creating flow with endpoint:', endpointUri);

  let flowId;
  try {
    const res = await meta.createFlow('Himalayan Yoga Welcome', ['OTHER'], { endpointUri });
    flowId = res.id;
    console.log('✅ Flow created:', flowId);
  } catch (err) {
    console.error('❌ createFlow failed:', err.response?.data || err.message);
    process.exit(1);
  }

  try {
    const flowJson = buildFlowJSON();
    const res = await meta.updateFlowJSON(flowId, flowJson);
    if (res?.validation_errors?.length) {
      console.warn('⚠️  Validation warnings:', JSON.stringify(res.validation_errors, null, 2));
    } else {
      console.log('✅ Flow JSON uploaded');
    }
  } catch (err) {
    console.error('❌ updateFlowJSON failed:', err.response?.data || err.message);
    process.exit(1);
  }

  let status = 'DRAFT';
  try {
    await meta.publishFlow(flowId);
    status = 'PUBLISHED';
    console.log('✅ Flow published');
  } catch (err) {
    console.warn(
      '⚠️  publish failed — flow saved as DRAFT. Fix issues in Meta UI then publish manually.\n',
      err.response?.data || err.message
    );
  }

  console.log('\n────── Add to backend/.env ──────');
  console.log(`WHATSAPP_FLOW_ID=${flowId}`);
  console.log(`WHATSAPP_FLOW_STATUS=${status}`);
})();
