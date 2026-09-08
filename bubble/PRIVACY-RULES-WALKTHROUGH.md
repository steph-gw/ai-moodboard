# Privacy rules — every rule written out

For each type: **Data → Privacy →** search the type → click it → **Add a rule** / **+ New rule**.

Each rule has a **WHEN** box (built from dropdowns) and, under it, tick boxes. Where this says
**read**, tick *Find this in searches*, *View files attached to this*, and the **ALL** box on the
**View** column. Where it says **read + write**, tick those plus the API-write box.

Most types need **3 rules**. Only `Moodboard Slide` needs 4.

---

## Rule 1 is the same on all seven types

**WHEN:** `Current User's ⚙️ Role is App admin` → **read + write**

Build it: `Current User` → `⚙️ Role` → `is` → `App admin`

That one never changes. Everything below is rules 2, 3 and (for slides) 4.

---

## `Moodboard` — done already, listed for reference

**2. Planner team** — read + write
```
Current User's Business is not empty
and Current User's Business is This Moodboard's Event's Wedding / Event Planner's Business
```

**3. Collaborators** — **read only**
```
This Moodboard's Event's Collaborator Accesses's User contains Current User
```

---

## `Moodboard Section`

**2. Planner team** — read + write
```
Current User's Business is not empty
and Current User's Business is This Moodboard Section's Moodboard's Event's Wedding / Event Planner's Business
```

**3. Collaborators** — **read only**
```
This Moodboard Section's Moodboard's Event's Collaborator Accesses's User contains Current User
```

> Clients never write sections. Deleting one would take its slides with it, locked ones included.

---

## `Moodboard Slide` — the only type with 4 rules

**2. Planner team** — read + write
```
Current User's Business is not empty
and Current User's Business is This Moodboard Slide's Section's Moodboard's Event's Wedding / Event Planner's Business
```

**3. Collaborators reading** — **read only**
```
This Moodboard Slide's Section's Moodboard's Event's Collaborator Accesses's User contains Current User
```

**4. Collaborators editing** — read + write
```
This Moodboard Slide's Section's Moodboard's Event's Collaborator Accesses's User contains Current User
and This Moodboard Slide's Section's Locked slides doesn't contain This Moodboard Slide
and This Moodboard Slide's Section's Status is not Approved
```

> This is the lock, and it's enforced by the database — a client can't get past it by calling the API
> directly. Rule 3 keeps locked slides readable; rule 4 is what makes them editable while they're
> open. Since `Locked slides` lives on the section, which clients never write, only you can lock and
> unlock.

---

## `Moodboard Image`

**2. Planner team** — read + write
```
Current User's Business is not empty
and Current User's Business is This Moodboard Image's Moodboard's Event's Wedding / Event Planner's Business
```

**3. Collaborators** — **read + write** (clients upload images)
```
This Moodboard Image's Moodboard's Event's Collaborator Accesses's User contains Current User
```

---

## `Moodboard Image Vote`

**2. Planner team** — read + write
```
Current User's Business is not empty
and Current User's Business is This Moodboard Image Vote's Moodboard image's Moodboard's Event's Wedding / Event Planner's Business
```

**3. Collaborators** — **read + write** (clients vote)
```
This Moodboard Image Vote's Moodboard image's Moodboard's Event's Collaborator Accesses's User contains Current User
```

---

## `Moodboard Thread`

**2. Planner team** — read + write
```
Current User's Business is not empty
and Current User's Business is This Moodboard Thread's Moodboard's Event's Wedding / Event Planner's Business
```

**3. Collaborators** — **read + write** (clients drop pins)
```
This Moodboard Thread's Moodboard's Event's Collaborator Accesses's User contains Current User
```

---

## `Moodboard Comment`

**2. Planner team** — read + write
```
Current User's Business is not empty
and Current User's Business is This Moodboard Comment's Thread's Moodboard's Event's Wedding / Event Planner's Business
```

**3. Collaborators** — **read + write** (clients comment)
```
This Moodboard Comment's Thread's Moodboard's Event's Collaborator Accesses's User contains Current User
```

---

## Last step on every type — the one that actually closes the hole

Below your rules is a final **Everyone else** rule.

- **Untick *Find this in searches***
- Leave **no fields** ticked under **View**

Right now five of your seven types return data to a completely anonymous request. This is the rule
that stops that. The rules above are additive on top of it — until this one is closed, nothing else
matters.

---

## Two things that are easy to get wrong

**`Current User's Business is not empty` is load-bearing.** Bubble evaluates `empty is empty` as
**true**. Without that clause, any client whose `Business` is empty matches any event whose planner's
`Business` is empty, and gets planner access to a stranger's board. It fails open, silently, and only
for accounts with incomplete data.

**It's `Wedding / Event Planner's Business`, not `Creator`.** `Wedding / Event Planner` is a User and
`User` has a `Business` field, so going through `Business` covers your whole team. `Creator` would
only cover whoever happened to create the event.

---

## Building the long expressions

They look long written out, but each is one chain of dropdowns. For rule 3 on `Moodboard Comment`:

`This Moodboard Comment` → `Thread` → `Moodboard` → `Event` → `Collaborator Accesses` → `User` →
`contains` → `Current User`

For the two-part rule 2, build `Current User's Business is not empty` first, then click to the right
of it, pick **`and`**, and build the second half.

---

## Then tell me and I'll verify

1. **Anonymous fetch of all seven** — every one must return `count: 0`. I'll name any that don't.
2. **Authenticated fetch** — must return your data.
3. **A write** — today's `401 Permission denied: cannot create` has to succeed.

For 2 and 3 to mean anything, the test `Moodboard` record needs an `Event` set to one of your real
events — otherwise every rule walks to an empty Event, matches nothing, and a pass looks identical to
a failure.

**Send me a screenshot of the tick boxes on your first rule.** Which one authorises API writes is the
last thing I'm guessing at, and it now matters in both directions — rule 3 on `Moodboard Section` must
*not* have it, rule 3 on `Moodboard Comment` must.
