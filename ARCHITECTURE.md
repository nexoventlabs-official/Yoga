# 🧘 HIMALAYAN YOGA ACADEMY — SYSTEM ARCHITECTURE
> **WhatsApp Flow Bot · W1→W5 Student Journey · Admin Panel · Full Stack**
> Stack: Node.js + Express + MongoDB · React + Vite + Tailwind · Meta Cloud API · Cloudinary

---

## 📊 HIGH-LEVEL SYSTEM OVERVIEW

```
┌──────────────────────────────────────────────────────────────────────┐
│                          WHATSAPP USER                               │
│                      sends "hi" / any text                           │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTPS POST
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│             META CLOUD API  (graph.facebook.com/v22.0)               │
│   Webhook → POST /api/webhook/meta  (HMAC-SHA256 verified)           │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   EXPRESS BACKEND  (Node.js)                         │
│                                                                      │
│   ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│   │  chatbot.js     │   │  flowEndpoint.js │   │sequenceEngine.js│  │
│   │  (inbound msgs) │   │  (flow screens)  │   │  (W2/W4/W5 cron)│  │
│   └────────┬────────┘   └────────┬─────────┘   └────────┬────────┘  │
│            │                     │                       │           │
│            └──────────┬──────────┘                       │           │
│                       │                                  │           │
│              ┌────────▼──────────────────────────────────▼────────┐  │
│              │              MongoDB (Mongoose)                     │  │
│              │  Users · Bookings · Programs · Batches · Events    │  │
│              │  Enquiries · PDFs · NurtureSequences · FAQs        │  │
│              │  FlowImages · BroadcastCampaigns · Offers          │  │
│              └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           │ REST API  (/api/*)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│              REACT ADMIN PANEL  (Vite + Tailwind)                    │
│   Dashboard · Users · Programs · Batches · Bookings · Broadcasts    │
│   Events · Enquiries · PDFs · Flow Images · FAQs · Offers           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ PROJECT STRUCTURE

```
Himalayan-Yoga/
├── backend/
│   ├── server.js                  # Express app entry, middleware, route registration
│   ├── middleware/
│   │   ├── auth.js                # JWT Bearer token verification
│   │   └── upload.js              # Multer file upload handler
│   ├── models/                    # Mongoose schemas
│   │   ├── Admin.js               # Admin login (username + bcrypt hash)
│   │   ├── User.js                # Registered WhatsApp students
│   │   ├── InboundMessage.js      # All contacts who have messaged the bot
│   │   ├── Program.js             # TTC / Practice / Retreat programs
│   │   ├── Batch.js               # Scheduled runs of programs (dates, spots, price)
│   │   ├── Booking.js             # Student bookings + journey state (W1→alumni)
│   │   ├── NurtureSequence.js     # Active W2/W4/W5 message sequences
│   │   ├── Event.js               # Upcoming events & workshops
│   │   ├── Enquiry.js             # Student enquiries from the flow
│   │   ├── Pdf.js                 # PDF resources shown in the flow
│   │   ├── FlowImage.js           # Named image slots for the WhatsApp flow
│   │   ├── FAQ.js                 # FAQ items shown in W2 nurture messages
│   │   ├── Offer.js               # Payment plan offers used in W2 D25 message
│   │   └── BroadcastCampaign.js   # Bulk WhatsApp message campaigns
│   ├── routes/                    # Express route handlers
│   │   ├── auth.js                # POST /login, GET /verify
│   │   ├── webhook.js             # GET+POST /api/webhook/meta (Meta Hub)
│   │   ├── flowEndpoint.js        # POST /api/flow-endpoint (encrypted flow exchange)
│   │   ├── dashboard.js           # GET /api/dashboard/stats
│   │   ├── users.js               # CRUD /api/users
│   │   ├── programs.js            # CRUD /api/programs
│   │   ├── batches.js             # CRUD /api/batches
│   │   ├── bookings.js            # CRUD /api/bookings
│   │   ├── events.js              # CRUD /api/events
│   │   ├── enquiries.js           # CRUD /api/enquiries
│   │   ├── pdfs.js                # CRUD /api/pdfs (upload to Cloudinary)
│   │   ├── flowImages.js          # CRUD /api/flow-images (named image slots)
│   │   ├── faqs.js                # CRUD /api/faqs
│   │   ├── offers.js              # CRUD /api/offers
│   │   ├── sequences.js           # GET/DELETE /api/sequences
│   │   └── broadcasts.js          # POST /api/broadcasts (campaign send)
│   ├── services/
│   │   ├── metaCloud.js           # Meta Graph API wrapper (sendText, sendFlowMessage, etc.)
│   │   ├── chatbot.js             # Inbound message handler, greeting detection
│   │   ├── sequenceEngine.js      # W2/W3/W4/W5 message scheduling & firing
│   │   ├── broadcastService.js    # Bulk message send logic
│   │   ├── cloudinary.js          # Cloudinary upload helper
│   │   ├── flowImages.js          # FlowImage DB ↔ Cloudinary URL resolver
│   │   ├── flowJson.js            # Builds the WhatsApp Flow JSON definition
│   │   ├── imageBase64.js         # Fetches image URL → base64 (with Cloudinary transforms)
│   │   └── displayName.js        # Resolves phone → name for enquiries list
│   ├── flow_keys/
│   │   ├── private.pem            # RSA private key for flow payload decryption
│   │   └── public.pem             # RSA public key uploaded to Meta
│   └── scripts/
│       ├── sequenceWorker.js      # Cron worker (runs processTick every hour)
│       ├── seed-admin.js          # Seeds default admin account
│       ├── create-flow.js         # Creates WhatsApp Flow via Meta API
│       ├── sync-flow.js           # Uploads flow JSON + publishes flow
│       ├── generate-flow-keys.js  # Generates RSA key pair for encryption
│       ├── upload-public-key.js   # Uploads public key to Meta WABA
│       └── subscribe-waba.js      # Subscribes WABA to webhook fields
│
└── frontend/
    ├── src/
    │   ├── App.jsx                # Router, auth guard, all page routes
    │   ├── api.js                 # Axios instance (base URL + JWT header)
    │   ├── components/
    │   │   └── Layout.jsx         # Sidebar nav, topbar, Outlet
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       ├── RegisteredUsers.jsx
    │       ├── NonRegisteredUsers.jsx
    │       ├── Programs.jsx
    │       ├── Batches.jsx
    │       ├── Bookings.jsx
    │       ├── Events.jsx
    │       ├── Enquiries.jsx
    │       ├── Pdfs.jsx
    │       ├── FlowImages.jsx
    │       ├── FAQs.jsx
    │       ├── Offers.jsx
    │       ├── Sequences.jsx
    │       └── Broadcasts.jsx
    └── dist/                      # Production build output
