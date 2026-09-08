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

### `Moodboard Image` (new type, private by default)

| Field name | Type | Notes |
|---|---|---|
| `Moodboard` | Moodboard | |
| `Section` | Moodboard Section | for grouping in exports and filenames |
| `Image` | image | the file in Bubble storage — its Data API value *is* the URL |
| `In use?` | yes / no | on the board right now, vs removed from the canvas |

Elements in `Slides JSON` reference these by Bubble unique id:

```json
{ "id": "el-1", "type": "image", "imageId": "1788893251620x170603871777754720",
  "x": 80, "y": 60, "width": 400, "height": 300, "zIndex": 1 }
```

So the plugin loads a board with two reads — the sections, and all the images for that moodboard —
and no image data is duplicated into the JSON.

> This type was dropped from an earlier draft and is back because you want moodboard images usable
> **from Bubble** — listed in the file manager, shown in repeating groups, bulk-exported. None of
> that is workable against URLs buried in a JSON text field. The test for "should this be a type" is
> whether Bubble itself needs to query, join or enforce it, and Bubble-side export is exactly that.
>
> It also settles the votes question properly: `Moodboard Image Vote` can point at a real row, so
> *"which images did clients like most"* is a normal Bubble query that can render the actual picture
> in a repeating group. Keyed by a text id it could only ever have counted.
>
> And it removes the open risk from the earlier draft: the file is now attached to a database record,
> so there's no question of Bubble garbage-collecting an unreferenced upload.

Still deliberately absent: no `URL` text field (an `image` field's Data API value already *is* the
URL) and no `Tags` (present on the current `BoardImage` type, read by zero components).

**Deleting an image never deletes the file.** Removing an image from the canvas sets `In use?` to no;
the row and the file stay. Permanent deletion is a separate, explicit action.

> The reason is undo. ⌘Z restores up to 60 steps, so if deleting an element also deleted the file,
> undo would bring back an element pointing at a file that no longer exists — permanently broken,
> with no way back. Removing something from a canvas is a casual, high-frequency gesture; deleting a
> file isn't. They shouldn't be the same action.
>
> So filter your Bubble-side lists and exports on `In use? = yes` for "what's on the board", and drop
> the constraint for "everything we ever considered". Two useful views instead of one lossy one.

**Downloads.** "Download all" gets built twice, cheaply: in the plugin as a zip (the URLs are already
in memory, and [`downloadImage.ts`](../src/utils/downloadImage.ts) already does fetch-blob-save for the
single-image case), and in Bubble as an ordinary search over `Moodboard Image` (constrained to `In use? = yes`).

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

For **each** of the six new types (`Moodboard`, `Moodboard Section`, `Moodboard Image`,
`Moodboard Image Vote`, `Moodboard Thread`, `Moodboard Comment`), go to **Data → Privacy** and make sure:

**The default "Everyone else" rule has _Find this in searches_ UNCHECKED, and no field ticked under View.**
This is the rule that's currently wide open. Everything else is additive on top of it.

Then add **three rules** to each type. `PATH` below is the walk from the thing to its event:

| Type | `PATH` |
|---|---|
| `Moodboard` | `This Moodboard's Event` |
| `Moodboard Section` | `This Moodboard Section's Moodboard's Event` |
| `Moodboard Image` | `This Moodboard Image's Moodboard's Event` |
| `Moodboard Image Vote` | `This Moodboard Image Vote's Image's Moodboard's Event` |
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
- `Moodboard Image`
- `Moodboard Image Vote`
- `Moodboard Thread`
- `Moodboard Comment`

Nothing else. In particular **do not** expose `T-Thread` or `T-Message` — they stay off the API.

---

## 6. Checkpoint

Tell me when it's done and I'll run, from a logged-in page:

1. An **anonymous** fetch of all six types — every one must come back `count: 0` or 403. If any still
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

---

## Appendix B — Field names as actually built (read 2026-09-08)

Several differ from the names proposed above. **The real names win**; the client is written against
these. `✓` = key observed over the Data API. Everything else is derived from the observed pattern
(lowercase, spaces → `_`, `?` dropped leaving its underscore, then a type suffix) and must be
confirmed by a successful write before the client relies on it.

| Type | Field | Data API key |
|---|---|---|
| `Moodboard` | Name | `name_text` ✓ |
| | Vision brief | `vision_brief_text` |
| | Palette | `palette_list_text` ✓ |
| | Event | `event_custom_wedding` — note `1 Project / Event`'s internal id is `wedding` |
| `Moodboard Section` | Section name | `section_name_text` ✓ |
| | Section vision brief | `section_vision_brief_text` |
| | Icon | `icon_text` |
| | Slides JSON | `slides_json_text` |
| | Order | `order_number` |
| | Status | `status_option_moodboard_status_os` |
| | Approved date | `approved_date_date` |
| | Archived? | `archived__boolean` |
| | Moodboard | `moodboard_custom_moodboard` |
| `Moodboard Image` | Image | `image_image` |
| | In use? | `in_use__boolean` ✓ |
| | Moodboard | `moodboard_custom_moodboard` |
| | Moodboard Section | `moodboard_section_custom_moodboard_section` |
| `Moodboard Image Vote` | Moodboard image | `moodboard_image_custom_moodboard_image` |
| | Moodboard vote | `moodboard_vote_option_moodboard_vote_os` ✓ |
| `Moodboard Thread` | Slide id | `slide_id_text` |
| | X-axis | `x_axis_number` |
| | Y-axis | `y_axis_number` |
| | Resolved? | `resolved__boolean` |
| | Resolved by | `resolved_by_custom_user` |
| | Resolved date | `resolved_date_date` ✓ |
| | Moodboard | `moodboard_custom_moodboard` |
| | Moodboard section | `moodboard_section_custom_moodboard_section` |
| `Moodboard Comment` | Text | `text_text` ✓ |
| | Parent comment | `parent_comment_custom_moodboard_comment` |
| | Edited? | `edited__boolean` |
| | Thread | `thread_custom_moodboard_thread` |

Two things worth knowing about the Data API generally:

- **Empty fields are omitted from responses entirely** — not returned as null. The client must treat
  every field as possibly absent rather than assuming the key is present.
- List-of-text fields take `_list_text`, not `_text`. `palette_text` is rejected as an unrecognised
  field; `palette_list_text` is accepted.

---

## Appendix C — ⚠️ Writes are currently blocked

`POST /version-test/api/1.1/obj/moodboard` with a valid body returns:

```
401 {"error_class":"Unauthorized","translation":"Permission denied: cannot create ..."}
```

All six types currently show **"publicly visible"** in Data → Privacy — no rules at all. Reads work
(that's what "publicly visible" means, to everyone, including logged-out); writes do not.

**This reframes the privacy work.** It isn't only about locking down reads — privacy rules are what
*authorise the plugin to write at all*. Autosave, uploads, votes and comments are all blocked until
they exist, so section 4 has to happen before phase 5 rather than after.

**One thing I got wrong earlier and should correct:** I reported from phase 0 that "session cookie
auth works". What I actually proved is that the endpoint responds `200` — and since the type is
publicly visible, an anonymous request gets the same `200`. My authenticated and anonymous fetches
returned *identical* results, which is equally consistent with the browser session not being logged
in as a User at all. So user identity over the Data API is **unverified**, not confirmed.

Both possibilities are testable together once privacy rules exist: if reads then return data for a
logged-in planner and nothing for a logged-out request, identity works. If they return nothing
either way, the plugin needs the user's auth token passed in as a plugin field after all.
