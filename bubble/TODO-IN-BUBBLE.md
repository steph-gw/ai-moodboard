# What's left to do in Bubble

Checked against your app on 2026-09-08, so this is the actual delta — not a restatement of the
whole design. **Do it in this order**, because steps 2–4 reference the type created in step 1.

---

## Already done — nothing to change

| | Status |
|---|---|
| Option set `Moodboard Status OS` | ✅ with `Key` attribute (approved / open / pending / none) |
| Option set `Moodboard Vote OS` | ✅ with `Key` attribute (up / down) |
| `Moodboard` — Name, Event, Vision brief, Palette | ✅ complete |
| `Moodboard Image` — Moodboard, Moodboard Section, Image, In use? | ✅ complete |
| `Moodboard Image Vote` — Moodboard image, Moodboard vote | ✅ complete |
| `Moodboard Comment` — Thread, Parent comment, Text, Edited? | ✅ complete |
| Data API exposure for those six types | ✅ done |

---

## 1. ADD — new data type `Moodboard Slide`

**Data → Data types → New type** → `Moodboard Slide`. Tick *Make this data type private by default*.

| Field name | Type |
|---|---|
| `Section` | Moodboard Section |
| `Slide name` | text |
| `Order` | number |
| `Elements JSON` | text |

No lock field here — see step 2.

## 2. ADD — one field on `Moodboard Section`

| Field name | Type |
|---|---|
| `Locked slides` | Moodboard Slide — **tick "This field is a list"** |

Locking a slide adds it to this list. It lives on the section, not the slide, because Bubble grants
write access per *thing* rather than per field: a `Locked?` on the slide would be writable by any
client who could edit that slide, so they could lock it and then never unlock it. Clients never write
`Moodboard Section`, so this makes locking and unlocking planner-only in both directions.

## 3. ADD — one field on `Moodboard Thread`

| Field name | Type |
|---|---|
| `Moodboard slide` | Moodboard Slide |

## 4. REMOVE — two fields now superseded

- `Moodboard Section` → delete **`Slides JSON`** (the canvas moved down to the slide, so the lock and
  the unit of writing line up)
- `Moodboard Thread` → delete **`Slide id`** (a pin points at a real slide record now, not a string)

*Bubble soft-deletes fields, so these stay recoverable under "Show deleted fields".*

## 5. Settings → API

Tick **`Moodboard Slide`** in the exposed types list. The other six are already ticked.

## 6. Privacy rules — all seven types

`Moodboard` already shows "Privacy rules applied"; the other six still say "Publicly visible".
Full click-by-click in [PRIVACY-RULES-WALKTHROUGH.md](PRIVACY-RULES-WALKTHROUGH.md). In summary, per type:

- **Rule 1 — Admin:** `Current User's ⚙️ Role is App admin`
- **Rule 2 — Planner team:** `Current User's Business is not empty and Current User's Business is PATH's Wedding / Event Planner's Business`
- **Rule 3 — Collaborators, read:** `PATH's Collaborator Accesses's User contains Current User` (no write)
- **Rule 4 — Collaborators, write:** only on `Moodboard Slide`, `Moodboard Image`, `Moodboard Image Vote`, `Moodboard Thread`, `Moodboard Comment`. On `Moodboard Slide` it also requires
  `Section's Locked slides doesn't contain This Moodboard Slide` and `Section's Status is not Approved`.
- **Everyone else:** untick *Find this in searches*, no fields under View. ← this is the one that
  closes the current public read

No client write rule on `Moodboard` or `Moodboard Section`.

---

## Then tell me and I'll verify in about a minute

1. Anonymous fetch of all seven → every one must return `count: 0`.
2. Authenticated fetch → must return your data. Also the first real proof the session cookie
   identifies you as `Current User`, which today's wide-open state makes untestable.
3. A write → today's `401 Permission denied: cannot create` has to become a success.

Number 3 is what unblocks phase 5. If it still fails after the rules are in, the write path becomes
backend API workflows instead of the Data API, and I'll tell you rather than working around it.

**Send me a screenshot of the THIS THING checkboxes** on the first rule you create — which API-write
box to tick is the last thing I'm guessing at, and it now matters twice over (rule 3 read-only vs
rule 4 writable).
