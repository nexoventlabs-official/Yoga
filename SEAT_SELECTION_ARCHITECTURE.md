# 🪑 WHATSAPP NATIVE SEAT / SLOT SELECTION — ARCHITECTURE
> **Technique:** `CheckboxGroup` / `RadioButtonsGroup` with `media-size: "large"`
> **Min Version:** Flow JSON **v5.0+** (we use v7.0 — fully supported)
> **No WebView. Fully native inside WhatsApp Flow screen.**

---

## 📱 HOW IT LOOKS INSIDE WHATSAPP

```
╔══════════════════════════════════════╗
║  ←   Select Your Seat           ⋮   ║   ← Flow screen title
╠══════════════════════════════════════╣
║                                      ║
║  🚌 Himalayan Yoga — Retreat Bus     ║   ← TextHeading
║  Rishikesh → Delhi · 21 Jun 2026    ║   ← TextBody
║                                      ║
║  ┌──────────────────────────────┐   ║
║  │  Choose your seat            │   ║   ← CheckboxGroup label
║  │                              │   ║
║  │  ┌──────┐ ┌──────┐ ┌──────┐ │   ║
║  │  │  🟢  │ │  🟢  │ │  🔴  │ │   ║   ← media-size: "large"
║  │  │  1A  │ │  1B  │ │  1C  │ │   ║     renders as 3-column grid
║  │  └──────┘ └──────┘ └──────┘ │   ║
║  │                              │   ║
║  │  ┌──────┐ ┌──────┐ ┌──────┐ │   ║
║  │  │  🟢  │ │  🔴  │ │  🟢  │ │   ║
║  │  │  2A  │ │  2B  │ │  2C  │ │   ║
║  │  └──────┘ └──────┘ └──────┘ │   ║
║  │                              │   ║
║  │  ┌──────┐ ┌──────┐ ┌──────┐ │   ║
║  │  │  🔴  │ │  🟢  │ │  🟢  │ │   ║
║  │  │  3A  │ │  3B  │ │  3C  │ │   ║
║  │  └──────┘ └──────┘ └──────┘ │   ║
║  │                              │   ║
║  │  ┌──────┐ ┌──────┐ ┌──────┐ │   ║
║  │  │  🟢  │ │  🔴  │ │  🟢  │ │   ║
║  │  │  4A  │ │  4B  │ │  4C  │ │   ║
║  │  └──────┘ └──────┘ └──────┘ │   ║
║  └──────────────────────────────┘   ║
║                                     ║
║  🟢 Available   🔴 Booked           ║   ← TextCaption legend
║                                     ║
║  ┌──────────────────────────────┐   ║
║  │        Confirm Seat          │   ║   ← Footer button
║  └──────────────────────────────┘   ║
╚══════════════════════════════════════╝
```

---

## 🎨 WHAT MAKES THE GRID HAPPEN

The key is **`media-size: "large"`** on `CheckboxGroup` or `RadioButtonsGroup`.

```
media-size: "regular"  →  Vertical list (normal behaviour)
                          ○ [icon] Seat 1A  - Available
                          ○ [icon] Seat 1B  - Booked
                          ○ [icon] Seat 1C  - Available

media-size: "large"    →  3-column GRID (tile view)
                          ┌────┐ ┌────┐ ┌────┐
                          │ 1A │ │ 1B │ │ 1C │
                          └────┘ └────┘ └────┘
                          ┌────┐ ┌────┐ ┌────┐
                          │ 2A │ │ 2B │ │ 2C │
                          └────┘ └────┘ └────┘
```

WhatsApp **auto-flows 3 tiles per row** when `media-size: "large"` is used — exactly like the Zoomture bus screenshot.

---

## 🗂️ DATA ITEM STRUCTURE PER SEAT

Each seat in the `data-source` array:

```json
{
  "id": "1A",
  "title": "1A",
  "description": "",
  "image": "<base64 of seat icon — green or red>",
  "alt-text": "Seat 1A - Available",
  "enabled": true,
  "color": "#22c55e"
}
```

| Field | Purpose |
|---|---|
| `id` | Seat number sent to backend on selection |
| `title` | Label shown below the tile ("1A", "2B") |
| `image` | Base64 PNG — 🟢 green icon = available, 🔴 red = booked |
| `enabled` | `false` = booked seat (greyed out, not selectable) |
| `color` | Hex color tint on the tile (`#22c55e` green / `#ef4444` red) |
| `alt-text` | Accessibility label |

