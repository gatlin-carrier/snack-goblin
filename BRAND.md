# Snack Goblin — brand & voice guide

A meal planner for ADHD brains. Not "for everyone with a side helping of ADHD"
— *for ADHD specifically*, with the understanding that what helps an ADHD
brain (low-stakes, decision-reducing, forgiving, predictable, occasionally
playful) helps every brain. We lead with that, we don't apologize for it.

## What we're not

- **Not Mealime / Plan to Eat / Yummly.** Those are utilities. We have
  personality.
- **Not a kids' app.** Lowercase warm voice, not baby-talk. Our user is a
  parent. They're tired. They're capable. They just don't want to think
  about dinner right now.
- **Not a wellness app with a meal planner bolted on.** We're a meal
  planner that knows the user is a person.

## Design references

- **Goblin Tools** (goblin.tools) — cream backgrounds, lowercase warm voice,
  the spiciness slider, deliberate minimalism, *every interaction designed
  to reduce visible decisions.*
- **Finch** (finch.care) — mascot reacts to user state; rewards build
  narrative, not pressure; soft pastels; encouragement framed positively.
- **Crouton, NYT Cooking** — typography confidence, cards as primary
  surface, beautiful food photography. (Already where we are visually.)
- **Mealime** — taste quiz reduces decisions on signup.
- **Whisk** — pantry-aware shopping list. (Already have.)

## Visual language (current state)

Liquid Glass + warm-light + Fraunces italic display + Inter body.
Terracotta accent, sage secondary, butter-pastel and rust supporting.
Frosted-glass surfaces with backdrop saturation, hairline rings, soft drops.

This stays. It already reads "cozy / safe / non-panicky" — exactly what
ADHD-friendly looks like. Goblin character layers on top, doesn't replace.

Future palette nudge: add **lavender** as a third accent for "low capacity"
/ mood-aware features. Use sparingly.

## Voice rules

1. **Functional first, warm second.** Never sacrifice clarity for tone.
2. **Lowercase mostly** in toasts, empty states, and goblin-voiced copy.
   Title Case only for proper nouns + section headers.
3. **First-person from the goblin** sparingly — "i'll remember", "i'll
   draft one". Never overdone.
4. **Never apologetic, never saccharine, never condescending.**
5. **Short.** Same lengths as current strings, just warmer.
6. **No false urgency.** No exclamation marks unless something genuinely
   delightful happened. No "URGENT!" / "Important:" / red FOMO copy.
7. **Reframe loss as count.** "8 meals cooked this month" beats "you broke
   your streak."
8. **System errors stay informative.** Don't goblin-ify a "failed to load"
   message just to be cute. Clarity wins.

## Voice examples

