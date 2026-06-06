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

/**
 * Native WhatsApp Pay — Order Details message (student → academy course fee).
 * https://developers.facebook.com/docs/whatsapp/cloud-api/payments-api/payments-in/upi-intent
 *
 * UPI VPA config: payment_type = "upi", payment_configuration = config name.
 * Currency amounts: { value: Math.round(rupees * offset), offset }  INR offset=100
 *
 * @param {string} to
 * @param {object} opts
 * @param {string}   opts.referenceId           Unique order ref ≤35 chars, [A-Za-z0-9_\-.]
 * @param {string}   opts.configurationName     Meta payment configuration name
 * @param {string}   [opts.headerText]          Optional header text
 * @param {string}   opts.bodyText              Body text (max 1024 chars)
 * @param {string}   [opts.footerText]          Footer text (max 60 chars)
 * @param {number}   [opts.expirationTimestamp] epoch seconds (min now+300)
 * @param {string}   [opts.expirationDesc]      Expiration description (max 120 chars)
 * @param {Array<{name,amount,quantity}>} opts.items  items list
 * @param {number}   opts.subtotal              subtotal in rupees
 * @param {number}   [opts.tax=0]               tax in rupees
 * @param {string}   [opts.currency='INR']
 * @param {number}   [opts.offset=100]
 */
async function sendOrderDetails(to, opts) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');

  const {
    referenceId,
    configurationName,
    headerText,
    bodyText,
    footerText,
    expirationTimestamp,
    expirationDesc,
    items,
    subtotal,
    tax = 0,
    currency = 'INR',
    offset = 100,
  } = opts;

  if (!referenceId) throw new Error('sendOrderDetails: referenceId required');
  if (!configurationName) throw new Error('sendOrderDetails: configurationName required');
  if (!Array.isArray(items) || items.length === 0) throw new Error('sendOrderDetails: items required');

  const toMoney = (amt) => ({ value: Math.round(Number(amt || 0) * offset), offset });

  const totalValue = toMoney(subtotal).value + toMoney(tax).value;

  const orderItems = items.map((it) => ({
    name: String(it.name).substring(0, 60),
    amount: toMoney(it.amount),
    quantity: it.quantity || 1,
  }));

  const order = {
    status: 'pending',
    items: orderItems,
    subtotal: toMoney(subtotal),
    tax: toMoney(tax),
  };

  if (expirationTimestamp) {
    order.expiration = {
      timestamp: String(expirationTimestamp),
      description: (expirationDesc || 'Payment link expires').substring(0, 120),
    };
  }

  const interactive = {
    type: 'order_details',
    body: { text: bodyText },
    action: {
      name: 'review_and_pay',
      parameters: {
        reference_id: String(referenceId).substring(0, 35),
        type: 'digital-goods',
        payment_type: 'upi',
        payment_configuration: configurationName,
        currency,
        total_amount: { value: totalValue, offset },
        order,
      },
    },
  };

  if (headerText) interactive.header = { type: 'text', text: String(headerText).substring(0, 60) };
  if (footerText) interactive.footer = { text: String(footerText).substring(0, 60) };

  try {
    const { data } = await api.post(
      `${baseUrl}/messages`,
      { messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'interactive', interactive },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return data;
  } catch (err) {
    // Log full Meta error so we can debug
    console.error('[metaCloud] sendOrderDetails failed:', JSON.stringify(err.response?.data || err.message));
    throw err;
  }
}

/**
 * Update the order_details card status after payment succeeds/fails.
 * Flips the "Pay now" CTA → completed/canceled.
 *
 * @param {string} to
 * @param {object} opts
 * @param {string} opts.referenceId   same reference_id used in sendOrderDetails
 * @param {string} [opts.status]      'processing'|'completed'|'canceled'
 * @param {string} [opts.description]
 */
async function sendOrderStatus(to, { referenceId, status = 'completed', description }) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  if (!referenceId) throw new Error('sendOrderStatus: referenceId required');

  const interactive = {
    type: 'order_status',
    body: { text: description || (status === 'completed' ? '✅ Payment received!' : 'Order update') },
    action: {
      name: 'review_order',
      parameters: {
        reference_id: String(referenceId),
        order: { status },
      },
    },
  };

  const { data } = await api.post(
    `${baseUrl}/messages`,
    { messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'interactive', interactive },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
}

/**
 * Send interactive reply buttons with a document (PDF) header — all in one message.
 * @param {string} to
 * @param {object} opts
 * @param {string} opts.documentUrl       Public URL of the PDF
 * @param {string} [opts.documentFilename] Filename shown to recipient
 * @param {string} opts.bodyText
 * @param {Array<{id: string, title: string}>} opts.buttons  up to 3
 * @param {string} [opts.footerText]
 */
async function sendReplyButtonsWithDocument(to, opts) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  const { documentUrl, documentFilename, bodyText, buttons, footerText } = opts;

  const doc = { link: documentUrl };
  if (documentFilename) doc.filename = documentFilename;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'document', document: doc },
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id.substring(0, 256), title: b.title.substring(0, 20) },
        })),
      },
    },
  };
  if (footerText) payload.interactive.footer = { text: footerText };

  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Send interactive reply buttons (up to 3 buttons).
 * @param {string} to
 * @param {object} opts
 * @param {string} opts.bodyText
 * @param {Array<{id: string, title: string}>} opts.buttons
 * @param {string} [opts.headerText]
 * @param {string} [opts.footerText]
 */
async function sendReplyButtons(to, opts) {
  const { baseUrl, accessToken } = cfg();
  const phone = String(to).replace(/\D/g, '');
  const { bodyText, buttons, headerText, footerText } = opts;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id.substring(0, 256), title: b.title.substring(0, 20) },
        })),
      },
    },
  };
  if (headerText) payload.interactive.header = { type: 'text', text: headerText };
  if (footerText) payload.interactive.footer = { text: footerText };

  const { data } = await api.post(`${baseUrl}/messages`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

module.exports = {
  cfg,
  sendText,
  sendImage,
  sendDocument,
  sendFlowMessage,
  sendOrderDetails,
  sendOrderStatus,
  sendReplyButtons,
  sendReplyButtonsWithDocument,
  createFlow,
  updateFlowJSON,
  publishFlow,
  setFlowEndpoint,
  uploadBusinessPublicKey,
};