---

## 🔄 FULL FLOW SEQUENCE

```
STUDENT MESSAGES "hi"
        │
        ▼
Bot sends welcome flow message
        │
        ▼
Flow opens → SERVICE_SELECT
        │
        ▼ student selects "Retreat / Short Program"
RETREAT_PROGRAM_SELECT  (list of retreat programs)
        │
        ▼ student picks "Himalayan Wellness Retreat"
RETREAT_DATE_SELECT     (list of available batch dates)
        │
        ▼ student picks "1 Jul – 7 Jul 2026"
SEAT_SELECT             ← NEW SCREEN (native grid)
  Backend loads:
  - All seats for this batch from DB
  - Marks booked seats as enabled: false + red image
  - Returns data to flow screen
  - Student taps a green seat tile
  - CheckboxGroup (single or multi select)
        │
        ▼ student taps "Confirm Seat"
RETREAT_CONFIRM         (terminal — closes flow)
        │
        ▼ webhook fires with selected seat(s)
Bot sends: PDF brochure + "You selected Seat 1A" + [Yes Book] [No]
        │
        ▼
Payment → W3 → W4 → W5
```

---

## 📐 FLOW JSON SCREEN — SEAT_SELECT

```json
{
  "id": "SEAT_SELECT",
  "title": "Select Your Seat",
  "data": {
    "trip_info": {
      "type": "string",
      "__example__": "Rishikesh → Delhi · 21 Jun 2026"
    },
    "seats": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":          { "type": "string" },
          "title":       { "type": "string" },
          "description": { "type": "string" },
          "image":       { "type": "string" },
          "alt-text":    { "type": "string" },
          "enabled":     { "type": "boolean" }
        }
      },
      "__example__": [
        { "id": "1A", "title": "1A", "description": "", "image": "<green_b64>", "alt-text": "Seat 1A - Available",  "enabled": true  },
        { "id": "1B", "title": "1B", "description": "", "image": "<red_b64>",   "alt-text": "Seat 1B - Booked",    "enabled": false },
        { "id": "1C", "title": "1C", "description": "", "image": "<green_b64>", "alt-text": "Seat 1C - Available",  "enabled": true  },
        { "id": "2A", "title": "2A", "description": "", "image": "<green_b64>", "alt-text": "Seat 2A - Available",  "enabled": true  },
        { "id": "2B", "title": "2B", "description": "", "image": "<red_b64>",   "alt-text": "Seat 2B - Booked",    "enabled": false },
        { "id": "2C", "title": "2C", "description": "", "image": "<green_b64>", "alt-text": "Seat 2C - Available",  "enabled": true  },
        { "id": "3A", "title": "3A", "description": "", "image": "<red_b64>",   "alt-text": "Seat 3A - Booked",    "enabled": false },
        { "id": "3B", "title": "3B", "description": "", "image": "<green_b64>", "alt-text": "Seat 3B - Available",  "enabled": true  },
        { "id": "3C", "title": "3C", "description": "", "image": "<green_b64>", "alt-text": "Seat 3C - Available",  "enabled": true  }
      ]
    }
  },
  "layout": {
    "type": "SingleColumnLayout",
    "children": [
      {
        "type": "TextHeading",
        "text": "🚌 Himalayan Yoga Retreat Transfer"
      },
      {
        "type": "TextBody",
        "text": "${data.trip_info}"
      },
      {
        "type": "CheckboxGroup",
        "name": "selected_seats",
        "label": "Tap a seat to select",
        "required": true,
        "media-size": "large",
        "min-selected-items": 1,
        "max-selected-items": 2,
        "data-source": "${data.seats}"
      },
      {
        "type": "TextCaption",
        "text": "🟢 Available  ·  🔴 Booked (greyed out)"
      },
      {
        "type": "Footer",
        "label": "Confirm Seat",
        "on-click-action": {
          "name": "data_exchange",
          "payload": {
            "action": "seat_confirm",
            "selected_seats": "${form.selected_seats}"
          }
        }
      }
    ]
  }
}
```

---

## 🖼️ SEAT ICON IMAGES (base64)

