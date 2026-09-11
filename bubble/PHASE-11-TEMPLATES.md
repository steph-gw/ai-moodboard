# Phase 11 — moodboard templates

A template is a `Moodboard` like any other. Nothing new was invented for it: the app
already treats a template as a flagged record rather than a separate type — `1 Project /
Event` has `Template?` and `System Template?` — and moodboards now follow the same shape.

## Fields (already added to `Moodboard`)

| Field | Type | API key | Meaning |
|---|---|---|---|
| `Template?` | yes/no | `template__boolean` | Saved by a planner or their team, reusable inside their business |
| `System template?` | yes/no | `system_template__boolean` | Authored by Gatherwise, offered to everyone |

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

## What is still shared, and how to finish separating it

The rows are independent immediately. The **file** behind each image is not: the copy's new
`Moodboard Image` row points at the same URL.

The bundle cannot fix this. Verified 2026-09-11:

```js
fetch('https://…cdn.bubble.io/…/gatherwise-logo.png')
// TypeError: Failed to fetch — no CORS headers on the CDN
```

So re-hosting is a backend job: an API workflow that takes the new moodboard, loops its
images, GETs each source URL through the API Connector and saves the result back into the
row's `Image` field. The plugin can trigger it once the clone returns.

Run it after the clone, not before — the board is usable the moment the rows exist, and
the files separate behind the scenes. Until it has run, do not hard-delete a template's
images.

## Starting a board from a template

The element takes `template_moodboard_id`. On load, a board that is **empty** and has a
template id set is forked before anything is rendered; a board with any section already in
it ignores the field entirely, so a reload can never copy on top of someone's work.

For a brand-new moodboard with no template chosen, point the same field at the system
starter board — the default content is then a real moodboard you can edit in the product,
rather than something baked into the bundle and only changeable by a rebuild.