| Bad (too dry) | Bad (too cute) | Good |
|---|---|---|
| Pantry is empty | the snack pantry is so empty, lil goblin sad | the stash is bare. toss something in. |
| No cook history yet | u haven't cooked anything yet bestie | no meals on record. cook one and i'll remember. |
| Removed "X" | byeeee X 👋✨ | tossed "X". |
| Failed to load template | oh no the goblin dropped the template :( | couldn't load that one. try again? |
| Swapped | swap success!!! | swapped. nice trade. |

## The mascot

A small goblin with **state-based reactions** tied to user data. Lives on
the dashboard top-left and on splash/login. Possible states:

| State | Trigger | Copy |
|---|---|---|
| sleeping 😴 | no plan, no recent cooks | the goblin's napping. give 'em something to do. |
| curious 👀 | new recipes generated, not yet planned | the goblin sees something interesting. |
| cooking 🍳 | active CookMode session | stirring the pot. |
| well-fed 🤤 | cooked ≥3× this week | the goblin's content. proud of you. |
| hungry 🥺 | <2 meals planned, week half over | the goblin's looking at you funny. |
| fixated 🤓 | same recipe cooked 3+ times in 2 weeks | the goblin loves when you make {recipe}. |

(Implementation deferred to Phase B.)

## Roadmap

### Phase A — voice & empty states ✅ in progress
Rewrite empty states, toasts, ntfy notifications. Zero functional risk.

### Phase B — mascot reactions
Add SVG/illustration goblin with state-based variants. Wire to data.
Surfaces: dashboard widget, login splash, occasional toasts.

### Phase C — energy slider + decision reduction (Goblin Tools moment)
- "today's energy" pill: 🔋 low / 🔋🔋 mid / 🔋🔋🔋 high
- Filters auto-curate, recipe browser sort, dashboard suggestions
- Big "just pick for me" surfaced on dashboard
- Default to 1 dinner option, expand for more

### Phase D — forgiveness + streak reframe
- "Skip + forgive" button (no shame accumulation)
- Reframe streaks as positive count ("8 cooks this month")
- Remove punitive nutrition warnings when low-capacity mode is on

### Phase E — mood check-in + low capacity mode (Finch moment)
- "before i pick — how's today?" prompt before generation
- App-wide "low capacity day" toggle in More menu
- After-cook reflection prompt: "how did that feel?"

### Phase F — onboarding ritual
- 3-step first-run: pick energy default, pick a hated cuisine, pick favorite
  comfort meal type
- Goblin "i'll remember that" close

### Phase G — households (shared data between family members)
**Goal:** husband + wife (and eventually grown-up kid roles) see the same
recipes, plans, pantry, shopping list. Each member has their own login,
their own per-user prefs (energy, mood, adult goals), but everything
content-y is household-scoped.

**Schema:**
```sql
CREATE TABLE households (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,                          -- "the carrier den"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  founder_user_id TEXT NOT NULL
);

CREATE TABLE household_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id TEXT,                       -- null until they log in for the first time
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'member',         -- 'founder' | 'member'
  invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  joined_at DATETIME,
  UNIQUE(household_id, email)
);
```

**Migration:**
- ALTER all 13 user-scoped tables to add `household_id INTEGER`
- On first founder login: create `households` row, add user as `founder`
  member, backfill all existing rows with that household_id
- Replace per-query `user_id` filtering with `household_id` filtering
  (auth middleware sets `req.householdId` derived from
  `household_members.user_id = req.userId`)

**Auth middleware updates:**
- Look up `household_members.email = req.user.email`
- If found: set `req.householdId`, claim the row's user_id if null
  (replaces ALLOWED_EMAILS env var as the gate — invitation IS the gate)
- If not found: 403 "this account isn't part of any household"
- Fall back to ALLOWED_EMAILS for legacy compatibility / break-glass

**Onboarding step (insert between current step 0 and step 1):**
- "who else is in this household?"
- Repeating row: name + email + role pill (parent / kid / adult / etc)
- Skip allowed (singleton household)
- On submit: invite emails → household_members rows. They get a magic
  link via Supabase admin invite; on first login they're auto-linked.
- Goblin copy: "anyone else in the den? add their email and i'll
  let them in when they sign in."

**UI surfaces:**
- Settings → "Household" panel: rename, list members, invite, remove
- Top-nav avatar/initial chip showing whose session is active
- Activity attribution: cook log shows "cooked by gatlin", recipe history
  shows who added each recipe (use existing user_id columns for attribution
  even though scoping is household-level)
- Optional: per-member visibility toggles for sensitive things (adult
  goals stay private to each member by default — already are, since they're
  in user_prefs)

**Estimated scope:** 1–1.5 days. Touches schema, auth middleware,
~118 SQL queries (the Phase 1B work that was deferred), onboarding UI,
new Settings panel.

## Auth wishlist (separate from the brand phases)

These are infra/UX improvements to the auth flow, tracked here so they
don't get lost. Standalone projects, can ship in any order.

### Face ID / WebAuthn passkey unlock
**Why:** magic link is great for cold logins but annoying when you're
already on your phone and just want to peek. Face ID for re-auth on a
trusted device is the iPhone-native expectation.

**Approach:**
- After first magic-link login, prompt: "use Face ID to sign in next time?"
- Use the Web Authentication API: `navigator.credentials.create()` with
  `userVerification: 'required'` registers a platform passkey on iOS/macOS
- Store the credential's public key on the backend (new `user_passkeys`
  table keyed by user_id)