```

---

## 🔐 AUTHENTICATION

```
Admin Panel Login
      │
      ▼
POST /api/auth/login
  { username, password }
      │
      ▼
  bcryptjs.compare(password, Admin.passwordHash)
      │
   success ──► sign JWT (jsonwebtoken)
                └── stored in localStorage as 'hy_token'
                └── sent as: Authorization: Bearer <token>
      │
  All /api/* routes (except webhook + flow-endpoint) require:
  middleware/auth.js → verifies JWT → req.admin = payload
```

---

## 📱 WHATSAPP FLOW — HOW IT WORKS

### Encryption Layer (RSA + AES-128-GCM)

```
Meta sends encrypted POST to /api/flow-endpoint
      │
      ▼
  1. RSA-OAEP-SHA256 decrypt the AES key (using private.pem)
  2. AES-128-GCM decrypt the flow payload using IV
  3. Parse JSON → { action, screen, data, flow_token, version }
      │
  Handle action:
  ├── "ping"          → return { status: "active" }
  ├── "INIT" / "BACK" → run handleInit(flow_token)
  └── "data_exchange" → run handleDataExchange({ screen, data, flow_token })
      │
      ▼
  4. Encrypt response: flip IV bits → AES-128-GCM encrypt → base64 string
  5. Return encrypted string as text/plain
```

### Flow Token → Phone Mapping

```
flow_token = "welcome_<phone>"
phoneFromToken(token) → strips "welcome_" prefix → extracts digits
Used to look up User, build personalized screens
```

### Image Loading (10-min cache)

```
loadImagesB64()
      │
      ▼
  FlowImage model → Cloudinary URLs for all named slots:
  flow_welcome_banner, banner_ttc, banner_practice, banner_retreat,
  banner_register, banner_profile, banner_events, banner_enquiry,
  icon_ttc, icon_practice, icon_retreat, icon_register, icon_profile,
  icon_events, icon_enquiry, icon_pdfs, chat_welcome_header
      │
      ▼
  urlToBase64(url, transformOptions) → Cloudinary crop/resize → base64 JPEG
  Cached for 10 minutes in memory (imgCache)
```

---

## 🗺️ WHATSAPP FLOW SCREEN MAP

```
INIT / BACK
    │
    ▼
SERVICE_SELECT
    ├── ttc        → TTC_COURSE_SELECT  (batches list)
    │                   └── ttc_batch_pick  → TTC_CONFIRM  ──► [webhook: ttc_confirm]
    │
    ├── practice   → PRACTICE_PROGRAM_SELECT  (programs list)
    │                   └── practice_program_pick  → PRACTICE_SESSION_SELECT  (sessions)
    │                                                    └── practice_session_pick → PRACTICE_CONFIRM ──► [webhook: practice_confirm]
    │
    ├── retreat    → RETREAT_PROGRAM_SELECT  (programs list)
    │                   └── retreat_program_pick  → RETREAT_DATE_SELECT  (dates)
    │                                                  └── retreat_date_pick → RETREAT_CONFIRM ──► [webhook: retreat_confirm]
    │
    ├── register   → REGISTER  (name, email, dob, gender form)
    │                   └── submit → upsert User → INFO  "Registration successful"
    │
    ├── profile    → PROFILE  (shows User fields from DB)
    │                   └── close → INFO
    │
    ├── events     → EVENTS  (list from DB)
    │                   └── event_pick → EVENT_DETAILS  (title, dates, description)
    │                                       └── register interest → Enquiry.create → INFO
    │
    ├── enquiry    → ENQUIRY  (name + message form)
    │                   └── submit → Enquiry.create → INFO  "Thank you"
    │
    └── pdfs       → PDFS  (list from DB)
                        └── pdf_pick → [webhook: pdf_pick → sendDocument/sendFlowMessage]

All unmatched actions → INFO screen  "Type hi to open the menu"
```

---

## 🌊 COMPLETE STUDENT JOURNEY  (W1 → W5)

### W1 · DISCOVERY

```
User sends "hi" / greeting
        │
        ▼  chatbot.js → isGreeting() check (regex)
        │
        ▼  sendWelcomeFlow(phone)
┌─────────────────────────────────────────┐
│  WhatsApp Chat message:                 │
│  Header: chat_welcome_header image      │
│  Body:   "Namaste 🙏 Welcome to..."     │
│  CTA:    [ 🌿 Choose Service ]          │  ← opens Flow
└─────────────────────────────────────────┘
        │
        ▼  User taps CTA → Flow opens
        │  Meta POSTs INIT to /api/flow-endpoint
        ▼
SERVICE_SELECT screen
(see Flow Screen Map above)
        │
        ▼  User picks TTC / Practice / Retreat → selects batch
        │  Flow reaches terminal CONFIRM screen → complete action
        │  Meta fires nfm_reply webhook to /api/webhook/meta
        ▼
handleFlowCompletion()
  payload.kind = "ttc_confirm" | "practice_confirm" | "retreat_confirm"
        │
        ▼  handleProgramConfirm(phone, batchId, programType)
  1. Fetch Batch + Program from DB
  2. Upsert Booking (status: pending, currentFlow: w1, intent: type)
  3. Send brochure PDF + details message
  4. Send Yes/No reply buttons (2s delay)
        │
        ├── User taps "Yes, Book Now"  ──► handleReplyButton → sends Pay Now flow message
        │                                  (currently opens flow with "Pay Now 💳" CTA)
        │
        └── User taps "No, Not Yet"   ──► sendText("No problem...")
                                          startSequence(w2, startDate = now + 48hrs)
                                          Booking.currentFlow = 'w2'

Any text reply during W2 → NurtureSequence.status = 'cancelled' → re-enters W1
```

### W2 · NURTURE SEQUENCE (48-hour delay, then 45-day drip)

```
Triggered: User taps "No" after brochure, OR 48hrs silence
Worker:    sequenceWorker.js runs processTick() every 1 hour

Schedule  Day  Message Content
────────  ───  ──────────────────────────────────────────────────────
  D+0       0  Full brochure PDF + "Here's everything you need to decide"
  D+3       3  Testimonial story message (text) + Choose Service CTA
  D+7       7  "A day in the life" gallery description + Choose Service CTA
  D+12     12  Top 7 FAQ questions (inline text) + "reply for personal answer"
  D+18     18  Live spot count from Batch DB + urgency message
  D+25     25  Payment plan offer (from Offer model in DB) + Choose Service CTA
  D+35     35  Final early bird deadline message + Choose Service CTA

All messages include: Choose Service CTA → re-opens main WhatsApp Flow
Any reply from student → W2 cancelled → chatbot.handleInbound fires → W1 restart
```

### W3 · BOOKING CONFIRMATION

```
Triggered: Payment confirmed (manual admin update or payment webhook)

  Instant  → Receipt PDF (if available) + "Welcome to the family" message
              bookingRef = HYA-YYYY-XXXX (auto-generated on save)
  +2 min   → Emotional confirmation text ("You've made a decision that changes lives")
  +1 hr    → Pre-arrival package list (6 items: syllabus, food, accommodation, travel, packing, fitness)
  
  Booking.currentFlow updated to 'w3'
  W4 sequence starts (scheduled from courseStartDate)
```

### W4 · PRE-ARRIVAL COUNTDOWN

```
Triggered: startSequence(w4) — calendar-based, checked hourly by cron
Reference: courseStartDate stored in Booking + NurtureSequence.meta

Days Before Start  Message
─────────────────  ──────────────────────────────────────────────────
     D-38          Diet prep tip — start vegetarian / reduce caffeine
     D-21          Daily practice video prompt (teacher sends personally)
     D-14          Travel tip — fly to Dehradun (DED), not Delhi
     D-7           Final checklist (passport, visa, insurance, packing)
     D-2           "2 days away!" + personal voice message announcement
     D-0           Arrival day — driver pickup coordination
                   ⚠️ After D-0: bot goes silent, human staff takes over
```

### W5 · POST-COURSE & ALUMNI

```
Triggered: courseEndDate reached — cron fires W5 sequence

Days After End  Message
──────────────  ──────────────────────────────────────────────────────
     D+0        Congratulations + YA certificate processing confirmation
     D+3        Review request (Google + TripAdvisor links)
     D+7        Referral program invitation
     D+30       Check-in message ("How's your teaching going?")
     D+60       Alumni upsell — 300hr Advanced TTC with alumni discount

Booking.currentFlow updated to 'alumni' after W5 completes
```

---

## 🛠️ ADMIN PANEL — ALL PAGES

The admin panel is a React SPA (Vite + Tailwind CSS) served separately. All routes are protected by JWT auth stored in `localStorage`.

### Login
```
POST /api/auth/login → { username, password }
Returns JWT → stored as 'hy_token'
GET  /api/auth/verify → validates token on app load
```

### Dashboard  `/`
```
GET /api/dashboard/stats
Shows:
  ├── registeredUsers      (User collection count)
  ├── nonRegisteredUsers   (InboundMessage count - User count)
  ├── totalContacts        (all who have messaged)
  ├── totalBookings
  ├── confirmedBookings
  ├── w2Active             (active nurture sequences)
  ├── enquiries / newEnquiries
  ├── recentUsers          (last 5 registered)
  ├── recentEnquiries      (last 5)
  └── recentBookings       (last 5 confirmed)
```

### Registered Users  `/registered`
```
GET /api/users         → list all registered students
Source: User model (created when student completes REGISTER flow screen)
Fields: phone, name, email, dob, gender, registeredAt
```

### Non-Registered Users  `/non-registered`
```
GET /api/users/non-registered (or similar)
Source: InboundMessage model — everyone who messaged but has no User record
Fields: phone, profileName, firstSeenAt, lastSeenAt, messageCount, lastMessage
```

### Programs  `/programs`
```
GET/POST/PUT/DELETE /api/programs
Manages: ttc | practice | retreat program cards
Fields: type, name, description, logoUrl (Cloudinary), brochurePdfUrl (Cloudinary),
        price, durationDays, active, sortOrder
Used by: Flow screens PRACTICE_PROGRAM_SELECT, RETREAT_PROGRAM_SELECT
         W2 brochure message, W3 receipt
```

### Batches  `/batches`
```
GET/POST/PUT/DELETE /api/batches
Manages: Scheduled dates/runs for each program
Fields: programId (ref), programType, name, startDate, endDate,
        sessionTiming, spotsTotal, spotsBooked, price,
        earlyBirdPrice, earlyBirdDeadline, active
Used by: Flow screens TTC_COURSE_SELECT, PRACTICE_SESSION_SELECT, RETREAT_DATE_SELECT
         W2 D-18 spot count, W4 countdown dates
```

### Bookings  `/bookings`
```
GET/PUT /api/bookings
View & manage student bookings
Fields: phone, name, programName, batchName, amountPaid, paymentStatus,
        bookingRef, currentFlow (w1/w2/w3/w4/w5/alumni),
        courseStartDate, courseEndDate, intent, leadScore
Admin can: update paymentStatus → 'confirmed' → triggers W3 + bookingRef generation
```

### Events  `/events`
```
GET/POST/PUT/DELETE /api/events
Fields: title, description, fromDate, toDate, image (Cloudinary), active
Used by: Flow EVENTS screen and EVENT_DETAILS screen
```

### Enquiries  `/enquiries`
```
GET/PUT /api/enquiries
Fields: name, phone, enquiry, status (new/read/replied), createdAt
Source: ENQUIRY flow screen + EVENT_DETAILS register interest button
```

### PDFs  `/pdfs`
```
GET/POST/PUT/DELETE /api/pdfs
Fields: name, description, pdfUrl (Cloudinary), imageUrl (thumbnail), active
Used by: Flow PDFS screen → student picks PDF → sent via sendDocument/sendFlowMessage
```

### Flow Images  `/flow-images`
```
GET/POST/DELETE /api/flow-images
Manages named image slots uploaded to Cloudinary:
┌─────────────────────────────┬────────────────────────────────────────┐
│  Slot Key                   │  Where Used                            │
├─────────────────────────────┼────────────────────────────────────────┤
│  chat_welcome_header        │  Welcome message image header in chat  │
│  flow_welcome_banner        │  SERVICE_SELECT screen banner          │
│  banner_ttc                 │  TTC_COURSE_SELECT banner              │
│  banner_practice            │  PRACTICE_PROGRAM_SELECT banner        │
│  banner_retreat             │  RETREAT_PROGRAM_SELECT banner         │
│  banner_register            │  REGISTER screen banner                │
│  banner_profile             │  PROFILE screen banner                 │
│  banner_events              │  EVENTS screen banner                  │
│  banner_enquiry             │  ENQUIRY screen banner                 │
│  icon_ttc                   │  TTC radio button icon                 │
│  icon_practice              │  Practice radio button icon            │
│  icon_retreat               │  Retreat radio button icon             │
│  icon_register              │  Register radio button icon            │
│  icon_profile               │  Profile radio button icon             │
│  icon_events                │  Events radio button icon              │
│  icon_enquiry               │  Enquiry radio button icon             │
│  icon_pdfs                  │  PDFs radio button icon                │
└─────────────────────────────┴────────────────────────────────────────┘
Images auto-resize via Cloudinary transforms before embedding as base64 in Flow JSON.
Cache TTL: 10 minutes (cleared on upload).
```

### FAQs  `/faqs`
```
GET/POST/PUT/DELETE /api/faqs
Fields: question, answer, active, sortOrder
Used by: W2 D-12 message (sent as inline text in WhatsApp message)
```

### Offers  `/offers`
```
GET/POST/PUT/DELETE /api/offers
Fields: name, description, depositAmount, balanceAmount, balanceDueDays, active
Used by: W2 D-25 message — "Flexible Payment Plan" offer text
```

### Sequences  `/sequences`
```
GET/DELETE /api/sequences
View all active/completed/cancelled NurtureSequence records
Fields: phone, flowType (w2/w4/w5), status, startDate, completedDays, meta
Admin can cancel a running sequence from this page
```

### Broadcasts  `/broadcasts`
```
GET/POST /api/broadcasts
Send bulk WhatsApp messages to a segment of users
Fields: name, targetSegment, messageType, messageBody, status, sentCount, failCount
broadcastService.js → iterates recipients → meta.sendText/sendFlowMessage per user
```

---

## 🔌 API ROUTES REFERENCE

```
Auth
  POST   /api/auth/login            Admin login → JWT
  GET    /api/auth/verify           Verify stored JWT

Webhook (public — HMAC verified)
  GET    /api/webhook/meta          Meta hub verification challenge
  POST   /api/webhook/meta          Inbound messages, flow completions, button replies

Flow (public — RSA/AES encrypted)
  POST   /api/flow-endpoint         WhatsApp Flow data exchange (INIT / data_exchange)

Dashboard (auth required)
  GET    /api/dashboard/stats       Aggregated stats + recent records

Users (auth required)
  GET    /api/users                 All registered students
  POST   /api/users                 Create student
  PUT    /api/users/:id             Update student
  DELETE /api/users/:id             Delete student

Programs (auth required)
  GET    /api/programs              List programs (filter by type)
  POST   /api/programs              Create program (with logo/brochure upload)
  PUT    /api/programs/:id          Update program
  DELETE /api/programs/:id          Delete program

Batches (auth required)
  GET    /api/batches               List batches (filter by programId/type)
  POST   /api/batches               Create batch
  PUT    /api/batches/:id           Update batch
  DELETE /api/batches/:id           Delete batch

Bookings (auth required)
  GET    /api/bookings              List all bookings
  PUT    /api/bookings/:id          Update booking (confirm payment, update flow state)

Events (auth required)
  GET    /api/events                List events
  POST   /api/events                Create event
  PUT    /api/events/:id            Update event
  DELETE /api/events/:id            Delete event

Enquiries (auth required)
  GET    /api/enquiries             List enquiries
  PUT    /api/enquiries/:id         Update status (new → read → replied)

PDFs (auth required)
  GET    /api/pdfs                  List PDFs
  POST   /api/pdfs                  Upload PDF + thumbnail to Cloudinary
  PUT    /api/pdfs/:id              Update PDF metadata
  DELETE /api/pdfs/:id              Delete PDF

Flow Images (auth required)
  GET    /api/flow-images           List all named image slots
  POST   /api/flow-images           Upload image to slot (Cloudinary + DB)
  DELETE /api/flow-images/:id       Delete image slot

FAQs (auth required)
  GET    /api/faqs                  List FAQs
  POST   /api/faqs                  Create FAQ
  PUT    /api/faqs/:id              Update FAQ
  DELETE /api/faqs/:id              Delete FAQ

Offers (auth required)
  GET    /api/offers                List payment plan offers
  POST   /api/offers                Create offer
  PUT    /api/offers/:id            Update offer
  DELETE /api/offers/:id            Delete offer

Sequences (auth required)
  GET    /api/sequences             List nurture sequences
  DELETE /api/sequences/:id         Cancel a sequence

Broadcasts (auth required)
  GET    /api/broadcasts            List campaigns
  POST   /api/broadcasts            Send broadcast campaign
```

---

## 🗄️ DATA MODELS

### User
```javascript
{
  phone: String,          // E.164 digits, no +, unique index
  name: String,
  email: String,
  dob: String,            // yyyy-mm-dd
  gender: String,         // male | female | other | ""
  registeredAt: Date
}
```

### Program
```javascript
{
  type: String,           // ttc | practice | retreat
  name: String,
  description: String,
  logoUrl: String,        // Cloudinary URL (200×200 shown in flow radio list)
  brochurePdfUrl: String, // Sent to student after flow completion
  price: Number,          // INR base price
  durationDays: Number,
  active: Boolean,
  sortOrder: Number
}
```

### Batch
```javascript
{
  programId: ObjectId,    // ref: Program
  programType: String,    // ttc | practice | retreat
  name: String,           // "200hr TTC — Nov 2026"
  startDate: Date,
  endDate: Date,
  sessionTiming: String,  // "6:00am – 7:30am" (practice sessions)
  spotsTotal: Number,
  spotsBooked: Number,    // virtual: spotsLeft = spotsTotal - spotsBooked
  price: Number,          // overrides program.price if > 0
  earlyBirdPrice: Number,
  earlyBirdDeadline: Date,
  active: Boolean
}
```

### Booking
```javascript
{
  phone: String,
  name: String,
  programId: ObjectId,    // ref: Program
  batchId: ObjectId,      // ref: Batch
  programType: String,
  programName: String,
  batchName: String,
  amountPaid: Number,
  paymentStatus: String,  // pending | confirmed | partial | failed
  paymentRef: String,     // Razorpay ID or WhatsApp pay ref
  bookingRef: String,     // HYA-YYYY-XXXX (auto-generated on confirm)
  receiptPdfUrl: String,
  currentFlow: String,    // w1 | w2 | w3 | w4 | w5 | alumni
  courseStartDate: Date,
  courseEndDate: Date,
  w2StartDate: Date,
  intent: String,         // ttc | practice | retreat
  language: String,       // EN (default)
  leadScore: String       // cold | warm | hot
}
```

### NurtureSequence
```javascript
{
  phone: String,
  flowType: String,       // w2 | w4 | w5
  bookingId: ObjectId,
  startDate: Date,
  status: String,         // active | completed | cancelled
  completedDays: [Number],// days already fired
  meta: {
    programName, batchName, batchId,
    brochurePdfUrl, brochurePdfName,
    userName, courseStartDate, bookingRef
  }
}
```

---

## ⚙️ ENVIRONMENT VARIABLES

```
# MongoDB
MONGODB_URI=

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin

# JWT
JWT_SECRET=

# Meta / WhatsApp
META_ACCESS_TOKEN=
META_PHONE_NUMBER_ID=
META_WABA_ID=
META_APP_SECRET=              # for HMAC webhook signature verification
META_VERIFY_TOKEN=            # for hub.challenge verification
META_GRAPH_VERSION=v22.0

# WhatsApp Flow
WHATSAPP_FLOW_ID=
WHATSAPP_FLOW_STATUS=draft    # draft | published
FLOW_PRIVATE_KEY=             # RSA private key (\\n-escaped)

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# App
PORT=5000
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com

# Optional
DRIVER_PHONE=                 # Driver WhatsApp number for D-0 pickup message
GOOGLE_REVIEW_LINK=
TRIPADVISOR_LINK=
```

---

## 🚀 BACKGROUND WORKER

```
scripts/sequenceWorker.js
      │
      ▼  runs sequenceEngine.processTick() every 1 hour
      │
      ▼  processTick():
  1. Fetches all NurtureSequence where status = 'active'
  2. For each sequence:
     ├── w2: daysDiff(startDate, now) → fires due days from W2_SCHEDULE [0,3,7,12,18,25,35]
     ├── w4: daysUntilCourseStart → fires due days from W4_SCHEDULE [-38,-21,-14,-7,-2,0]
     └── w5: daysDiff(courseEndDate, now) → fires due days from W5_SCHEDULE [0,3,7,30,60]
  3. Marks each fired day in completedDays ($addToSet)
  4. Sets status = 'completed' when all days done

Run separately from main server:
  npm run worker
```

---

## 🔄 MESSAGE FLOW — INBOUND WEBHOOK

```
POST /api/webhook/meta
      │
      ▼  verifySignature() — HMAC-SHA256 (META_APP_SECRET)
      │
      ▼  Iterate body.entry[].changes[].value.messages[]
      │
      ├── msg.type === 'interactive' && interactive.type === 'nfm_reply'
      │       └── handleFlowCompletion(msg)
      │             ├── kind = 'pdf_pick'        → send PDF document
      │             ├── kind = 'ttc_confirm'     → handleProgramConfirm(phone, batchId, 'ttc')
      │             ├── kind = 'practice_confirm' → handleProgramConfirm(...)
      │             └── kind = 'retreat_confirm'  → handleProgramConfirm(...)
      │
      ├── msg.type === 'interactive' && interactive.type === 'button_reply'
      │       └── buttonId starts with 'yes_book_' or 'no_later_'
      │             ├── yes_book_{bookingId} → send Pay Now flow message
      │             └── no_later_{bookingId} → sendText + startSequence(w2, +48hrs)
      │             (also cancels any active W2 sequence on re-engagement)
      │
      ├── msg.type === 'text'
      │       └── If W2 active for this phone → cancel W2 sequence
      │           → chatbot.handleInbound({ phone, text })
      │               ├── isGreeting(text) → sendWelcomeFlow(phone)
      │               └── else → "Type hi to open the menu"
      │
      └── All paths: trackInbound({ phone, profileName, text })
                     → upserts InboundMessage record
```

---

## 📦 TECH STACK SUMMARY

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| File Storage | Cloudinary (images + PDFs) |
| File Uploads | Multer |
| WhatsApp API | Meta Cloud API v22.0 (axios) |
| Flow Encryption | RSA-OAEP-SHA256 + AES-128-GCM |
| Admin Frontend | React 18 + Vite + Tailwind CSS |
| Routing | React Router v6 |
| HTTP Client | axios |
| Icons | lucide-react |
| Security | helmet, cors, compression |
| Background Jobs | Node.js setInterval (sequenceWorker.js) |
| Image Processing | sharp (server), Cloudinary transforms (flow) |

---

## 📋 COMPLETE FLOW JSON STRUCTURE

The flow is built by `services/flowJson.js` and uploaded to Meta via `scripts/sync-flow.js`.

```
Flow version:      7.0
Data API version:  3.0
Mode:              Endpoint (data_exchange — all screens backed by /api/flow-endpoint)

Routing model:
  SERVICE_SELECT
    ├── TTC_COURSE_SELECT → TTC_CONFIRM (terminal)
    ├── PRACTICE_PROGRAM_SELECT → PRACTICE_SESSION_SELECT → PRACTICE_CONFIRM (terminal)
    ├── RETREAT_PROGRAM_SELECT  → RETREAT_DATE_SELECT  → RETREAT_CONFIRM (terminal)
    ├── REGISTER → INFO (terminal)
    ├── PROFILE  → INFO (terminal)
    ├── EVENTS   → EVENT_DETAILS → INFO (terminal)
    ├── ENQUIRY  → INFO (terminal)
    └── PDFS (terminal — complete action fires webhook)

Screen types:
  Data screens     → send data_exchange action on Continue/Submit
  Terminal screens → TTC_CONFIRM, PRACTICE_CONFIRM, RETREAT_CONFIRM, PDFS, INFO
                     use "complete" action → triggers nfm_reply in webhook

UI components used per screen:
  Image            → banner (1000×125) or event image, visible=${data.has_*}
  TextHeading      → main title
  TextSubheading   → subtitle
  TextBody         → body copy
  TextCaption      → small metadata text
  RadioButtonsGroup→ service list, batch list, program list, PDF list
  TextInput        → name, email, phone (disabled), DOB
  DatePicker       → date of birth
  Dropdown         → gender
  TextArea         → enquiry message
  Footer           → CTA button with on-click-action
```

### Terminal Screen Payloads (nfm_reply → webhook)

```javascript
// TTC_CONFIRM
{ kind: 'ttc_confirm', selected_batch: '<batchId>' }

// PRACTICE_CONFIRM
{ kind: 'practice_confirm', selected_batch: '<batchId>', selected_program: '<programId>' }

// RETREAT_CONFIRM
{ kind: 'retreat_confirm', selected_batch: '<batchId>', selected_program: '<programId>' }

// PDFS
{ kind: 'pdf_pick', selected_pdf: '<pdfId>' }

// INFO, REGISTER, PROFILE, EVENTS, ENQUIRY
// → no payload (flow just closes)
```

---

## 📡 W6 · BROADCAST CAMPAIGNS

Admin-triggered bulk messages sent to segmented lead lists. Managed from the Broadcasts page.

### Segments

```
cold    → InboundMessage contacts who have NO Booking record
           (people who messaged but never selected a program)

warm    → Bookings where currentFlow = 'w1' or 'w2'
           (interested but not yet paid)

alumni  → Bookings where currentFlow = 'w5' or 'alumni'
           (completed course)

all     → union of all three segments (deduped by phone)
```

### Campaign Execution Flow

```
Admin creates campaign in admin panel
  ↓
POST /api/broadcasts/:id/send
  ↓
broadcastService.executeCampaign(campaignId)
  ↓
BroadcastCampaign.status = 'sending'
  ↓
buildRecipients(segments) → Set of unique phone numbers
  ↓
For each phone (200ms delay between sends):
  ├── If WHATSAPP_FLOW_ID set:
  │     sendFlowMessage(phone, { headerType, headerUrl, bodyText, ctaLabel })
  └── Else:
        sendText(phone, bodyText)
  ↓
BroadcastCampaign.status = 'sent'
BroadcastCampaign.sentCount / failCount updated
```

### Campaign Fields

```javascript
{
  name: String,
  triggerType: 'season_opening' | 'batch_launch' | 'new_year' | 'milestone' | 'manual',
  scheduledAt: Date,              // future: for scheduled sends
  segments: ['cold','warm','alumni','all'],
  headerType: 'image' | 'video' | 'document' | 'text',
  headerUrl: String,              // Cloudinary URL for image/doc headers
  headerFilename: String,         // display filename for document headers
  bodyText: String,
  footerText: String,             // default: "Himalayan Yoga Academy"
  ctaLabel: String,               // default: "Choose Service"
  language: String,               // default: "EN"
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed',
  sentCount: Number,
  failCount: Number,
  sentAt: Date
}
```

---

## 🗃️ REMAINING DATA MODELS

### Event
```javascript
{
  title: String,
  description: String,
  image: String,        // Cloudinary URL — shown in EVENTS and EVENT_DETAILS flow screens
  fromDate: Date,
  toDate: Date,
  active: Boolean
}
// Index: { active: 1, fromDate: 1 }
// Flow query: active=true, toDate >= now, sorted by fromDate, limit 10
```

### Enquiry
```javascript
{
  name: String,
  phone: String,
  enquiry: String,
  status: 'new' | 'in_progress' | 'resolved',   // admin updates in panel
  notes: String                                   // admin internal notes
}
// Created by: ENQUIRY flow screen submit + EVENT_DETAILS register interest
```

### FAQ
```javascript
{
  question: String,
  answer: String,
  language: String,      // default: "EN" — for future multi-language support
  sortOrder: Number,
  active: Boolean
}
// Index: { language: 1, active: 1, sortOrder: 1 }
// Used by: W2 D-12 message — formatted as inline Q&A text in WhatsApp
```

### Offer
```javascript
{
  name: String,           // e.g. "3-Installment Plan"
  description: String,    // shown verbatim in WhatsApp W2 D-25 message
  depositAmount: Number,  // ₹15,000
  balanceAmount: Number,  // ₹30,000
  balanceDueDays: Number, // 30 — days before course start for balance
  active: Boolean
}
// W2 D-25: fetches most recent active offer, builds message from fields
```

### BroadcastCampaign
```javascript
{
  name: String,
  triggerType: 'season_opening'|'batch_launch'|'new_year'|'milestone'|'manual',
  scheduledAt: Date,
  segments: [String],       // cold | warm | alumni | all
  headerType: String,       // image | video | document | text
  headerUrl: String,        // Cloudinary URL
  headerPublicId: String,
  headerFilename: String,
  bodyText: String,
  footerText: String,
  ctaLabel: String,
  language: String,
  status: String,           // draft | scheduled | sending | sent | failed
  sentCount: Number,
  failCount: Number,
  sentAt: Date
}
```

### InboundMessage
```javascript
{
  phone: String,          // unique index — one doc per contact
  profileName: String,    // WhatsApp display name from webhook contacts[]
  firstSeenAt: Date,
  lastSeenAt: Date,
  lastMessage: String,    // truncated to 500 chars
  messageCount: Number    // incremented on every inbound message
}
// Upserted by chatbot.trackInbound() on every webhook message
// Used by: dashboard nonRegisteredUsers count, NonRegisteredUsers admin page
```

### FlowImage
```javascript
{
  key: String,            // e.g. "banner_ttc", "icon_practice" — unique
  url: String,            // Cloudinary URL
  publicId: String        // Cloudinary public_id for deletion
}
// Resolved by services/flowImages.js → getUrl(key), getMap(keys[])
// All URLs fetched at flow INIT, converted to base64 and cached 10 min
```

### Admin
```javascript
{
  username: String,       // unique
  passwordHash: String    // bcryptjs hash (rounds: 10)
}
// Seeded on first server start if no admin exists
// Username/password from ADMIN_USERNAME / ADMIN_PASSWORD env vars
```

---

## 🔧 SETUP SCRIPTS

All in `backend/scripts/` — run once during initial setup:

```
npm run seed:admin
  └── seed-admin.js
      Creates the default admin account in MongoDB
      Uses ADMIN_USERNAME + ADMIN_PASSWORD from .env

npm run flow:keys
  └── generate-flow-keys.js
      Generates RSA 2048-bit key pair
      Saves to flow_keys/private.pem + flow_keys/public.pem
      Private key → set as FLOW_PRIVATE_KEY in .env (\\n-escaped)

npm run flow:upload-key
  └── upload-public-key.js
      Uploads public.pem to Meta WABA encryption endpoint
      POST /v22.0/{phoneNumberId}/whatsapp_business_encryption

npm run flow:create
  └── create-flow.js
      Creates a new WhatsApp Flow via Meta API
      POST /v22.0/{wabaId}/flows
      Sets endpoint_uri to your /api/flow-endpoint URL
      Saves returned flow_id → set as WHATSAPP_FLOW_ID in .env

npm run flow:sync
  └── sync-flow.js
      Builds flow JSON via flowJson.buildFlowJSON()
      Uploads as asset to Meta flow
      Publishes the flow
      Run after any flow screen changes

node scripts/subscribe-waba.js
  └── Subscribes WABA to all required webhook fields
      (messages, messaging_postbacks, etc.)

node scripts/_envFile.js
  └── Helper to write/update .env values programmatically
```

---

## 🚀 RUNNING THE SYSTEM

### Development

```bash
# Terminal 1 — Backend API server
cd backend
npm run dev          # nodemon server.js → http://localhost:5000

# Terminal 2 — Sequence worker
cd backend
npm run worker       # node scripts/sequenceWorker.js (runs every 1hr)

# Terminal 3 — Frontend dev server
cd frontend
npm run dev          # Vite → http://localhost:5173
```

### Production (PM2 example)

```bash
# Backend
pm2 start backend/server.js --name himalayan-api

# Worker (separate process — MUST run alongside server)
pm2 start backend/scripts/sequenceWorker.js --name himalayan-worker

# Frontend
cd frontend && npm run build
# Serve dist/ via nginx or a static host
```

### CORS Setup

Set `ALLOWED_ORIGINS` in backend `.env` to the admin panel domain:
```
ALLOWED_ORIGINS=https://admin.himalayanyoga.com
```

---

## 🔐 SECURITY NOTES

```
Webhook (POST /api/webhook/meta)
  └── HMAC-SHA256 verified using META_APP_SECRET
      Raw body buffered in express.json verify callback
      Signature from x-hub-signature-256 header
      Uses crypto.timingSafeEqual() to prevent timing attacks

Flow Endpoint (POST /api/flow-endpoint)
  └── RSA-OAEP-SHA256 decrypts AES key using private.pem
      AES-128-GCM decrypts payload
      Response encrypted with flipped IV
      Returns as text/plain base64 string
      Returns HTTP 421 if decryption fails

Admin API Routes
  └── All /api/* routes (except webhook + flow-endpoint) require JWT
      middleware/auth.js verifies Bearer token
      JWT signed with JWT_SECRET (falls back to 'dev-secret' in dev)

Password Storage
  └── bcryptjs with 10 salt rounds
      Plaintext password never stored

HTTP Security Headers
  └── helmet() — removes X-Powered-By, sets various security headers
      contentSecurityPolicy: false (needed for API server)
      crossOriginEmbedderPolicy: false

CORS
  └── Only ALLOWED_ORIGINS env var entries allowed
      localhost:* allowed only in non-production
      credentials: true (for JWT cookie fallback)
```

---

## 📊 ADMIN PANEL — PAGE-BY-PAGE SUMMARY

| Page | Route | API | Primary Action |
|---|---|---|---|
| Login | `/login` | `POST /api/auth/login` | Authenticate admin |
| Dashboard | `/` | `GET /api/dashboard/stats` | View KPIs + recent records |
| Registered Users | `/registered` | `GET /api/users` | View/search students |
| Non-Registered | `/non-registered` | `GET /api/users/...` | View contacts without profile |
| Programs | `/programs` | `/api/programs` | Create/edit TTC, Practice, Retreat programs |
| Batches | `/batches` | `/api/batches` | Schedule batch dates, spots, pricing |
| Bookings | `/bookings` | `/api/bookings` | View bookings, confirm payment, track journey |
| Events | `/events` | `/api/events` | Create/edit upcoming events with images |
| Enquiries | `/enquiries` | `/api/enquiries` | Read & update enquiry status |
| PDFs | `/pdfs` | `/api/pdfs` | Upload PDF resources + thumbnails |
| Flow Images | `/flow-images` | `/api/flow-images` | Upload named images for flow screens |
| FAQs | `/faqs` | `/api/faqs` | Manage FAQ Q&A shown in W2 D-12 |
| Offers | `/offers` | `/api/offers` | Create payment plan offers for W2 D-25 |
| Sequences | `/sequences` | `/api/sequences` | Monitor & cancel nurture sequences |
| Broadcasts | `/broadcasts` | `/api/broadcasts` | Create & send W6 bulk campaigns |

---

## 🔁 KEY SERVICE DEPENDENCIES

```
chatbot.js
  ├── uses: metaCloud.sendFlowMessage, metaCloud.sendText
  ├── uses: flowImages.getUrl (for chat_welcome_header)
  └── uses: InboundMessage model (trackInbound)

webhook.js (route)
  ├── uses: chatbot.handleInbound
  ├── uses: metaCloud.sendFlowMessage, sendText, sendReplyButtons
  ├── uses: Batch, Program, Booking, NurtureSequence, Pdf models
  └── uses: sequenceEngine.startSequence, startW3

flowEndpoint.js (route)
  ├── uses: flowImages.getMap → imageBase64.urlToBase64 (base64 cache)
  ├── uses: metaCloud.sendFlowMessage, sendReplyButtons
  ├── uses: User, Event, Enquiry, Pdf, Program, Batch, Booking models
  └── uses: sequenceEngine.startSequence

sequenceEngine.js
  ├── uses: metaCloud.sendFlowMessage, sendText
  ├── uses: flowImages.getUrl
  ├── uses: NurtureSequence, Booking, Offer, Batch models
  └── exports: startSequence, startW3, processTick

broadcastService.js
  ├── uses: metaCloud.sendFlowMessage, sendText
  ├── uses: BroadcastCampaign, Booking, InboundMessage models
  └── exports: executeCampaign, buildRecipients

flowImages.js (service)
  ├── reads: FlowImage model (MongoDB)
  └── exports: getUrl(key), getMap(keys[])

imageBase64.js (service)
  ├── fetches: Cloudinary URL with transform params
  ├── uses: sharp for resize/convert
  └── returns: base64 string for embedding in Flow JSON
```
