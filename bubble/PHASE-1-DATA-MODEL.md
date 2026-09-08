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

That's the whole type. Three fields that earlier drafts had are gone:

- **No `Client view enabled?` / `Shared with clients?`.** Your `Collaborator Access` type already has
  `Tabs with View Access` and `Tabs with Hidden Access` (lists of `Tab Project OS`), so adding a
  `Moodboard` option to that set gates per-collaborator visibility with machinery your users already
  understand. A board-level flag on top of that is duplicate state that can disagree with it.
  *(Different question if you want a draft/published distinction — "the planner is still building
  this" is not the same as "this person may see it". Say so and it comes back.)*
- **No `Viewers` field.** The avatar stack reads the event's `Collaborator Accesses`'s Users. A second
  list on the moodboard would drift the moment someone is added to the event.

### `Moodboard Section` (new type, private by default)

| Field name | Type | Notes |
|---|---|---|
| `Moodboard` | Moodboard | |
| `Name` | text | |
| `Icon` | text | one of the 32 icon keys |
| `Status` | Moodboard Status | |
| `Approved date` | date | set when the planner flips Status to Approved |
| `Vision brief` | text | empty ⇒ inherits the board's |
| `Order` | number | explicit sort index |
| `Slides JSON` | text | the entire canvas for this section |
| `Archived?` | yes / no | |

### Images — no type at all

Images live inside the section's `Slides JSON`, alongside the elements that place them:

```json
{
  "images": [{ "id": "img-abc", "url": "https://s3.amazonaws.com/appforest_uf/f17.../photo.jpg" }],
  "slides":  [{ "id": "slide-1", "name": "Mood", "elements": [
      { "id": "el-1", "type": "image", "imageId": "img-abc", "x": 80, "y": 60, "width": 400, "height": 300, "zIndex": 1 }
  ]}]
}
```

Earlier drafts had a `Moodboard Image` type. It doesn't earn its place: the rule for what becomes a
real Bubble thing is *does it carry state Bubble needs to query or enforce* — sections do (status,
approval, order), and images did only because votes hung off them. Now that votes are their own type,
an image is just a URL and a size, which is exactly what the JSON is for. Keeping the indirection
(`images[]` + `imageId`) rather than inlining the URL matches the current code, so one image used on
two slides stays one image.

**`Attachment` and `Upload` are also not the answer**, in case they looked like candidates:

- `Attachment` is your client-facing file browser — `Is folder?`, `Is root folder?`, `Parent Folder`,
  `Associated Vendor`, `Invoice`, `Document`. Every moodboard image would show up as a loose file in
  the planner's document tree.
- `Upload` is `{ Files, JSONs, Errors, Debugger text, Project }` — a bulk-import staging type.

### ⚠️ One thing to verify in phase 6

With no thing holding the file, does Bubble keep it? Files uploaded via `context.uploadContent` land
in your file storage, but Bubble is known to clean up files that aren't attached to a database record,
and **I don't know for certain how that applies here.** First upload we do, I'll check the URL still
resolves after a reload and again the next day.

If it doesn't survive, the fallback is a minimal `Moodboard File` type whose only job is to own the
file — the JSON still holds the URL, nothing else changes. Cheap to add later, nothing to migrate.

---

## 3. Comments — two more new types

**Your existing `T-Thread` / `T-Message` are not touched.** We looked at reusing them and decided
against it: they're an *email* system (`Subject line`, `Text (HTML)`, `Header (with reply to ids)`,
`Guest recipients`, `Sender (when via email)`), and grafting pin geometry onto them would mean every
existing query over those tables becomes a place where a private moodboard note can leak into a guest
email send. Separate types, no blast radius.

### `Moodboard Thread` (new type, private by default)

One thread = one pin dropped on a slide.

| Field name | Type | Notes |
|---|---|---|
| `Moodboard` | Moodboard | lets us load every thread for a board in one query |
| `Section` | Moodboard Section | |
| `Slide id` | text | the slide's id inside `Slides JSON` |
| `X` | number | 0–960, artboard coordinates — not a percentage |
| `Y` | number | 0–540 |
| `Resolved?` | yes / no | |
| `Resolved by` | User | |
| `Resolved date` | date | |

### `Moodboard Comment` (new type, private by default)

| Field name | Type | Notes |
|---|---|---|
| `Thread` | Moodboard Thread | |
| `Parent comment` | Moodboard Comment | empty = top level, set = a reply |
| `Text` | text | |
| `Edited?` | yes / no | |

