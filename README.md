# Himalayan Yoga Academy — WhatsApp Chatbot + Admin Panel

A complete WhatsApp Cloud API chatbot for **Himalayan Yoga Academy** with a React admin console.

## Features

- **WhatsApp welcome flow** triggered by greetings (`hi`, `hello`, `namaste`, …) — sends an interactive flow message with a banner header, body and **“Choose Service”** CTA.
- **Single Flow, multiple screens, fully dynamic** (Meta *Endpoint / Data API* mode):
  - **Service Selection** (banner + radio list with icons): _Register / Profile, Yoga Packages, Training Packages, Events, Enquiry_.
  - The **Register** option is replaced with **My Profile** automatically when the WhatsApp number is already registered.
  - **Register form** — name, email (optional), WhatsApp number (locked), DOB, gender.
  - **Yoga Packages** — Yoga Retreats, Sound Healing, Special Yoga Day Package (with icons).
  - **Training Packages** — Meditation Training, Sound Healing, Yoga Training (with icons).
  - **Events** — pulled live from MongoDB (admin creates them); selecting one shows its image, dates, description.
  - **Enquiry form** — name, locked WhatsApp number, message.
- **Admin panel** (React + Vite + Tailwind):
  - Dashboard with live counts.
  - Registered Users table with search & delete.
  - Non-Registered Users — anyone who messaged the bot but never registered.
  - Events CRUD with image upload (Cloudinary).
  - Enquiries inbox with status workflow & internal notes.
  - Flow Images uploader for every banner & icon used by the bot/flow.

---

## Project layout

```
Himayan-Yoga/
├── backend/        Node/Express + Mongoose API + Webhook + Flow endpoint
└── frontend/       React + Vite + Tailwind admin console
```

---

## 1. Install

```bash
# Backend
cd backend
npm install

# Frontend (separate shell)
cd frontend
npm install
```

> The backend `package.json` includes `sharp` (used to resize/compress images to base64 for the flow).
> If `npm install` for `sharp` fails on Windows, run `npm rebuild sharp` afterwards.

---

## 2. Configure `backend/.env`

A pre-populated `.env` is included with the Meta + Mongo + Cloudinary credentials provided.
The two values that must be filled in by the setup scripts are:

```env
WHATSAPP_FLOW_ID=
FLOW_PRIVATE_KEY=
FLOW_PUBLIC_KEY=
```

`BACKEND_URL` must be **HTTPS** and publicly reachable for Meta to call the Flow endpoint and webhook.
For local development use [ngrok](https://ngrok.com/):

```bash
ngrok http 5000
# Copy the https URL into BACKEND_URL in backend/.env
```

---

## 3. One-time WhatsApp Flow setup

```bash
cd backend

# 1) Generate the RSA keypair for Flow encryption
npm run flow:keys
#    This writes flow_keys/private.pem and flow_keys/public.pem
#    AND prints FLOW_PRIVATE_KEY / FLOW_PUBLIC_KEY env lines — paste them into backend/.env

# 2) Upload the public key to Meta (associates it with your phone number id)
npm run flow:upload-key

# 3) Create + publish the flow on Meta (uses BACKEND_URL/api/flow-endpoint)
npm run flow:create
#    Copy the printed WHATSAPP_FLOW_ID into backend/.env
```

Then restart the backend.

---

## 4. Configure Meta webhook

In **Meta → WhatsApp → Configuration → Webhook**:

- **Callback URL:** `https://<BACKEND_URL>/api/webhook/meta`
- **Verify token:** value of `META_VERIFY_TOKEN` (default `himalayan_yoga_verify`)
- **Subscribed fields:** `messages`

---

## 5. Run

```bash
# Backend
cd backend
npm run dev    # → http://localhost:5000

# Frontend
cd frontend
npm run dev    # → http://localhost:5173
```

Login with the credentials in `backend/.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`, default `admin` / `admin@123`).

> First-time admin login is auto-seeded the first time the backend connects to Mongo.

