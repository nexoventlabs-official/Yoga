# Himalayan Yoga — Backend

Node.js + Express API + WhatsApp webhook + encrypted Flow endpoint.

See the [project README](../README.md) for full setup steps.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start with nodemon |
| `npm start` | Production start |
| `npm run flow:keys` | Generate `flow_keys/private.pem` and `flow_keys/public.pem` and print env lines |
| `npm run flow:upload-key` | Upload `FLOW_PUBLIC_KEY` to Meta |
| `npm run flow:create` | Create + publish the WhatsApp flow on Meta |
| `npm run seed:admin` | Re-seed admin user from `ADMIN_USERNAME`/`ADMIN_PASSWORD` |

## Folders

```
backend/
├── server.js
├── routes/
│   ├── auth.js
│   ├── webhook.js          ← Meta webhook (verify + signature)
│   ├── flowEndpoint.js     ← Encrypted Flow endpoint (INIT / data_exchange)
│   ├── users.js
│   ├── events.js
│   ├── enquiries.js
│   ├── flowImages.js
│   └── dashboard.js
├── services/
│   ├── chatbot.js          ← greeting detection + send welcome flow
│   ├── metaCloud.js        ← all Meta Graph API calls
│   ├── flowJson.js         ← Flow JSON definition (all screens)
│   ├── flowImages.js       ← Flow image catalog (keys/labels/groups)
│   ├── imageBase64.js      ← URL → resized base64 (sharp)
│   └── cloudinary.js       ← Cloudinary uploader
├── models/                 ← Admin, User, Event, Enquiry, FlowImage, InboundMessage
├── middleware/             ← auth, multer
└── scripts/                ← flow keys, key upload, flow creation, admin seed
```
