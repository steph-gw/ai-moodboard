# Phase 1 — Bubble data model

Everything in this file is for **you** to apply in the `eventplanner-38386` editor. I don't touch the app.
Work top to bottom: option sets → types → fields → privacy → API exposure. Types must exist before
the fields that point at them.

Field **names matter**, because Bubble derives the Data API key from the name and appends a type
suffix (your `Name` text field on `Moodboard` came back as `name_text`). Use the exact names in the
`Field name` columns; I'll read the real keys back over the API at the end and adjust the client to
whatever Bubble actually generated.

---

## 0. Security finding — read this first

Right now `Moodboard` is readable by **anyone on the internet** who knows the app URL. I verified it:

| Request | Result |
|---|---|
| `GET /version-test/api/1.1/obj/moodboard` with session cookie | `200` — returns the record |
| Same request with `credentials: 'omit'` (no cookie at all) | `200` — **returns the same record** |

That's not a bug in what you did; it's what happens when a type is exposed to the Data API and its
default "Everyone else" rule still allows *Find this in searches*. It applies to every type we expose,
so the privacy rules in section 4 are **not optional** — they're the thing standing between your
client moodboards and the open internet. We re-run that anonymous fetch as the checkpoint.

---

## 1. Option sets

**Data → Option sets → New option set.**

### `Moodboard Status`
Add one **attribute**: name `key`, type `text`. Then four options:

| Display | `key` |
|---|---|
| Approved | `approved` |
| Open | `open` |
| Pending | `pending` |
| None | `none` |

### `Moodboard Vote`
Same: one attribute `key` (text), two options:

| Display | `key` |
|---|---|
| Up | `up` |
| Down | `down` |

> The `key` attribute exists so the plugin never depends on display text. If someone renames "Open" to
> "In review" later, nothing breaks.

Section icons deliberately do **not** get an option set — the 32 icons live in the bundle, and a second
list in Bubble would just drift out of sync. The icon is stored as a plain text key.

---

## 2. Data types

### `Moodboard` (already created — add the remaining fields)

| Field name | Type |
|---|---|
| `Name` | text *(exists)* |
| `Event` | `1 Project / Event` |
| `Vision brief` | text |
| `Palette` | text — **tick "This field is a list"** |
| `Client view enabled?` | yes / no |

### `Moodboard Section` (new type, private by default)

| Field name | Type | Notes |
|---|---|---|
| `Moodboard` | Moodboard | |
| `Name` | text | |
| `Icon` | text | one of the 32 icon keys |
| `Status` | Moodboard Status | |
| `Approved date` | date | |
| `Approved by` | User | |
| `Vision brief` | text | empty ⇒ inherits the board's |
| `Order` | number | explicit sort index |
| `Slides JSON` | text | the entire canvas for this section |
| `Archived?` | yes / no | |

### `Moodboard Image` (new type, private by default)

| Field name | Type | Notes |
|---|---|---|
| `Moodboard` | Moodboard | |
| `Section` | Moodboard Section | |
| `Image` | image | the file in Bubble storage |
| `URL` | text | what the canvas actually renders |
| `Tags` | text — **list** | |
| `Client vote` | Moodboard Vote | empty = no vote |
| `Voted by` | User | |
| `Voted date` | date | |

> Both `Image` and `URL` on purpose: `Image` keeps the file native to Bubble (repeating groups, file
> manager, deletion), `URL` is the plain string the canvas reads without a round-trip. Costs nothing.

---

## 3. Fields on your existing types

### `T-Thread` — one thread becomes one comment pin

| Field name | Type |
|---|---|
| `Moodboard section` | Moodboard Section |
| `Moodboard slide id` | text |
| `Pin x` | number |
| `Pin y` | number |
| `Resolved?` | yes / no |
| `Resolved by` | User |
| `Resolved date` | date |
| `Kind` | text |

`Kind` is set to `moodboard-pin` on every thread the plugin creates. Your existing inbox queries can
filter these in or out with one constraint — **worth checking before we go live**, since without it
moodboard pins will start appearing in the communications list.

`Pin x` / `Pin y` are coordinates on the 960×540 artboard, not percentages.

### `T-Message` — one message becomes one comment

| Field name | Type |
|---|---|
| `Parent message` | T-Message |
| `Edited?` | yes / no |

Empty `Parent message` = a thread root; set = a reply. The comment body reuses your existing
`Text (plain text)`, and the author is the built-in **`Creator`** — no new author field, because
`Creator` is already exactly that and can't be spoofed from the client.

---

## 4. Privacy rules — the important part

For **each** of the five types (`Moodboard`, `Moodboard Section`, `Moodboard Image`, and the moodboard
fields on `T-Thread` / `T-Message`), go to **Data → Privacy** and make sure:

**The default "Everyone else" rule has _Find this in searches_ UNCHECKED, and no field ticked under View.**
This is the rule that's currently wide open. Everything else is additive on top of it.

Then add rules mirroring the pattern you already use on `1 Project / Event`, which has:
`Current User's Role is App admin` → `Current User is logged in` → `This Event's Creator is Current User`.

For the moodboard types the condition should route through the event, so anyone who can see the event
can see its moodboard and nothing more:

| Type | Rule condition |
|---|---|
| `Moodboard` | `This Moodboard's Event's Creator is Current User` (+ whatever collaborator/client condition `1 Project / Event` uses) |
| `Moodboard Section` | `This Moodboard Section's Moodboard's Event's Creator is Current User` (+ same) |
| `Moodboard Image` | `This Moodboard Image's Moodboard's Event's Creator is Current User` (+ same) |

Plus the `Current User's Role is App admin` rule on each, so you keep admin visibility.

**I don't know your collaborator/client access model well enough to write that half for you**, and
guessing at privacy rules is the one place I'd rather be slow than wrong. The rule of thumb: *if a
user can open the event, they can read its moodboard.* Copy whichever conditions `1 Project / Event`
already uses for that and point them through `Moodboard's Event`.

Under each rule, tick **Find this in searches** and tick **View** for all fields.

---

## 5. Expose to the Data API

**Settings → API** — `Enable Data API` is already on. Tick these types:

- `Moodboard` *(already ticked)*
- `Moodboard Section`
- `Moodboard Image`
- `T-Thread`
- `T-Message`

Nothing else needs to be added.

---

## 6. Checkpoint

Tell me when it's done and I'll run, from a logged-in page:

1. An **anonymous** fetch of all five types — every one must come back `count: 0` or 403. If any still
   returns rows without a cookie, a privacy rule is missing and I'll say which.
2. An **authenticated** fetch — must return your data. This is also the first real proof that the
   session cookie identifies you as `Current User` rather than just letting everyone through, which
   the current wide-open state makes impossible to test.
3. A read of one record per type to capture the **actual Data API field keys** Bubble generated, so
   the client sends `slides_json_text` (or whatever it really is) rather than my guess.

That last one is why this checkpoint matters more than a screenshot would: the whole client is written
against those keys.

---

## Appendix — verified environment facts

- The app serves from **`app.gatherwise.io`**; `eventplanner-38386.bubbleapps.io` redirects there.
- Data API base is **version-scoped**: `/version-test/api/1.1/obj` in test, `/api/1.1/obj` in live.
  Calling the bare path from a `/version-test/` page hits **live** and returns a misleading
  `404 "This application does not expose a Data API"`. The client derives the base from `location.pathname`.
- Same-origin `fetch` with `credentials: 'include'` returns `200`, so no auth-token plugin field is needed.
