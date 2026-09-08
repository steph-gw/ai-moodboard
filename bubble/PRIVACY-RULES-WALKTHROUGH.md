# Privacy rules — as you build them in Bubble

Every `→` below is **one dropdown selection** in the expression builder, in order. Click the empty
**WHEN** box, then work left to right.

For each type: **Data → Privacy →** search the type → click it → **Add a rule** (first) or
**+ New rule** (after that).

**Tick boxes**, under each rule:
- **read** = *Find this in searches* ✓, *View files attached to this* ✓, **ALL** on the **View** column ✓
- **read + write** = the above, plus the API-write box

Most types need **3 rules**. `Moodboard Slide` needs 4.

---

## Rule 1 — identical on all seven types · read + write

```
Current User → ⚙️ Role → is → App admin
```

---

## `Moodboard` — already done, for reference

**Rule 2 · Planner team · read + write**
```
Current User → Business → is not empty
→ and
Current User → Business → is
   → This Moodboard → Event → Wedding / Event Planner → Business
```

**Rule 3 · Collaborators · read ONLY**
```
This Moodboard → Event → Collaborator Accesses → User → contains → Current User
```

---

## `Moodboard Section`

**Rule 2 · Planner team · read + write**
```
Current User → Business → is not empty
→ and
Current User → Business → is
   → This Moodboard Section → Moodboard → Event → Wedding / Event Planner → Business
```

**Rule 3 · Collaborators · read ONLY**
```
This Moodboard Section → Moodboard → Event → Collaborator Accesses → User → contains → Current User
```

---

## `Moodboard Slide` — 4 rules

**Rule 2 · Planner team · read + write**
```
Current User → Business → is not empty
→ and
Current User → Business → is
   → This Moodboard Slide → Section → Moodboard → Event → Wedding / Event Planner → Business
```

**Rule 3 · Collaborators reading · read ONLY**
```
This Moodboard Slide → Section → Moodboard → Event → Collaborator Accesses → User → contains → Current User
```

**Rule 4 · Collaborators editing · read + write**
```
This Moodboard Slide → Section → Moodboard → Event → Collaborator Accesses → User → contains → Current User
→ and
This Moodboard Slide → Section → Locked slides → doesn't contain → This Moodboard Slide
→ and
This Moodboard Slide → Section → Status → is not → Approved
```

---

## `Moodboard Image`

**Rule 2 · Planner team · read + write**
```
Current User → Business → is not empty
→ and
Current User → Business → is
   → This Moodboard Image → Moodboard → Event → Wedding / Event Planner → Business
```

**Rule 3 · Collaborators · read + WRITE**
```
This Moodboard Image → Moodboard → Event → Collaborator Accesses → User → contains → Current User
```

---

## `Moodboard Image Vote`

**Rule 2 · Planner team · read + write**
```
Current User → Business → is not empty
→ and
Current User → Business → is
   → This Moodboard Image Vote → Moodboard image → Moodboard → Event → Wedding / Event Planner → Business
```

**Rule 3 · Collaborators · read + WRITE**
```
This Moodboard Image Vote → Moodboard image → Moodboard → Event → Collaborator Accesses → User → contains → Current User
```

---

## `Moodboard Thread`

**Rule 2 · Planner team · read + write**
```
Current User → Business → is not empty
→ and
Current User → Business → is
   → This Moodboard Thread → Moodboard → Event → Wedding / Event Planner → Business
```

**Rule 3 · Collaborators · read + WRITE**
```
This Moodboard Thread → Moodboard → Event → Collaborator Accesses → User → contains → Current User
```

---

## `Moodboard Comment`

**Rule 2 · Planner team · read + write**
```
Current User → Business → is not empty
→ and
Current User → Business → is
   → This Moodboard Comment → Thread → Moodboard → Event → Wedding / Event Planner → Business
```

**Rule 3 · Collaborators · read + WRITE**
```
This Moodboard Comment → Thread → Moodboard → Event → Collaborator Accesses → User → contains → Current User
```

---

## Notes on the builder

- **`→ and`** — after a complete condition, click to the right of it; an `and` / `or` dropdown
  appears. Pick `and`, then build the next part the same way.
- **`is not empty`** is in the same dropdown as `is` and `is not`, after you've picked a field.
- **`contains` / `doesn't contain`** appear instead of `is` when the field on the left is a **list**
  (`Collaborator Accesses`, `Locked slides`).
- The indented line under `→ and` in rule 2 is the **right-hand side** of `is` — you click the value
  box after the operator and build the chain there.

---

## Last step on every type

Below your rules is a final **Everyone else** rule.

- **Untick *Find this in searches***
- Leave **no fields** ticked under **View**

Five of your seven types currently return data to a completely anonymous request. This is the rule
that stops that. Everything above is additive on top of it — until this is closed, none of it matters.

---

## Two that are easy to get wrong

**`Current User's Business is not empty` is load-bearing.** Bubble evaluates `empty is empty` as
**true**. Drop that clause and any client whose `Business` is empty matches any event whose planner's
`Business` is empty — planner access to a stranger's board. Fails open, silently, only for accounts
with incomplete data.

**It's `Wedding / Event Planner → Business`, not `Creator`.** `Wedding / Event Planner` is a User and
`User` has a `Business` field, so this covers your whole team. `Creator` would only cover whoever
happened to create the event.

---

## Then tell me and I'll verify

1. **Anonymous fetch of all seven** — every one must return `count: 0`. I'll name any that don't.
2. **Authenticated fetch** — must return your data.
3. **A write** — today's `401 Permission denied: cannot create` has to succeed.

For 2 and 3 to mean anything, the test `Moodboard` record needs its `Event` set to one of your real
events. Otherwise every rule walks to an empty Event, matches nothing, and a pass looks identical to
a failure.

**Send me a screenshot of the tick boxes on your first rule.** Which box authorises API writes is the
last thing I'm guessing at, and it matters in both directions — rule 3 on `Moodboard Section` must
*not* have it, rule 3 on `Moodboard Comment` must.