---

## 6. Test it

1. From the **Flow Images** admin page, upload images for at least:
   - `flow_welcome_banner` (top of service screen)
   - `chat_welcome_header` (image used as header of the chatbot welcome message)
   - the six **service icons** (`icon_register`, `icon_profile`, `icon_yoga_packages`, …)
2. From **Events**, create at least one event so the Events option in the flow has content.
3. From your phone, send `hi` to the WhatsApp number connected to `META_PHONE_NUMBER_ID`.
4. You should receive an image header + body + **Choose Service** button.
5. Tap it → SERVICE SELECT screen with 5 (or 6) options, each with its icon.
6. Choose any option to test the dynamic sub-screen.
7. After registering, send `hi` again — the menu now shows **My Profile** instead of Register.

---

## API surface (admin)

All endpoints under `/api/*` require `Authorization: Bearer <jwt>` except `/api/auth/login` and `/api/webhook/*` and `/api/flow-endpoint`.

| Method | Path                              | Purpose                       |
|-------:|-----------------------------------|-------------------------------|
| POST   | `/api/auth/login`                 | Admin login                   |
| GET    | `/api/auth/verify`                | Validate token                |
| GET    | `/api/dashboard/stats`            | Dashboard summary             |
| GET    | `/api/users/registered`           | List registered users         |
| GET    | `/api/users/non-registered`       | List contacts who never registered |
| DELETE | `/api/users/registered/:id`       | Delete a user                 |
| GET    | `/api/events`                     | List events                   |
| POST   | `/api/events`                     | Create event (multipart)      |
| PUT    | `/api/events/:id`                 | Update event (multipart)      |
| DELETE | `/api/events/:id`                 | Delete event                  |
| GET    | `/api/enquiries`                  | List enquiries (`?status=`)   |
| PATCH  | `/api/enquiries/:id`              | Update status / notes         |
| DELETE | `/api/enquiries/:id`              | Delete                        |
| GET    | `/api/flow-images`                | List all flow image slots     |
| POST   | `/api/flow-images/:key`           | Upload image (multipart)      |
| DELETE | `/api/flow-images/:key`           | Clear image                   |
| GET/POST | `/api/webhook/meta`             | Meta webhook                  |
| POST   | `/api/flow-endpoint`              | Encrypted Flow endpoint       |

---

## How dynamic content works

The flow is created **once** with `endpoint_uri = ${BACKEND_URL}/api/flow-endpoint`. Every screen except the first sends `data_exchange` to our backend, which:

1. Decrypts the request (RSA private key + AES-128-GCM).
2. Looks up the WhatsApp number, the requested action and the registered user (if any).
3. Builds the next screen with **base64-embedded images** (banner + per-item icons) by downloading the Cloudinary URLs and resizing/compressing through `sharp`.
4. Re-encrypts the response with the flipped IV.

Image conversions are cached in-memory for 10 minutes so updating an image in the admin shows up within ten minutes.

---

## Production notes

- Use HTTPS for both `BACKEND_URL` and the `Frontend → Backend` API URL.
- Add the production frontend domain to `ALLOWED_ORIGINS`.
- Set `NODE_ENV=production`.
- Rotate `META_VERIFY_TOKEN` and `JWT_SECRET`.
- Consider scheduling `User`/`InboundMessage` retention if your contact volume is high.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Webhook stays *Not verified* | `META_VERIFY_TOKEN` must match the value entered in Meta. |
| Flow never opens / “Try again” | Public key not uploaded — re-run `npm run flow:upload-key`. |
| User taps button but flow opens to a blank screen | Check backend logs — `[FlowEndpoint] decrypt failed` means key mismatch. |
| Banner / icons don’t show up | Upload the corresponding key from the **Flow Images** admin page (or wait up to 10 min for cache). |
| Greeting message goes ignored | Confirm the contact appears in **Non-Registered Users**; check `META_ACCESS_TOKEN` & `META_PHONE_NUMBER_ID` are valid. |
