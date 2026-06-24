# Product specification: calorie & macro tracker

> Business logic and product behaviour. Technical implementation (stack,
> architecture, slices, infra) follows the reference projects (Invocore /
> SuedFenster house stack). This document is WHAT the product does and HOW it
> must behave. Section numbers (§) are referenced throughout the code.

## 1. Essence

A personal nutrition tracker for weight control. Computes a daily calorie + macro
target for the user's goal, keeps a food diary, shows the day's remaining budget,
and a smoothed weight trend.

Principle: a tool, not a subscription funnel. No ads, no paywalls, no upselling.
Every feature is always available. A direct answer to what makes Yazio /
MyFitnessPal frustrating — the basics work but are buried under ads and a paywall.

Second principle: the app doesn't just count — it explains the method and warns
about mistakes. The user should understand *why* the correct result needs this
sequence of actions, not trust the numbers blindly.

## 2. Users

Multi-user from day one. Each user has their own profile, goals, diary, weight
history. One user's data is invisible to others. The first user is the owner;
the structure supports several (a partner, later clients).

## 3. Domain entities (business level)

- **Profile**: sex, age, height, current weight, activity level, goal.
- **Goal**: direction (minus/zero/plus), desired weekly rate of weight change.
- **Norm**: computed daily calorie + macro targets (protein/fat/carb in grams).
- **Food**: name, brand, optional barcode, nutrition per 100 g, portion list.
- **Portion**: named size (piece, slice, cup, package) with weight in grams.
- **Diary entry**: food + amount (grams or portions) + meal + date.
- **Meal**: breakfast, lunch, dinner, snack.
- **Weight measurement**: date + weight. The smoothed trend derives from a series.
- **Calibration status**: which phase (calibrating / done), days collected.
- **User experience**: counter of days used + warnings shown/accepted; drives
  warning intensity (§5.2).

## 4. Calculation logic (the core; pure domain functions, no IO)

The most important part. All thresholds/constants come from §6, never hardcoded.

### 4.1 Starting calorie estimate
A GUESS to start, not the final norm. Mifflin-St Jeor BMR:
- Men: BMR = 10·kg + 6.25·cm − 5·age + 5
- Women: BMR = 10·kg + 6.25·cm − 5·age − 161

TDEE = BMR · activity factor: 1.2 sedentary, 1.375 light, 1.55 moderate,
1.725 high, 1.9 very high. Used ONLY to seed calibration (§4.4) — the formula
misses for individuals, so you can't build a deficit on it directly.

### 4.2 Macro targets
Protein priority, rest distributed:
- Protein: g/kg of body mass (default 1.6–2.2 for lifters); user may set an
  absolute number (e.g. 180 g). Custom protein is free (unlike MFP).
- Fat: not below the floor (default 0.8 g/kg).
- Carbs: fill the remaining calories after protein and fat.
User may set targets as % of calories or absolute grams. Both free.

### 4.3 Trend weight (required v1)
Raw weight swings 1–2 kg/day on water, glycogen, salt. Showing the raw number on
a cut is bad for morale, so the main metric is the smoothed trend.
EMA: trend_today = trend_yesterday + α·(weight_today − trend_yesterday);
α default ≈ 0.1; first trend = first measurement. Plot raw points + trend line;
base progress on the trend.

### 4.4 Calibration phase (baseline, required v1)
What serious practitioners do (RP / Israetel). Without it the app starts on a
knowingly wrong formula norm.
- After onboarding the user does NOT cut immediately. For the first N days
  (default 14) they eat at the computed maintenance (§4.1), log honestly, weigh
  daily.
- The app accumulates: average daily intake and the change in the weight TREND.
- At window end, real maintenance from facts:
  real_TDEE = avg_daily_intake − (trend_change_kg · K / days), K = 7700 kcal/kg.
  (Trend up → ate above maintenance → real TDEE below intake, and vice-versa.)
- Only then is the cut/gain goal built from REAL maintenance, not the formula.

Behaviour: minimum window configurable (default 14). Until then the norm is shown
as preliminary. Degrades softly: on logging/weighing gaps the window extends, no
estimate on dirty data. The user may consciously skip ("I know my norm"), but the
default path goes through calibration and a skip shows a warning (§5.2).

### 4.5 Adaptive TDEE (continuation; auto in v2)
Calibration isn't one-off — §4.4 keeps running during the cut because TDEE falls
(metabolic adaptation). Weekly, recompute real TDEE on a sliding window and adjust
the target so the actual rate matches the goal. The key differentiator vs static
calculators. v1: manual recompute (user taps "recompute" at week's end). Automatic
weekly recompute is v2.

### 4.6 Daily summary
Eaten: sum of kcal + macros. Remaining: target − eaten, per calories and each
macro. Visual: a calorie ring + three macro bars (P/F/C) with grams remaining.

## 5. Educational layer

The app explains the method and warns about mistakes. Two mechanics: passive hints
(5.1) and active action-warnings (5.2). Tone (both): real principles (energy
balance, metabolic adaptation, muscle retention in a deficit). NEVER invent study
citations or fake numbers — an honest principle without a citation beats a fake
one. Calm coach who explains once. No moralising, shaming, scaring, or feeding
anxiety/obsession. State the consequence neutrally, no pressure.

### 5.1 Hints (passive)
Short in-context explanation, 1–2 sentences, collapsible, optional "more". Topics:
why maintenance first; why trend not morning scale; why a moderate deficit; why
protein priority; why the norm is recomputed over time.

### 5.2 Action-warnings (active)
React to a specific action that will worsen the result. Pop at the moment, say
what may go wrong and why, offer: fix or proceed consciously.
- Don't block (except the §9 hard safety bounds, e.g. an extreme deficit, which
  is clamped). The warning informs; the user decides.