Two tiny PNG icons are needed. Generate once, store as constants in backend:

```
AVAILABLE SEAT (green)    BOOKED SEAT (red)
┌──────────┐              ┌──────────┐
│          │              │          │
│    🟢    │              │    🔴    │
│          │              │    ╳     │
│          │              │          │
└──────────┘              └──────────┘
  100×100px                100×100px
  #22c55e fill             #ef4444 fill
  Rounded corners          Rounded corners
```

These are **tiny ~1KB base64 PNGs** — no Cloudinary needed.
Can be hardcoded as constants in `flowEndpoint.js`:

```javascript
// backend/services/seatIcons.js

const SEAT_AVAILABLE_B64 = `iVBORw0KGgo...`; // green seat icon
const SEAT_BOOKED_B64    = `iVBORw0KGgo...`; // red seat icon

module.exports = { SEAT_AVAILABLE_B64, SEAT_BOOKED_B64 };
```

---

## 🗄️ DATA MODEL — Seat

```javascript
// Extend Batch model with seat map
Batch {
  ...existing fields...
  seatLayout: {
    rows: Number,          // e.g. 4
    cols: Number,          // e.g. 3  → gives 4×3 = 12 seats
    seatLabels: [String],  // ["1A","1B","1C","2A","2B","2C"...]
                           // auto-generated from rows×cols if empty
  },
  bookedSeats: [String],   // ["1B", "2B", "3A"] — filled on booking
}
```

---

## ⚙️ BACKEND LOGIC — buildSeatItems()

```javascript
// In flowEndpoint.js — called when SEAT_SELECT screen is needed

async function buildSeatItems(batch) {
  const { SEAT_AVAILABLE_B64, SEAT_BOOKED_B64 } = require('../services/seatIcons');

  const rows = batch.seatLayout?.rows || 4;
  const cols = batch.seatLayout?.cols || 3;
  const booked = new Set(batch.bookedSeats || []);

  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seats = [];

  for (let r = 1; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seatId = `${r}${colLetters[c]}`;       // "1A", "1B", "2C" etc.
      const isBooked = booked.has(seatId);
      seats.push({
        id: seatId,
        title: seatId,
        description: '',
        image: isBooked ? SEAT_BOOKED_B64 : SEAT_AVAILABLE_B64,
        'alt-text': `Seat ${seatId} - ${isBooked ? 'Booked' : 'Available'}`,
        enabled: !isBooked,                         // booked = greyed out
      });
    }
  }
  return seats;
}
```

---

## 🔀 ROUTING MODEL UPDATE

```json
"routing_model": {
  "SERVICE_SELECT":          ["TTC_COURSE_SELECT", "PRACTICE_PROGRAM_SELECT", "RETREAT_PROGRAM_SELECT", "..."],
  "RETREAT_PROGRAM_SELECT":  ["RETREAT_DATE_SELECT"],
  "RETREAT_DATE_SELECT":     ["SEAT_SELECT", "RETREAT_CONFIRM"],
  "SEAT_SELECT":             ["RETREAT_CONFIRM"],
  "RETREAT_CONFIRM":         [],
  "...": "..."
}
```

---

## 📱 SCREEN SEQUENCE — VISUAL

