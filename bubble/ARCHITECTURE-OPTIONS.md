# Where should moodboard data live?

You've confirmed the plugin is **self-contained** — Bubble doesn't need to list, export or report on
moodboard contents. That retires the strongest argument for keeping the data in Bubble, so all three
options below are genuinely open.

One thing that changes in **every** option: `Moodboard Image` only existed so Bubble could query and
bulk-export images. If nothing in Bubble needs that, images can go back to being URLs inside the
slide JSON, and the schema shrinks accordingly.

---

## Option A — Bubble database, all access through backend workflows

The plugin never touches the Data API. It calls ~6 API workflow endpoints:
`get_board`, `save_slide`, `add_slide`, `delete_slide`, `upload_image`, `comment_op`.

**Permissions** live in workflow conditions, where multi-hop walks are trivial
(`Current User's Business is This Moodboard's Event's Wedding / Event Planner's Business`). Every
type stays closed to everyone; backend workflow actions ignore privacy rules by design.

| | |
|---|---|
| Privacy rules | **None.** Close every type and never think about them again |
| Denormalised fields | None |
| Auth | Real, user-scoped. A client is a client because they're on the event's collaborator list |
| Images | Bubble file storage via `context.uploadContent` |
| Concurrency | Last-write-wins per slide, plus a stale-write guard that warns and reloads |
| Who builds what | You: ~6 endpoints. Me: the client |

**Implications you should weigh:**

- **Workload Units.** Bubble bills backend workflow runs. An autosaving canvas fires a save every
  time someone stops moving something. I don't know your plan's WU headroom or how close you run to
  it — worth checking before committing, because this is the one option where editing activity has a
  direct per-action cost.
- Debugging lives in Bubble's workflow debugger rather than a code editor. Slower iteration than the
  other two.
- Everything stays in one system, one bill, one backup, one place to look when something's wrong.

---

## Option B — Bubble database, deliberately coarse privacy rules

One rule per type: `Current User is logged in`, with read and write ticked. Plugin uses the Data API
directly.

| | |
|---|---|
| Privacy rules | One per type, ~10 minutes total |
| Denormalised fields | None |
| Auth | **Any logged-in user of your app can read or write any moodboard** |
| Images | Bubble file storage |
| Concurrency | Same as A |
| Who builds what | You: 10 minutes of clicking. Me: the client |

**Implications:**

- This is roughly what `1 Project / Event` already does — `Current User is logged in` is one of its
  existing rules — so it's consistent with your app's current posture rather than a new hole.
- But it does mean one planner could read another planner's client boards by guessing an id. Whether
  that matters depends on whether your planners are strangers to each other.
- Fastest of the three to working software, by a distance.
- Easy to tighten later: swap the coarse rule for proper ones without touching the plugin.

---

## Option C — Convex, with token-based access

Moodboard data lives in Convex. The plugin talks to it directly. Bubble passes a token identifying
the board and the viewer's role.

| | |
|---|---|
| Privacy rules | None — Bubble stores nothing but the token |
| Auth | Token-scoped. Whoever holds the link has whatever rights the token carries |
| Images | Still uploadable to **Bubble** storage via `context.uploadContent`; Convex stores the URL. You don't have to move file storage to get the rest |
| Concurrency | **Real-time multiplayer, free.** Two people on a board see each other's edits live |
| Who builds what | You: add plugin fields. Me: schema, functions, client |

**Implications:**

- **The concurrency story is genuinely better, not marginally.** Everything we designed around
  same-slide collisions — the stale-write guard, the "someone else changed this" toast — stops being
  necessary. Convex subscriptions push changes to every open board. For a collaborative canvas that's
  a real product difference, not a technical nicety.
- **The auth story is genuinely weaker.** A forwarded link is full access. There's no "only
  collaborators on this event" unless Bubble signs the token and Convex verifies the signature — and
  a token minted client-side can be forged, so that signing has to happen somewhere trusted.
- **Second system.** Another dashboard, another bill, another thing to back up, another place to look
  when something breaks. Free tier is generous; this isn't about money so much as operational
  surface.
- **Fastest to iterate on by far.** Real queries, TypeScript end to end, local dev, proper testing.
  Most of what I'd be writing becomes ordinary code instead of Bubble workflow-building.
- If moodboard data ever *does* need to appear in Bubble, this is the option that makes that hard.

---

## How I'd choose

| If this matters most | Pick |
|---|---|
| Shipping something working this week | **B** |
| One system, real per-user permissions, no second bill | **A** |
| Live multiplayer editing, best iteration speed | **C** |

**My recommendation: B now, and treat A as where it lands.**

Coarse rules are ten minutes and unblock phase 5 immediately. They're no weaker than your existing
event access, and the plugin code is identical whether the rules are coarse or strict — tightening
later is Bubble-side work that doesn't touch what I build. That gets you a working moodboard fastest
without a decision you can't reverse.

I'd only reach for **C** if live multiplayer is something you actually want in the product. It's the
one thing the Bubble options can't give you, and it's a real feature, not a technical detail — but
it's also the only option that puts client data outside the system where the rest of it lives, behind
a link anyone can forward.

**The one I'd not recommend is finishing the full privacy-rule build now.** ~24 rules and two
denormalised fields across seven types, for a security model you can add later at the same cost.