- Intensity scales with experience: early on, warnings pop on almost every
  significant action; as experience grows (days + accepted warnings over the §6
  threshold) a given warning stops auto-popping and stays in help only. Don't
  nag a veteran.
- Each warning can be muted manually ("don't show again").
Triggers (extensible, thresholds from §6): too-aggressive deficit/rate; skipping
calibration; several missed/partial logging days; irregular weighing; concluding
from one day of raw weight; protein well below the recommended range on a cut;
systematically eating well under target.

### 5.3 In-day macro correction (active steering)
Not just remaining — steer toward a balanced day. Based on what's logged and the
remaining budget, gentle corrective nudges (advice tone, tied to grams remaining):
protein under by day's end → suggest topping up, show grams left; fat over budget
→ suggest easing off fatty sources in remaining meals; carbs under with calories
left → note there's room (e.g. around training); close & balanced → short
confirmation. Not blocks or judgement — navigation. Dosed, at meaningful moments
(a balance-shifting entry, or later in the day), not every bite.

### 5.4 After an overage / slip (no blame)
If the user clearly exceeds the daily calorie target, respond supportively, NOT
punitively. Guilt and compensatory restriction start a binge-restrict cycle and
crater adherence (RP teaches avoiding this). Behaviour: calmly note the fact
without judgement ("today came in above target"); explicitly say NOT to
compensate by cutting tomorrow — return to the usual plan; remind that one day
doesn't break the result, the weekly trend matters (show the week). No "work it
off", "be stricter", "make up for it", no compensatory deficit.

## 6. Configurable parameters (defaults)

Calibration window 14 d; trend α 0.1; K 7700 kcal/kg; adaptive window 7–14 d;
max loss rate ≈ 1% body weight/week (above → clamped, §9); gain surplus 250–400
kcal; protein range 1.6–2.2 g/kg; fat floor 0.8 g/kg; experience de-escalation
threshold e.g. 21 days OR N accepted warnings of that type; §5.2 trigger
thresholds (deficit deviation, missed logging days, missed weighings, protein
floor, chronic-undereating magnitude). Defaults are app-level, overridable
per-app and potentially per-user.

## 7. Food data
Source: Open Food Facts (German-market barcoded products) + USDA FoodData Central
(base ingredients). Dump loaded into our own DB; search hits our DB (no external
uptime dependency). Search by name and barcode. Users can create custom products
and save frequent products/meals as favorites.

## 8. User scenarios
1. Onboarding → starting norm + macros, explains calibration is next.
2. Calibration → N days at maintenance, honest log + daily weigh; shows progress,
   keeps norm preliminary, warns on gaps; emits real norm, switches to goal mode.
3. Logging → search or barcode, pick food, amount (g or portions), meal.
4. Quick logging → recent/frequent in one tap, copy yesterday, favorite meals.
   Speed is first-class — slow logging is why people quit tracking.
5. Weight diary → morning weight, graph raw points + trend.
6. Day view → eaten vs remaining, calories + macros.
7. Weekly recompute → recompute real TDEE, adjust norm, explain the change.
8. History → weight trend, average intake, progress vs goal.

## 9. Behavioural don'ts
No ads anywhere. No paywalled features. No purchase nags / upsell banners / video
ads. Don't scare with raw weight (trend is the metric). No extreme deficits — loss
rate capped to a healthy band (§6 default ≤ ~1% bw/week, else clamped). Don't build
a deficit on the formula norm bypassing calibration by default. Warnings don't
shame or stoke anxiety. After an overage, no guilt and no compensatory cut (§5.4).

## 10. Phases
- **v1 (now)**: profile + onboarding, starting norm + macros, CALIBRATION with
  real maintenance, manual weekly recompute, educational layer (hints + warnings),
  configurable params, food DB (OFF + USDA) with search + barcode, food diary,
  daily summary, weight diary + trend. No gym, no AI, no ads, no subscription.
- **v2**: automatic weekly adaptive TDEE, long-term analytics, weekly summaries.
- **v3 (optional)**: training integration (lifting logger, progression), later
  adaptive programs. Effectively a separate product; only if v1 sticks.

## 11. Out of scope (not now)
Training/programs (v3). AI photo food recognition (maybe later, cheap external
API). Social/feed/community. Recipes/meal plans. Fasting / intermittent eating.
