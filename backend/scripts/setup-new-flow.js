/**
 * setup-new-flow.js
 *
 * 1. Lists existing flows in the WABA (so we don't touch them)
 * 2. Creates a NEW "Himalayan Yoga Welcome" flow with our endpoint_uri
 * 3. Uploads the Flow JSON
 * 4. Publishes it
 * 5. Writes WHATSAPP_FLOW_ID and WHATSAPP_FLOW_STATUS to backend/.env
 *
 * Usage: node scripts/setup-new-flow.js
 */
require('dotenv').config();
const axios = require('axios');
const meta = require('../services/metaCloud');
const { buildFlowJSON } = require('../services/flowJson');
const { setKeys } = require('./_envFile');

(async () => {
  const { accessToken, wabaId, graphVersion, graphRoot } = meta.cfg();
  const backend = (process.env.BACKEND_URL || '').replace(/\/+$/, '');

  if (!backend.startsWith('https://')) {
    console.warn('⚠️  BACKEND_URL is not HTTPS. Meta requires HTTPS for the Flow endpoint.');
    console.warn('    Current BACKEND_URL:', backend);
    console.warn('    Continuing anyway — make sure this is correct for production.');
  }

  const endpointUri = `${backend}/api/flow-endpoint`;
  console.log('\n══════════════════════════════════════════════');
  console.log(' Himalayan Yoga — New Flow Setup');
  console.log('══════════════════════════════════════════════');
  console.log('WABA ID       :', wabaId);
  console.log('Endpoint URI  :', endpointUri);
  console.log('Graph version :', graphVersion);

  /* ── Step 1: List existing flows ── */
  console.log('\n[1/4] Fetching existing flows (will NOT touch these)…');
  try {
    const { data } = await axios.get(
      `${graphRoot}/${wabaId}/flows`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const flows = data?.data || [];
    if (flows.length === 0) {
      console.log('      (no existing flows found)');
    } else {
      console.log(`      Found ${flows.length} existing flow(s):`);
      flows.forEach((f) => {
        console.log(`        • [${f.id}] "${f.name}" — ${f.status}`);
      });
    }
  } catch (err) {
    console.warn('      Could not list existing flows:', err.response?.data || err.message);
  }

  /* ── Step 2: Create new flow ── */
  console.log('\n[2/4] Creating new flow "Himalayan Yoga Welcome"…');
  let flowId;
  try {
    const res = await meta.createFlow('Himalayan Yoga Welcome', ['OTHER'], { endpointUri });
    flowId = res.id;
    console.log('      ✅ Flow created:', flowId);
  } catch (err) {
    console.error('      ❌ createFlow failed:', err.response?.data || err.message);
    process.exit(1);
  }

  /* ── Step 3: Upload flow JSON ── */
  console.log('\n[3/4] Uploading Flow JSON…');
  try {
    const flowJson = buildFlowJSON();
    const res = await meta.updateFlowJSON(flowId, flowJson);
    if (res?.validation_errors?.length) {
      console.warn('      ⚠️  Validation warnings:');
      console.warn(JSON.stringify(res.validation_errors, null, 2));
    } else {
      console.log('      ✅ Flow JSON uploaded successfully');
    }
  } catch (err) {
    console.error('      ❌ updateFlowJSON failed:', err.response?.data || err.message);
    console.error('      Flow was created but JSON upload failed. Flow ID:', flowId);
    process.exit(1);
  }

  /* ── Step 4: Publish ── */
  console.log('\n[4/4] Publishing flow…');
  let status = 'DRAFT';
  try {
    await meta.publishFlow(flowId);
    status = 'PUBLISHED';
    console.log('      ✅ Flow published successfully!');
  } catch (err) {
    console.warn('      ⚠️  Publish failed — flow saved as DRAFT.');
    console.warn('         You can publish manually in Meta Business → WhatsApp Flows.');
    console.warn('         Error:', err.response?.data || err.message);
  }

  /* ── Step 5: Write to .env ── */
  setKeys({
    WHATSAPP_FLOW_ID: flowId,
    WHATSAPP_FLOW_STATUS: status,
  });

  console.log('\n══════════════════════════════════════════════');
  console.log(' ✅ Done! .env has been updated automatically.');
  console.log('══════════════════════════════════════════════');
  console.log(`\n  WHATSAPP_FLOW_ID     = ${flowId}`);
  console.log(`  WHATSAPP_FLOW_STATUS = ${status}`);
  console.log('\n────── Important URLs ────────────────────────');
  console.log(`  Webhook Callback URL : ${backend}/api/webhook/meta`);
  console.log(`  Webhook Verify Token : ${process.env.META_VERIFY_TOKEN || 'himalayan_yoga_verify'}`);
  console.log(`  Flow Endpoint URI    : ${endpointUri}`);
  console.log('──────────────────────────────────────────────');
  console.log('\n  Next steps:');
  console.log('  1. Go to Meta for Developers → Your App → WhatsApp → Configuration');
  console.log(`  2. Set Callback URL to: ${backend}/api/webhook/meta`);
  console.log(`  3. Set Verify Token to: ${process.env.META_VERIFY_TOKEN || 'himalayan_yoga_verify'}`);
  console.log('  4. Subscribe to: messages, message_reactions, messaging_postbacks');
  console.log(`  5. The Flow Endpoint URI is already set: ${endpointUri}`);
  console.log('\n  Restart your backend server to pick up the new WHATSAPP_FLOW_ID.\n');
})();
