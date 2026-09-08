# Privacy rules — click by click

Six types, three rules each. This walks through **`Moodboard`** in full; the other five are
identical except for one expression, listed at the end.

Budget ~10 minutes for the first type once you've got the hang of the expression builder, then
~3 minutes each for the rest.

---

## Getting to the right screen

1. Open the Bubble editor for `eventplanner-38386`.
2. Left icon bar → the **Data** icon (the database/cylinder one).
3. Along the top: `Data types | Privacy | App data | Option sets | File manager` → click **Privacy**.
4. In the **Search** box on the left, type `Moodboard`.
5. Click **Moodboard** in the list.

The right-hand panel says *"Moodboard is publicly visible — This type is visible by everyone. Create
a rule if you want to restrict access."* with an **Add a rule** button. That message is the problem
we're fixing.

---

## Rule 1 — Admin

6. Click **Add a rule**. A rule appears with an empty **WHEN** box and, under it, **THIS THING** and
   **THIS THING'S FIELDS**.
7. Rename the rule to `Admin` (click its title).
8. Click inside the **WHEN** box. The expression builder opens as a dropdown.
9. Type or pick **`Current User`**.
10. A new dropdown appears to its right → pick **`⚙️ Role`**.
11. Next dropdown → pick **`is`**.
12. Next → pick **`App admin`**.

The WHEN box should now read: **`Current User's ⚙️ Role is App admin`**

13. Under **THIS THING**, tick **Find this in searches** and **View files attached to this**.
14. Under **THIS THING'S FIELDS**, click the tickbox in the **View** column header (the one labelled
    **ALL**) — this ticks every field at once.
15. Do the same for the **Constraint** column header.

---

## Rule 2 — The planner's team

16. Click **+ New rule** (top right of the panel).
17. Rename it `Planner team`.
18. Click the **WHEN** box.
19. Pick **`Current User`** → **`Business`** → **`is not empty`**.

    So far: `Current User's Business is not empty`

20. Now add the second half. Click to the **right of the expression** — an **and/or** dropdown
    appears. Pick **`and`**.
21. In the new segment: **`Current User`** → **`Business`** → **`is`**.
22. For the right-hand side, click its value box and build:
    **`This Moodboard`** → **`Event`** → **`Wedding / Event Planner`** → **`Business`**

The WHEN box should now read:

```
Current User's Business is not empty
and Current User's Business is This Moodboard's Event's Wedding / Event Planner's Business
```

23. Tick **Find this in searches**, **View files attached to this**, and the **ALL** tickbox on both
    the **View** and **Constraint** columns.

### Why the "is not empty" half is not optional

Bubble evaluates **`empty is empty` as true**. Drop that clause and any client whose `Business` is
empty matches any event whose planner's `Business` is empty — and gets full planner access to a
stranger's moodboard. It fails open, silently, and only for accounts with incomplete data, which is
exactly the kind of bug that survives testing. Worth checking whether your existing rules elsewhere
compare two possibly-empty fields the same way.

### Why it's `Wedding / Event Planner's Business` and not `Creator`

`Wedding / Event Planner` is a **User**, and `User` has a **`Business`** field. Going through
`Business` covers your whole team; going through `Creator` would only cover whoever made the event.

---

## Rule 3 — Clients and collaborators

24. Click **+ New rule**. Rename it `Collaborators`.
25. Click the **WHEN** box and build:
    **`This Moodboard`** → **`Event`** → **`Collaborator Accesses`** → **`User`** → **`contains`** →
    **`Current User`**

```
This Moodboard's Event's Collaborator Accesses's User contains Current User
```

26. Tick **Find this in searches** and **View files attached to this**.
27. Tick the **ALL** box on the **View** column.
28. **Leave Constraint unticked** on this rule — clients read the board, they don't search it.

---

## The important last step: close the public read

29. Below your three rules there's a final one — **Everyone else** (it may be greyed out or unnamed).
30. Make sure **Find this in searches** is **UNTICKED**.
31. Make sure **no fields** are ticked under **View**.

This is the rule that currently makes the type world-readable. The three rules above are additive on
top of it, so until this one is closed, nothing else matters.

---

## Repeat for the other five types

Everything is identical except the path from the thing to its event, which gets one segment longer
for the nested types. In rules 2 and 3, substitute:

| Type | Replace `This Moodboard's Event` with |
|---|---|
| `Moodboard Section` | `This Moodboard Section's Moodboard's Event` |
| `Moodboard Image` | `This Moodboard Image's Moodboard's Event` |
| `Moodboard Image Vote` | `This Moodboard Image Vote's Moodboard image's Moodboard's Event` |
| `Moodboard Thread` | `This Moodboard Thread's Moodboard's Event` |
| `Moodboard Comment` | `This Moodboard Comment's Thread's Moodboard's Event` |

Rule 1 (Admin) is character-for-character the same on all six.

---

## One thing to tell me before you start ticking

When you add a rule on one of these types, the **THIS THING** section may show more checkboxes than
the two I've named — exposed-to-API types can also offer something like **Modify via API** and
**Delete via API**, which is what actually authorises the plugin to write.

I've only seen the panel on the `User` type, which isn't API-exposed, so I don't know exactly what
appears here. **Screenshot that section on the first rule you create** and I'll tell you precisely
which to tick on which rule. I'd rather ask than have you tick a box I'm guessing at.

Rough expectation, to be confirmed: writes need to be allowed on `Moodboard Section` (autosave),
`Moodboard Image` (uploads) for the **planner team** rule, and on `Moodboard Image Vote`,
`Moodboard Thread`, `Moodboard Comment` for **both** the planner and collaborator rules.

**Deliberately never writable by clients: `Moodboard Section`.** Its `Slides JSON` is a single text
field, so write access there is write access to the entire canvas — a client could move or delete
every element on the board. That's the whole reason votes and comments are separate types.

---

## Then I verify it, in about a minute

Tell me when it's done and I'll run:

1. **Anonymous fetch of all six** — every one must come back `count: 0`. If any still returns rows,
   I'll name which and which rule is loose.
2. **Authenticated fetch** — must return your data. This is also the first real proof the session
   cookie identifies you as `Current User`; the current wide-open state makes that untestable.
3. **A write** — today's `401 Permission denied: cannot create` has to become a success.

Number 3 is the gate on phase 5. If it still fails, the write path becomes backend API workflows
instead of the Data API, and I'll tell you that rather than working around it.
