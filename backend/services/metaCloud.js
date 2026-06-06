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
 * https://developers.facebook.com/docs/whatsapp/cloud-api/messages/order-details-messages
 *
 * Currency amounts: { value: rupees * offset, offset }  (INR: offset=100)
 *
 * @param {string} to
 * @param {object} opts
 * @param {string}   opts.referenceId          Unique order ref e.g. BOOKING-<id>
 * @param {string}   opts.configurationName    Meta payment configuration name
 * @param {string}   [opts.headerText]         Header text (shown above body)
 * @param {string}   opts.bodyText
 * @param {string}   [opts.footerText]
 * @param {number}   [opts.expirationTimestamp] epoch seconds
 * @param {Array<{retailerId,name,amount,quantity,saleAmount?}>} opts.items
 * @param {number}   opts.subtotal             in rupees
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
    items,
    subtotal,
    currency = 'INR',
    offset = 100,
  } = opts;

  if (!referenceId) throw new Error('sendOrderDetails: referenceId required');
  if (!configurationName) throw new Error('sendOrderDetails: configurationName required');
  if (!Array.isArray(items) || items.length === 0) throw new Error('sendOrderDetails: items required');

  const toMoney = (amt) => ({ value: Math.round(Number(amt || 0) * offset), offset });

  const totalValue = items.reduce((s, it) => {
    const each = toMoney(it.saleAmount ?? it.amount).value;
    return s + each * (it.quantity || 1);
  }, 0);
  const totalAmount = { value: totalValue, offset };

  const orderItems = items.map((it) => {
    const o = {
      retailer_id: String(it.retailerId),
      name: String(it.name).substring(0, 60),
      amount: toMoney(it.amount),
      quantity: it.quantity || 1,
    };
    if (it.saleAmount !== undefined) o.sale_amount = toMoney(it.saleAmount);
    return o;
  });

  const paymentSetting = {
    type: 'payment_gateway',
    payment_gateway: {
      type: 'razorpay',
      configuration_name: configurationName,
      razorpay: {
        receipt: `hya_${String(referenceId).slice(-12)}`,
        notes: { reference_id: String(referenceId) },
      },
    },
  };

  const action = {
    name: 'review_and_pay',
    parameters: {
      reference_id: String(referenceId),
      type: 'digital-goods',
      currency,
      total_amount: totalAmount,
      order: {
        status: 'pending',
        items: orderItems,
        subtotal: toMoney(subtotal),
      },
      payment_settings: [paymentSetting],
    },
  };

  if (expirationTimestamp) {
    action.parameters.expiration = {
      timestamp: String(expirationTimestamp),
      description: 'Payment link expires',
    };
  }

  const interactive = {
    type: 'order_details',
    body: { text: bodyText },
    action,
  };
  if (headerText) interactive.header = { type: 'text', text: headerText };
  if (footerText) interactive.footer = { text: footerText };

  const { data } = await api.post(
    `${baseUrl}/messages`,
    { messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'interactive', interactive },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
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
