# Phase 10 — the `GW Moodboard` plugin element

**Status: built.** The element, its 19 fields, 6 states, 2 events and all three code
blocks exist in the plugin editor and survived a reload. What is left is placing it on
a page and binding the fields — section 7.

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
exactly. Every field carries a one-line Documentation string, which the app's property
editor shows as help text.

**Editor type matters.** *Static text* fields take a literal string and nothing else —
no dynamic-expression composer, so they cannot be bound to anything. Every field that
has to read from the page is *Dynamic value*; only the feature flags, which are
editor-time toggles rather than data, stay checkboxes.

| Name | Key | Editor | Default | Bind to |
|---|---|---|---|---|
| Moodboard id | `moodboard_id` | Dynamic value / text | — | `Current page Event's Moodboard's unique id` |
| Event name | `event_name` | Dynamic value / text | — | `Current page Event's Name` |
| Event date | `event_date` | Dynamic value / date | — | `Current page Event's Date` |
| Current user id | `current_user_id` | Dynamic value / text | — | `Current User's unique id` |
| Current user name | `current_user_name` | Dynamic value / text | — | `Current User's Name` |
| Current user initials | `current_user_initials` | Dynamic value / text | — | leave blank — derived from the name |
| Is planner | `is_planner` | Dynamic value / yes-no | — | `Current User's Business is not empty` |
| Read only | `read_only` | Dynamic value / yes-no | — | — |
| Logo url | `logo_url` | Dynamic value / text | — | your wordmark's file URL |
| Height css | `height_css` | Dynamic value / text | `100%` | — |
| API base | `api_base` | Dynamic value / text | — | leave blank |
| Auth token | `auth_token` | Dynamic value / text | — | leave blank |
| Show pinterest | `show_pinterest` | Checkbox | **no** | — |
| Show AI summarize | `show_ai_summarize` | Checkbox | **no** | — |
| Show suggestions | `show_suggestions` | Checkbox | **no** | — |
| Enable present | `enable_present` | Checkbox | **yes** | — |
| Enable export | `enable_export` | Checkbox | **yes** | — |
| Enable voting | `enable_voting` | Checkbox | no | phase 8 |
| Enable comments | `enable_comments` | Checkbox | no | phase 7 |

Every Dynamic value field is marked **Optional** except `Moodboard id`. Optional keeps
Bubble's issue checker from blocking the page over a field you haven't got round to;
`Moodboard id` stays required on purpose, so an unbound one is flagged in the editor
rather than silently loading the sample board.

`api_base` and `auth_token` stay blank: the plugin runs same-origin, so the session
cookie authenticates it and the base URL is derived from the page's own `/version-test`
prefix. They exist as an escape hatch if the board ever has to run off-domain.

The three feature flags default to **no** because the code behind them isn't real yet —
the Pinterest picker is a static Unsplash list and "Summarize vision" is a hardcoded
string on a timer. The code is all still in the bundle; these decide whether it's
reachable.

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

| Name | Caption |
|---|---|
| `board_loaded` | has loaded the board |
| `error` | hits an error |

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
3. Bind the fields per the table above. `Moodboard id` comes from the Event: add a
   `Moodboard` field to your Event type, create the row on page load when it's empty,
   and bind to `Current Page Event's Moodboard's unique id` — a stored reference rather
   than a search that runs on every load and again per row in any list of events.

### Fonts

The Headers block loads only the board's own two families. The seven optional ones
(Inter, Roboto, Open Sans, Montserrat, Poppins, Lato, Lora) are fetched by the bundle the
first time a board uses one, so a board that uses none costs nothing.

### Open: Bubble never calls the element's code

On `test_moodboard` the element renders — right plugin id, right element id, visible,
1470x442 — and then nothing happens. No board, no error, no console output.

Ruled out, each checked on the live page:

| Checked | Result |
|---|---|
| Bundle reaches the page | `window.GWMoodboard` present, correct build stamp |
| Bundle works there | mounting by hand into a scratch div rendered the whole app |
| jQuery | present (`use_jquery: true`) |
| Element code deployed | found in the app's `static.js`, current text |
| Code compiles | `eval` of `plugin_elements.AAC.code.initialize.fn` returns a function |
| Element id matches | instance uses `AAC`; `AAC` is the defined element |
| A stale instance | a freshly dropped second instance behaved identically |
| `initialize` running at all | a `console.log` on its first line never printed |
| Errors | none, in normal or `?debug_mode=true` |

So the element definition, its code and the bundle are all correct and present, and
Bubble's runtime simply does not invoke `initialize` or `update` for either instance.
That is on the Bubble side of the boundary, and worth a forum or support question with
the table above.

Ruled out since: testing mode (another testing-mode plugin runs fine) and installation
(the plugin is installed). A second plugin element dropped into the *same group on the
same page* initialised and rendered normally while ours stayed empty — so it is this
plugin, not the page, the group, or Bubble's testing path.

**The app's copy of the plugin is not what the plugin editor holds.** The editor shows
`Enable present` and `Enable export` defaulting to true and the element sized 1200x800;
the definition the app actually loads has no defaults at all and `default_dim` of
400x200 — while carrying the most recent `initialize`. So the app has current code and
stale field metadata at the same time.

That mismatch is the best remaining lead, and it points at re-installing rather than
editing: **remove GW Moodboard from the app's Plugins tab and add it back**, so the app
takes a fresh snapshot.

Two smaller differences worth knowing if that doesn't do it — ours is the only element on
this app using a `Checkbox` field (seven of them) or a `date` field, and both are things
Bubble has to convert while assembling `properties`, before it ever calls our code.

### One thing still unverified

Bubble derives each property key from the field *name* (lowercased, non-alphanumerics
to underscores), so `Show AI summarize` should arrive as `properties.show_ai_summarize`.
That rule is not visible anywhere in the plugin editor — the first place it can be
checked is a real page. If a binding comes through empty, that's the cause, and the fix
is renaming the field rather than changing the code.

### Checkpoint

Preview the page. Expect: the board loads with your real sections, dragging an
element works, the save chip goes *Unsaved → Saving → Saved*, and a reload shows
the change. Then check the browser console is clean and that Bubble's own header
and menus still paint above nothing (the app's z-indexes are re-based to 9000+,
so if a Bubble floating group is meant to cover the board, tell me and I'll drop
them).
