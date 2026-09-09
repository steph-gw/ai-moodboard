# Phase 10 — the `GW Moodboard` plugin element

Everything in this file is applied in the **plugin editor**
(`bubble.io/plugin_editor?id=1788887915866x725990324315095000`), not in the app.

> The plugin editor is single-window. Close every other `bubble.io/plugin_editor`
> tab first, or Bubble shows *"Multi-editing not allowed"* and silently discards
> whatever you type.

---

## 1. Upload the bundle

Build, then upload both files:

```bash
npm run build
```

Produces `dist/gw-moodboard.js` (~302 KB, ~85 KB gzipped) and
`dist/gw-moodboard.css` (~43 KB).

In the **app** editor (not the plugin editor): Data → File manager → Upload,
one file at a time. Copy each resulting URL.

The CSS is a separate file rather than injected by the JS so the browser can
paint the first frame styled; a JS-injected stylesheet flashes unstyled.

**Every rebuild needs a re-upload and a Headers edit.** Bubble's file manager
gives a new URL per upload rather than overwriting, which is inconvenient but
means a cached old bundle can never shadow a new one.

## 2. Create the element

Plugin editor → **Elements** → New element.

| Setting | Value |
|---|---|
| Name | `GW Moodboard` |
| Category | Visual elements |
| Resizable | ✅ horizontally and vertically |
| Has a "visible on page load" property | ✅ |
| Default width × height | 1200 × 800 |

## 3. Fields

Names are the `properties.<key>` keys `element_update.js` reads — they must match
exactly.

| Name | Key | Type | Default | Bind to |
|---|---|---|---|---|
| Moodboard id | `moodboard_id` | text | — | `Current page Event's Moodboard's unique id` |
| Event name | `event_name` | text | — | `Current page Event's Name` |
| Event date | `event_date` | date | — | `Current page Event's Date` |
| Current user id | `current_user_id` | text | — | `Current User's unique id` |
| Current user name | `current_user_name` | text | — | `Current User's Name` |
| Current user initials | `current_user_initials` | text | — | `Current User's Initials` |
| Is planner | `is_planner` | checkbox | no | `Current User's Business is not empty` |
| Read only | `read_only` | checkbox | no | — |
| Logo url | `logo_url` | text | — | your wordmark's file URL |
| Height css | `height_css` | text | `100%` | — |
| API base | `api_base` | text | *(blank)* | leave blank |
| Auth token | `auth_token` | text | *(blank)* | leave blank |
| Show pinterest | `show_pinterest` | checkbox | **no** | — |
| Show AI summarize | `show_ai_summarize` | checkbox | **no** | — |
| Show suggestions | `show_suggestions` | checkbox | **no** | — |
| Enable present | `enable_present` | checkbox | **yes** | — |
| Enable export | `enable_export` | checkbox | **yes** | — |
| Enable voting | `enable_voting` | checkbox | no | phase 8 |
| Enable comments | `enable_comments` | checkbox | no | phase 7 |

`api_base` and `auth_token` stay blank: the plugin runs same-origin, so the
session cookie authenticates it and the base URL is derived from the page's own
`/version-test` prefix. They exist as an escape hatch if the board ever has to
run off-domain.

The three feature flags default to **no** because the code behind them isn't
real yet — the Pinterest picker is a static Unsplash list and "Summarize vision"
is a hardcoded string on a timer. The code is all still in the bundle; these
decide whether it's reachable.

## 4. States

| Name | Type |
|---|---|
| `active_section_id` | text |
| `active_slide_id` | text |
| `is_dirty` | yes/no |
| `is_saving` | yes/no |
| `is_loading` | yes/no |
| `last_error` | text |

## 5. Events

| Name |
|---|
| `board_loaded` |
| `error` |

Only two, because the plugin writes to the database itself over the Data API.
Bubble doesn't need to be told a slide changed — it can just read the record.
`error` exists so the page can show your own toast, and `board_loaded` so a
loading overlay can be hidden.

## 6. Element code

- **Headers** → paste `bubble/element_headers.html`, replacing the two
  `REPLACE-ME` URLs with the File Manager URLs from step 1.
- **initialize** → paste `bubble/element_initialize.js`.
- **update** → paste `bubble/element_update.js`.

Under **Shared → Plugin API access**, no keys are needed.

`context.uploadContent` (used by the upload adapter in `initialize`) requires
the element to run on a page where the user is logged in; it returns a
protocol-relative `//s3...` URL, which the adapter rewrites to `https:`.

## 7. Place it on a page

1. In the app editor, refresh the plugin (Plugins → GW Moodboard → it picks up
   the new version automatically in the same account).
2. Drop `GW Moodboard` onto the event dashboard page inside a group with a
   **fixed or stretched height** — the element is `height: 100%`, so a parent
   with no resolved height collapses the canvas to a sliver.
3. Bind the fields per the table above.

### Checkpoint

Preview the page. Expect: the board loads with your real sections, dragging an
element works, the save chip goes *Unsaved → Saving → Saved*, and a reload shows
the change. Then check the browser console is clean and that Bubble's own header
and menus still paint above nothing (the app's z-indexes are re-based to 9000+,
so if a Bubble floating group is meant to cover the board, tell me and I'll drop
them).
