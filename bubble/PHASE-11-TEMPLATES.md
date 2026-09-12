# Phase 11 — moodboard templates

A template is a `Moodboard` like any other. Nothing new was invented for it: the app
already treats a template as a flagged record rather than a separate type — `1 Project /
Event` has `Template?` and `System Template?` — and moodboards now follow the same shape.

## Fields (already added to `Moodboard`)

| Field | Type | API key | Meaning |
|---|---|---|---|
| `Template?` | yes/no | `template__boolean` | Saved by a planner or their team, reusable inside their business |
| `System template?` | yes/no | `system_template__boolean` | Authored by Gatherwise, offered to everyone |
| `Business` | Event Planner Business | `business_custom_business` | The planner business a saved template belongs to |

`Business` is a real reference, not a denormalised text id. A first pass used text on the
reasoning that Event Planner Business is not exposed on the Data API — that was wrong. The
API hands a reference back as the target's unique id and accepts one on write whether or
not the target type is exposed, so the text field bought nothing and cost Bubble the
ability to follow the link in its own expressions and searches.

The element takes it as `business_id`, bound to `Current User's Business's unique id` — an
id is what a reference field wants over the API.

**The `Moodboard templates` list on `Event Planner Business` is the other direction of the
same link, and the bundle cannot maintain it**: it is a field on Business, and Business is
not on the Data API, so the plugin can neither read nor write it. Treat `Moodboard.Business`
as the source of truth and let Bubble-side UI search on it
(`Search for Moodboards: Business = Current User's Business, Template? = yes`). If the list
field is wanted for convenience, a database trigger on Moodboard has to keep it in sync —
it cannot be kept current from the board.

The template list is scoped on it **explicitly**, not left to privacy rules. The moodboard
types are currently readable by anyone logged in, so an unscoped query would offer a planner
every other business's templates — and every one of those would carry that business's
client photographs across on the first fork.

`Name` doubles as the template's name — a moodboard's own name is otherwise unused, since
the top bar shows the event's. No `Template name` field was added for that reason.

Nothing is needed on `Moodboard Section`, `Moodboard Slide` or `Moodboard Image`.

## The copy is a fork, and lives in the bundle

`BoardRepo.cloneInto(source, target)` copies sections, slides, canvas, images, palette and
vision brief. It deliberately copies none of: threads, comments, votes, section status,
approved date, locked slides. A template is what the board looked like, not what was said
about it.

It has to live in the bundle rather than in a backend workflow, because a slide's
`Elements JSON` references images by `Moodboard Image` unique id. The copy writes new image
rows and rewrites every slide's JSON through an old-id → new-id map. Bubble cannot parse or
rewrite a text field server-side, so a workflow copy would have to leave the copies pointing
at the template's image rows — and deleting the template would then break every board made
from it.

## What is shared, and why that is fine

The rows are independent immediately. The **file** behind each image is not: the copy's new
`Moodboard Image` row points at the same URL. Measured on version-test 2026-09-11 — 90 image
rows, 32 distinct files, 31 of those files used by more than one row.

**This was investigated and deliberately left alone.** The reason to separate them would be
that deleting a template could break the boards made from it. It cannot:

```
DELETE /api/1.1/obj/moodboardimage/<id>   → 204
the row afterwards                         → 404
its file five seconds later                → still renders, 600 × 450
```

Deleting a *thing* in Bubble does not delete its *file*. So a template, or any of its image
rows, can go and every fork keeps working — the bytes are already hosted. A fork breaks only
if the **file itself** is deleted, which takes a deliberate act: File Manager, or the
"Delete an uploaded file" action, neither of which this app uses. Removing an image from a
canvas sets `In use? = no`; deleting a section archives it. Nothing in the product can
orphan a fork.

**The one operating rule that follows: never hard-delete moodboard image files.** Tidying
File Manager would break forks silently.

### If it ever does need doing

Two reasons might bring it back: making image files private (a file attached to the
template's row may then be refused to a fork's viewer — test before relying on it), and
wanting File Manager to be legible. The recipe is proven and takes about ten minutes to
rebuild. The bundle cannot do it — verified 2026-09-11:

```js
fetch('https://…cdn.bubble.io/…/gatherwise-logo.png')
// TypeError: Failed to fetch — no CORS headers on the CDN
```

Server-side there is no such wall. An API Connector call — `GET [url]`, *Use as: Data*,
*Data type: Image* — fetches a Bubble CDN file happily. Because it is a data source rather
than an action, the re-host is a single step, not two:

```
Make changes to Moodboard Image
  Image = Get data from an external API → Fetch file (url = This Image's Image)
```

Run once against a real row, this produced a genuinely new file: a fresh Bubble file id,
distinct file count 32 → 33 with rows unchanged, the new URL used by exactly one row, the
old URL still serving the rows that had it. Note the re-saved URL comes back
**protocol-relative** (`//…`), the same shape `context.uploadContent` returns — prefix
`https:` anywhere it leaves the browser, the export sheet especially.

There is no dedupe win to be had: within a board every row already has its own distinct
file (the starter: 26 rows, 26 files), so a fork is a flat 26 fetches and 26 writes.

## Starting a board from a template

The element takes `template_moodboard_id`. On load, a board that is **empty** and has a
template id set is forked before anything is rendered; a board with any section already in
it ignores the field entirely, so a reload can never copy on top of someone's work.

For a brand-new moodboard with no template chosen, point the same field at the system
starter board — the default content is then a real moodboard you can edit in the product,
rather than something baked into the bundle and only changeable by a rebuild.
