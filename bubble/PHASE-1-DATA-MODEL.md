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

### `Moodboard` (already created)

| Field name | Type |
|---|---|
| `Name` | text |
| `Event` | `1 Project / Event` |
| `Vision brief` | text |
| `Palette` | text — **list** |

### `Moodboard Section`

| Field name | Type | Notes |
|---|---|---|
| `Moodboard` | Moodboard | |
| `Section name` | text | |
| `Icon` | text | one of the 32 icon keys |
| `Status` | Moodboard Status OS | |
| `Approved date` | date | set when the planner flips Status to Approved |
| `Section vision brief` | text | empty ⇒ inherits the board's |
| `Order` | number | explicit sort index |
| `Archived?` | yes / no | |

**`Slides JSON` is gone** — see the note below.

### `Moodboard Slide`

| Field name | Type |
|---|---|
| `Section` | Moodboard Section |
| `Slide name` | text |
| `Order` | number |

### `Moodboard Element`

One row per text box or image placed on a slide.

| Field name | Type | Notes |
|---|---|---|
| `Slide` | Moodboard Slide | |
| `Element type` | text | `image` or `text` |
| `X` | number | artboard coords, 0–960 |
| `Y` | number | 0–540 |
| `Width` | number | |
| `Height` | number | |
| `Rotation` | number | degrees |
| `Z index` | number | paint order |
| `Moodboard image` | Moodboard Image | image elements only |
| `Content` | text | text elements only |
| `Font size` | number | text only |
| `Font family` | text | `sans` or `display` |
| `Colour` | text | hex |
| `Align` | text | `left` / `center` / `right` |
| `Bold?` | yes / no | |
| `Italic?` | yes / no | |

The author is the built-in **`Creator`** — that's what the client-edit rule keys on.

> ### Why elements became rows
>
> Earlier drafts kept the whole canvas in one `Slides JSON` text field on the section, because only
> the planner wrote it. Clients adding their own text and images changes that: a text field has no
> partial write, so *"a client may add an image"* and *"a client may delete everything you made"*
> would be the same permission.
>
> As rows, the rule is exactly the requirement and Bubble enforces it server-side:
> **planner and team → write anything; client → write only rows where `Creator is Current User`.**
> Bubble grants write access per *thing*, which is precisely the granularity this needs.
>
> It also removes the concurrent-edit problem. With one JSON blob per section, you and the couple
> both having the board open means every save rewrites the whole thing and whoever saved first
> silently loses their work. With rows, two people editing different elements never touch the same
> record.
>
> The reason this is affordable now and wasn't during planning: the phase 4 fix means edits commit
> **once per pointer gesture** rather than once per animation frame, so a drag is one write, not sixty.

### `Moodboard Image`

| Field name | Type | Notes |
|---|---|---|
| `Moodboard` | Moodboard | |
| `Moodboard Section` | Moodboard Section | grouping for exports and filenames |
| `Image` | image | its Data API value *is* the URL |
| `In use?` | yes / no | on the board now, vs removed from the canvas |

Still an asset separate from its placement: one image can be placed on two slides, and votes point at
the image rather than at any particular placement. Deleting an element never deletes the file — it
sets `In use?` to no, because undo restores up to 60 steps and would otherwise resurrect an element
pointing at a file that no longer exists.

### `Moodboard Image Vote`

| Field name | Type |
|---|---|
| `Moodboard image` | Moodboard Image |
| `Moodboard vote` | Moodboard Vote OS |

Voter is `Creator`; clearing your vote deletes the row. One row per person per image, so one
collaborator's thumbs-up can't silently overwrite another's thumbs-down.

### `Moodboard Thread` — one thread = one pin

| Field name | Type | Notes |
|---|---|---|
| `Moodboard` | Moodboard | |
| `Moodboard section` | Moodboard Section | |
| `Slide id` | text | *(becomes a `Moodboard Slide` reference now that slides are rows)* |
| `X-axis` | number | 0–960 |
| `Y-axis` | number | 0–540 |
| `Resolved?` | yes / no | |
| `Resolved by` | User | |
| `Resolved date` | date | |

### `Moodboard Comment`

| Field name | Type | Notes |
|---|---|---|
| `Thread` | Moodboard Thread | |
| `Parent comment` | Moodboard Comment | empty = top level, set = a reply |
| `Text` | text | |
| `Edited?` | yes / no | |

Author is `Creator`, timestamp is `Created Date` — both server-set and unspoofable. Your existing
`T-Thread` / `T-Message` are untouched and stay off the Data API.

---

## 3. What this costs

Eight types instead of six, and a board now loads in four reads rather than two: sections, slides,
elements, images (plus threads and comments when the drawer opens). A five-section board with two
slides each and eight elements per slide is ~80 element rows — one page of the Data API's default
100, so no pagination yet, but it's worth knowing where that limit sits.

In exchange, everything on the board is queryable from Bubble, permissions are enforced by the
database rather than by the UI, and simultaneous editing stops destroying work.

---

## 4. Privacy rules — the important part

For **each** of the eight new types (`Moodboard`, `Moodboard Section`, `Moodboard Slide`,
`Moodboard Element`, `Moodboard Image`, `Moodboard Image Vote`, `Moodboard Thread`,
`Moodboard Comment`), go to **Data → Privacy** and make sure:

**The default "Everyone else" rule has _Find this in searches_ UNCHECKED, and no field ticked under View.**
This is the rule that's currently wide open. Everything else is additive on top of it.

Then add **three rules** to each type. `PATH` below is the walk from the thing to its event:

| Type | `PATH` |
|---|---|
| `Moodboard` | `This Moodboard's Event` |
| `Moodboard Section` | `This Moodboard Section's Moodboard's Event` |
| `Moodboard Slide` | `This Moodboard Slide's Section's Moodboard's Event` |
| `Moodboard Element` | `This Moodboard Element's Slide's Section's Moodboard's Event` |
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

**Rule 4 — Clients editing their own work** (`Moodboard Element` only)
`This Moodboard Element's Creator is Current User`

That one rule is the entire client-edit model. Bubble grants write access per *thing*, so a client
can change the elements they created and nothing else — enforced by the database, not by the UI.
Rule 3 already gives them read access to the rest of the board.

**Never give clients write access to `Moodboard Section` or `Moodboard Slide`** — those govern the
board's structure, and a client deleting a section would take its slides and elements with it.

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
- `Moodboard Slide`
- `Moodboard Element`
- `Moodboard Image`
- `Moodboard Image Vote`
- `Moodboard Thread`
- `Moodboard Comment`

Nothing else. In particular **do not** expose `T-Thread` or `T-Message` — they stay off the API.

---

## 6. Checkpoint

Tell me when it's done and I'll run, from a logged-in page:

1. An **anonymous** fetch of all eight types — every one must come back `count: 0` or 403. If any still
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

---

## Appendix D — Placing the element (measured 2026-09-08)

The app is `height: 100%`, so it resolves against whatever height the Bubble element has.
The artboard takes the height left over after the top nav, section tabs and canvas bar — and
it degrades silently, with no error, if there isn't enough:

| Element height | Artboard rendered |
|---|---|
| 900px | 523px tall |
| 760px | 383px tall |
| 600px | 223px tall |
| 400px | 23px tall |
| 200px | **0px — invisible** |

So when placing it: give the element a **fixed height of ~800px or more**, or set it to stretch and
fill the page. An auto-height parent gives the wrapper nothing to resolve against and the canvas
disappears rather than complaining.

The `height` prop on the mount API sets this directly if the Bubble element's own sizing isn't enough.