**No author field.** The author is the built-in **`Creator`**, which Bubble sets server-side and the
client cannot spoof. Likewise the timestamp is the built-in **`Created Date`** — the current app has
no real time model at all (comments literally carry the string `'Just now'`), and this fixes it.

> One deliberate simplification: in the local app `resolved` is stored per comment, but the UI only
> ever offers resolve on a thread's first comment and treats the pin as resolved when all of them are.
> So resolution lives on the **thread**, which is what the interface already means. I'll adapt
> `isPinResolved` in the client to match. This also fixes a real bug: today `resolveComment` credits
> `resolvedBy` to a hardcoded name regardless of who clicked it.

### Optional, later: surfacing activity in the inbox

If you do want moodboard activity in your communications list, the clean way is to create a `T-Thread`
deliberately as a **notification** — one thread per moodboard, a message when there's new activity —
rather than as storage. That gets you the inbox integration in the shape you want, on purpose, without
every email query having to defend itself. Not part of v1; noting it so the door stays open.

---

## 4. Privacy rules — the important part

For **each** of the five new types (`Moodboard`, `Moodboard Section`, `Moodboard Image Vote`,
`Moodboard Thread`, `Moodboard Comment`), go to **Data → Privacy** and make sure:

**The default "Everyone else" rule has _Find this in searches_ UNCHECKED, and no field ticked under View.**
This is the rule that's currently wide open. Everything else is additive on top of it.

Then add **three rules** to each type. `PATH` below is the walk from the thing to its event:

| Type | `PATH` |
|---|---|
| `Moodboard` | `This Moodboard's Event` |
| `Moodboard Section` | `This Moodboard Section's Moodboard's Event` |
| `Moodboard Image Vote` | `This Moodboard Image Vote's Moodboard's Event` |
| `Moodboard Thread` | `This Moodboard Thread's Moodboard's Event` |
| `Moodboard Comment` | `This Moodboard Comment's Thread's Moodboard's Event` |

**Rule 1 — Admin** (matches what `1 Project / Event` already does)
`Current User's ⚙️ Role is App admin`

**Rule 2 — The planner's team**
`PATH's Wedding / Event Planner's Business is Current User's Business`
**and** `Current User's Business is not empty`

> ⚠️ **That second clause is not optional.** `Wedding / Event Planner` is a User, and `User` has a
> `Business` field, so this correctly covers team members and not just the event's creator. But in
> Bubble `empty is empty` evaluates to **true** — so without the guard, any client whose `Business`
> is empty matches any event whose planner's `Business` is empty, and gets full planner access to
> someone else's board. Worth checking whether your existing rules elsewhere have the same hole.

**Rule 3 — Clients and collaborators**
`PATH's Collaborator Accesses's User contains Current User`

Under each rule, tick **Find this in searches** and tick **View** for all fields.

---

## 4b. Reusing `Collaborator Access`

`Collaborator Access` is `{ User, Project/Event, Invitation date, Invited by, Tabs with View Access,
Tabs with Hidden Access }`, and `1 Project / Event` already holds `Collaborator Accesses`. It does
three jobs here, so the moodboard needs no access schema of its own:

1. **Privacy rules.** Every rule condition above can be
   `This Moodboard's Event's Collaborator Accesses's User contains Current User`
   (chained through `Moodboard` / `Thread` for the deeper types). No searches needed, which is the
   constraint privacy rules impose.
2. **Visibility.** Add a `Moodboard` option to `Tab Project OS` and the existing
   `Tabs with View Access` / `Tabs with Hidden Access` gate it — same as every other tab.
3. **The avatar stack.** Reads `Event's Collaborator Accesses's User`.

**Role** isn't on `Collaborator Access`, so the plugin takes it as a plain `planner` | `client` prop
that you derive. Confirmed rule:

```
planner  =  Current User's Business is not empty
            AND Current User's Business is Event's Wedding / Event Planner's Business
client   =  everyone else with access
```

This covers team members, not just the event's creator, because `Wedding / Event Planner` is a User
and `User` has a `Business` field. The `is not empty` guard matters for the same reason as in rule 2.

**Still open:** all collaborators currently see all comments. If clients shouldn't see each other's
notes, that's a privacy-rule change, not a schema change — but decide before writing the rules.

---

## 5. Expose to the Data API

**Settings → API** — `Enable Data API` is already on. Tick these types:

- `Moodboard` *(already ticked)*
- `Moodboard Section`
- `Moodboard Image Vote`
- `Moodboard Thread`
- `Moodboard Comment`

Nothing else. In particular **do not** expose `T-Thread` or `T-Message` — they stay off the API.

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