```
Screen 1: SERVICE_SELECT
╔══════════════════════════╗
║  ○ 🎓 Become a Teacher   ║
║  ○ 🧘 Deepen Practice    ║
║  ● 🏕️ Retreat ✓          ║  ← user picks Retreat
║  ○ 📅 Events             ║
╚══════════════════════════╝
           │
           ▼
Screen 2: RETREAT_PROGRAM_SELECT
╔══════════════════════════╗
║  ○ [🖼] Himalayan        ║
║       Wellness · 7 nights║
║  ○ [🖼] Yoga & Detox     ║
║       14 nights          ║
╚══════════════════════════╝
           │
           ▼
Screen 3: RETREAT_DATE_SELECT
╔══════════════════════════╗
║  ○ 1 Jul–7 Jul · 3 left  ║  ← user picks a date
║  ○ 15 Jul–21 Jul · 5 left║
║  ○ 1 Aug–7 Aug · 8 left  ║
╚══════════════════════════╝
           │
           ▼
Screen 4: SEAT_SELECT  ← NEW
╔══════════════════════════╗
║  🚌 Retreat Transfer     ║
║  Rishikesh→Delhi 1 Jul   ║
║                          ║
║  ┌────┐ ┌────┐ ┌────┐   ║
║  │ 1A │ │ 1B │ │ 1C │   ║  ← 3-col grid
║  │ 🟢 │ │ 🔴 │ │ 🟢 │   ║    media-size: large
║  └────┘ └────┘ └────┘   ║
║  ┌────┐ ┌────┐ ┌────┐   ║
║  │ 2A │ │ 2B │ │ 2C │   ║
║  │ 🟢 │ │ 🟢 │ │ 🔴 │   ║
║  └────┘ └────┘ └────┘   ║
║  ┌────┐ ┌────┐ ┌────┐   ║
║  │ 3A │ │ 3B │ │ 3C │   ║
║  │ 🔴 │ │ 🟢 │ │ 🟢 │   ║
║  └────┘ └────┘ └────┘   ║
║                          ║
║  🟢 Available 🔴 Booked  ║
║  ┌──────────────────┐    ║
║  │  Confirm Seat    │    ║
║  └──────────────────┘    ║
╚══════════════════════════╝
           │
           ▼
Screen 5: RETREAT_CONFIRM (terminal)
╔══════════════════════════╗
║  Perfect choice! 🏕️      ║
║  Seat 1A confirmed.      ║
║  Details coming on WA.   ║
║  ┌──────────────────┐    ║
║  │      Close       │    ║
║  └──────────────────┘    ║
╚══════════════════════════╝
           │
           ▼
Webhook fires → nfm_reply
Bot sends: PDF + price + [Yes Book] [No]
```

---

## 🎯 USE CASES FOR THIS IN HIMALAYAN YOGA

| Use Case | Seats / Slots | Config |
|---|---|---|
| **Retreat transfer bus** | 4×3 = 12 seats (1A–4C) | `rows:4, cols:3` |
| **Yoga hall mat position** | 3×4 = 12 mats | `rows:3, cols:4` |
| **Practice session time slots** | 1×8 = 8 time tiles | `rows:1, cols:8` → wraps auto |
| **Room type selection** | 1×4 = 4 room tiles | `rows:1, cols:4` (shared/private/deluxe/suite) |
| **TTC batch spot visual** | 1×20 = 20 spots | `rows:4, cols:5` |

---

## ⚠️ KEY LIMITATIONS

| Constraint | Detail |
|---|---|
| Max items in CheckboxGroup | **20 items** — so max 20 seats per screen |
| Image size per item | Max **100KB** per seat icon (we use ~1KB — fine) |
| Layout | Always **3 columns** when `media-size: "large"` |
| Booked seats | Set `enabled: false` — they appear greyed out, not selectable |
| Color field | Supported v5.0+ — adds a tint to the tile |
| Multi-select | Use `CheckboxGroup` (max-selected-items: 2) |
| Single-select | Use `RadioButtonsGroup` (only one seat) |
| Version needed | **v5.0 minimum** — we already use **v7.0** ✅ |

---

## 📋 IMPLEMENTATION CHECKLIST

```
Backend:
  ☐ Create seatIcons.js service (green + red base64 PNG constants)
  ☐ Add seatLayout + bookedSeats fields to Batch model
  ☐ Add buildSeatItems() function in flowEndpoint.js
  ☐ Add SEAT_SELECT to flowJson.js routing_model
  ☐ Add SEAT_SELECT screen in flowJson.js screens[]
  ☐ Handle seat_confirm action in flowEndpoint.js data_exchange
  ☐ On booking confirmed → push seat to batch.bookedSeats[]
  ☐ On booking cancelled → remove seat from batch.bookedSeats[]

Admin Panel:
  ☐ Add seatLayout config to Batches page (rows × cols input)
  ☐ Show booked seats list in Bookings page per batch

Flow:
  ☐ RETREAT_DATE_SELECT → SEAT_SELECT → RETREAT_CONFIRM routing
  ☐ Pass batchId through flow token for seat loading
```

---

*Seat grid technique: `CheckboxGroup` / `RadioButtonsGroup` with `media-size: "large"` — Flow JSON v5.0+*
*WhatsApp auto-renders 3 tiles per row when large media mode is active*
*No WebView. Fully native inside WhatsApp.*
