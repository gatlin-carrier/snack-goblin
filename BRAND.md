# Snack Goblins — brand & voice guide

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

## Out of scope (deliberately)

- Macro/calorie obsession. We track nutrition for the toddler — for adults
  it's a soft optional. We don't optimize for weight loss; that's not our
  promise.
- Streaks as primary motivator. (See "forgiveness over streaks.")
- Public/social features. Private app for our weird little family.
- Notifications that nag. Sunday recap is encouraging. No "you haven't
  cooked in 3 days" guilt pings.
