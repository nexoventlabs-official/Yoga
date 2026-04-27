const axios = require('axios');
const FormData = require('form-data');

function cfg() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const wabaId = process.env.META_WABA_ID;
  const v = process.env.META_GRAPH_VERSION || 'v22.0';
  if (!accessToken || !phoneNumberId || !wabaId) {
    throw new Error('Meta config missing — set META_ACCESS_TOKEN / META_PHONE_NUMBER_ID / META_WABA_ID');
  }
  return {
    accessToken,
    phoneNumberId,
    wabaId,
    graphVersion: v,
    baseUrl: `https://graph.facebook.com/${v}/${phoneNumberId}`,
    graphRoot: `https://graph.facebook.com/${v}`,
  };
}

const api = axios.create({ timeout: 30000 });

/** Send a plain text WhatsApp message. */
async function sendText(to, text) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'text',
    text: { body: text, preview_url: false },
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Send a document (PDF, etc.) by public URL.
 * @param {string} to       recipient phone (E.164 digits)
 * @param {string} docUrl   publicly accessible URL of the document
 * @param {object} [opts]
 * @param {string} [opts.filename] file name shown to the recipient (must include extension)
 * @param {string} [opts.caption]  optional caption text
 */
async function sendDocument(to, docUrl, opts = {}) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  const document = { link: docUrl };
  if (opts.filename) document.filename = opts.filename;
  if (opts.caption) document.caption = opts.caption;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'document',
    document,
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/** Send a plain image message. */
async function sendImage(to, imageUrl, caption = '') {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'image',
    image: { link: imageUrl, caption },
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Send an interactive Flow message.
 *
 * @param {string} to              recipient phone (E.164 digits)
 * @param {object} options
 * @param {string} options.flowId
 * @param {string} options.flowCta
 * @param {string} [options.headerImageUrl]
 * @param {string} [options.headerDocumentUrl]      Public URL of a PDF/document to use as header
 * @param {string} [options.headerDocumentFilename] Display filename for the document header
 * @param {string} [options.headerText]
 * @param {string} options.bodyText
 * @param {string} [options.footerText]
 * @param {string} [options.flowToken]
 * @param {('published'|'draft')} [options.mode]
 */
async function sendFlowMessage(to, options) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');

  const {
    flowId,
    flowCta,
    headerImageUrl,
    headerDocumentUrl,
    headerDocumentFilename,
    headerText,
    bodyText,
    footerText,
    flowToken = `welcome_${phone}`,
    mode = 'published',
  } = options;

  let header;
  if (headerDocumentUrl) {
    const doc = { link: headerDocumentUrl };
    if (headerDocumentFilename) doc.filename = headerDocumentFilename;
    header = { type: 'document', document: doc };
  } else if (headerImageUrl) {
    header = { type: 'image', image: { link: headerImageUrl } };
  } else {
    header = { type: 'text', text: headerText || 'Himalayan Yoga' };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header,
      body: { text: bodyText },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_token: flowToken,
          flow_id: flowId,
          flow_cta: flowCta,
          mode,
          flow_action: 'data_exchange', // backend INIT decides screen
        },
      },
    },
  };
  if (footerText) payload.interactive.footer = { text: footerText };

  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/* ─────── Flow management (used by setup scripts) ─────── */

async function createFlow(name, categories = ['OTHER'], { endpointUri } = {}) {
  const { graphRoot, accessToken, wabaId } = cfg();
  const body = { name, categories };
  if (endpointUri) body.endpoint_uri = endpointUri;
  const { data } = await api.post(`${graphRoot}/${wabaId}/flows`, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

async function updateFlowJSON(flowId, flowJsonObj) {
  const { graphRoot, accessToken } = cfg();
  const fd = new FormData();
  fd.append('file', Buffer.from(JSON.stringify(flowJsonObj)), {
    filename: 'flow.json',
    contentType: 'application/json',
  });
  fd.append('name', 'flow.json');
  fd.append('asset_type', 'FLOW_JSON');
  const { data } = await api.post(`${graphRoot}/${flowId}/assets`, fd, {
    headers: { Authorization: `Bearer ${accessToken}`, ...fd.getHeaders() },
    maxContentLength: 10 * 1024 * 1024,
    maxBodyLength: 10 * 1024 * 1024,
  });
  return data;
}

async function publishFlow(flowId) {
  const { graphRoot, accessToken } = cfg();
  const { data } = await api.post(
    `${graphRoot}/${flowId}/publish`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
}

async function setFlowEndpoint(flowId, endpointUri, { autoPublish = true } = {}) {
  const { graphRoot, accessToken } = cfg();
  const { data } = await api.post(
    `${graphRoot}/${flowId}`,
    { endpoint_uri: endpointUri },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  // Updating the endpoint reverts the flow to DRAFT — re-publish so end-users can use it again.
  if (autoPublish) {
    try {
      await publishFlow(flowId);
    } catch (err) {
      console.warn('[metaCloud.setFlowEndpoint] re-publish failed:', err.response?.data || err.message);
    }
  }
  return data;
}

async function uploadBusinessPublicKey(publicKeyPem) {
  const { phoneNumberId, accessToken, graphVersion } = cfg();
  const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/whatsapp_business_encryption`;
  const fd = new URLSearchParams();
  fd.append('business_public_key', publicKeyPem);
  const { data } = await api.post(url, fd.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return data;
}

module.exports = {
  cfg,
  sendText,
  sendImage,
  sendDocument,
  sendFlowMessage,
  createFlow,
  updateFlowJSON,
  publishFlow,
  setFlowEndpoint,
  uploadBusinessPublicKey,
};