- Login screen adds a "👁 use Face ID" pill above the email input when a
  passkey is registered for this device — `navigator.credentials.get()`
  challenges the device, backend verifies, issues Supabase session
- Supabase doesn't support WebAuthn directly, but the verified passkey
  can be used to sign a custom JWT or trigger a passwordless sign-in
- For PWA install (Add to Home Screen), this also unlocks "biometric on
  app open" without leaving Safari

**Estimated scope:** 1 day. New backend endpoints (register/verify), new
DB table, Login screen UX, fallback to magic link.

### Remember me / longer-lived sessions
**Why:** currently Supabase sessions expire ~1 hour with refresh extending
to ~1 week. For a private family app, sessions could comfortably be
30 days. Less re-auth friction.

**Approach:**
- Supabase dashboard → Authentication → Settings → bump JWT expiry +
  refresh token rotation window (project-wide, not per-user)
- OR: add a "remember me" checkbox on Login that calls `signInWithOtp`
  with `options.shouldCreateUser: false, options.captchaToken: undefined`
  — then on auth state change, opt into longer refresh
- Actually the cleanest path: just bump expiry in Supabase dashboard.
  No code changes needed. Default to long-lived for this app.

**Estimated scope:** 5 minutes (dashboard config) + optional 1 hr to add
a "stay signed in" toggle on Login if you want per-session control.

## Spec for the four core ADHD-features

These are the load-bearing features that make this app *for ADHD* and not
just a meal planner with goblins on top:

1. **Spiciness / energy slider** (Goblin Tools borrow). Defaults to mid,
   persists, one tap to lower. Becomes the universal filter.
2. **Just pick for me.** One tap. Goblin picks based on energy, pantry,
   last week's pattern. Already exists as auto-curate; needs surfacing.
3. **Forgiveness over streaks.** No shame accumulation. Skipped meals
   are forgiven, not logged as failures.
4. **Mascot reactions.** The goblin cares without judging. Reacts to your
   week, never punishes.

## Color & nutrition feedback rules

**No red/green/yellow traffic-light coding for nutrition.** Even pastel
versions reinforce a "good/bad/scolding" frame that hits perfectionism
loops in ADHD brains. Specifically:

- **Nutrition bars** (iron, DHA, calcium, etc.) use a single calm tone —
  not pct-keyed coloring. The bar shows progress toward the day's target
  in sage; the number to its right is the fraction. The user interprets.
- **No "✓ great!" or "⚠ low" labels.** Just `12 / 18 mg` and a soft fill.
- **Optional gentle nudge** in plain prose, only when very low (<50%):
  "iron's a bit low. red meat or lentils when you can." Never repeated,
  never pushed to the top of a screen, never with an alert icon. Hidden
  entirely on low-capacity days.
- **Reaction severity** (first foods log) keeps differentiated tones
  *only* for safety (severe = red) — but uses pastels and never large
  splashes. A severe reaction warning that's anxiety-inducing is doing
  its job; one for "calcium 70%" is doing harm.
- **Streaks / counts** stay neutral — never red for "you broke it" or
  green for "yay." Just numbers.

**Color *is* used for:**
- Brand identity (terracotta wordmark, sage success accents)
- Functional state (active button, current selection, focus ring)
- Time elapsed (timer fills with sage when complete — positive only)

## Out of scope (deliberately)

- Macro/calorie obsession. We track nutrition for the toddler — for adults
  it's a soft optional. We don't optimize for weight loss; that's not our
  promise.
- Streaks as primary motivator. (See "forgiveness over streaks.")
- Public/social features. Private app for our weird little family.
- Notifications that nag. Sunday recap is encouraging. No "you haven't
  cooked in 3 days" guilt pings.
