/* ============================================================================
   mb-nutrition.js — Midlife Brotherhood nutrition engine
   Shared by index.html (client) and admin.html (coach). Plain JS, no build step.
   Everything hangs off window.MB.
   ========================================================================== */
(function (global) {
'use strict';

/* ---------------------------------------------------------------- units ---- */
var LB_TO_KG = 0.45359237, IN_TO_CM = 2.54;
function lbsToKg(v) { return v * LB_TO_KG; }
function kgToLbs(v) { return v / LB_TO_KG; }
function inToCm(v)  { return v * IN_TO_CM; }
function cmToIn(v)  { return v / IN_TO_CM; }
function r0(v) { return Math.round(v); }
function r1(v) { return Math.round(v * 10) / 10; }

/* ------------------------------------------------------------ activity ---- */
var ACTIVITY = [
  { key: 'sedentary', value: 1.2,   label: 'Sedentary',    hint: 'Desk job, little or no training' },
  { key: 'light',     value: 1.375, label: 'Light',        hint: 'Training 1-3 days a week' },
  { key: 'moderate',  value: 1.55,  label: 'Moderate',     hint: 'Training 3-5 days a week' },
  { key: 'very',      value: 1.725, label: 'Very Active',  hint: 'Training 6-7 days a week' },
  { key: 'extra',     value: 1.9,   label: 'Extra Active', hint: 'Physical job plus training' }
];
function activityByValue(v) {
  v = parseFloat(v);
  for (var i = 0; i < ACTIVITY.length; i++) if (Math.abs(ACTIVITY[i].value - v) < 0.001) return ACTIVITY[i];
  return ACTIVITY[1];
}

/* --------------------------------------------------------------- goals ---- */
/* Cuts scale with body size (percentage). Surpluses are absolute, matching
   The Muscle Chef chapter 4: maintenance plus 200 to 400 calories. */
var GOALS = [
  { key: 'cut_hard',  label: 'Hard Cut',    pct: -0.25, abs: 0,   hint: 'Fast fat loss. Hard to hold past 8 weeks.' },
  { key: 'cut',       label: 'Cut',         pct: -0.20, abs: 0,   hint: 'Standard fat loss. About 1 to 1.5 lbs a week.' },
  { key: 'cut_easy',  label: 'Easy Cut',    pct: -0.10, abs: 0,   hint: 'Slow leaning out while keeping strength.' },
  { key: 'maintain',  label: 'Maintain',    pct: 0,     abs: 0,   hint: 'Hold weight. Recomp territory.' },
  { key: 'lean_bulk', label: 'Lean Bulk',   pct: 0,     abs: 300, hint: 'Build with minimal fat gain. The book default.' },
  { key: 'bulk',      label: 'Bulk',        pct: 0,     abs: 500, hint: 'Faster gain. After 40 a good chunk of it is fat.' }
];
function goalByKey(k) {
  for (var i = 0; i < GOALS.length; i++) if (GOALS[i].key === k) return GOALS[i];
  return GOALS[3];
}

/* -------------------------------------------------------------- splits ---- */
var SPLITS = [
  { key: '35_35_30', label: 'Brotherhood Standard', p: 0.35, c: 0.35, f: 0.30,
    hint: 'Matches the book and the recipe library. Start here.' },
  { key: '40_40_20', label: 'High Protein Push',    p: 0.40, c: 0.40, f: 0.20,
    hint: 'Short cycles only. Fat sits on the hormone floor.' },
  { key: '30_35_35', label: 'Lower Carb',           p: 0.30, c: 0.35, f: 0.35,
    hint: 'For guys who run better on fewer carbs.' },
  { key: 'custom',   label: 'Custom',               p: 0.35, c: 0.35, f: 0.30,
    hint: 'Special cases. Guardrails still apply.' }
];
function splitByKey(k) {
  for (var i = 0; i < SPLITS.length; i++) if (SPLITS[i].key === k) return SPLITS[i];
  return SPLITS[0];
}

/* ---------------------------------------------------------------- bmr ----- */
function bmrMifflin(o) {
  var b = (10 * o.weightKg) + (6.25 * o.heightCm) - (5 * o.age);
  return o.sex === 'female' ? b - 161 : b + 5;
}
/* Harris-Benedict as revised by Roza & Shizgal, 1984 */
function bmrHarris(o) {
  return o.sex === 'female'
    ? 447.593 + (9.247 * o.weightKg) + (3.098 * o.heightCm) - (4.330 * o.age)
    : 88.362 + (13.397 * o.weightKg) + (4.799 * o.heightCm) - (5.677 * o.age);
}
/* Katch-McArdle, for when lean mass is actually known */
function bmrKatch(leanKg) { return 370 + (21.6 * leanKg); }

/* US Navy body fat method */
function navyBodyFat(o) {
  var bf;
  if (o.sex === 'female') {
    bf = 163.205 * Math.log(o.waistCm + o.hipsCm - o.neckCm) / Math.LN10
       -  97.684 * Math.log(o.heightCm) / Math.LN10 - 78.387;
  } else {
    bf =  86.010 * Math.log(o.waistCm - o.neckCm) / Math.LN10
       -  70.041 * Math.log(o.heightCm) / Math.LN10 + 36.76;
  }
  if (!isFinite(bf)) return null;
  return Math.max(3, Math.min(60, r1(bf)));
}

/* ------------------------------------------------------------ validate ---- */
function validateInput(input) {
  var errors = [];
  var age = parseFloat(input.age), w = parseFloat(input.weightLbs), h = parseFloat(input.heightIn);
  if (!(age >= 16 && age <= 100))  errors.push('Age has to be between 16 and 100.');
  if (!(w >= 80 && w <= 700))      errors.push('Weight has to be between 80 and 700 lbs.');
  if (!(h >= 48 && h <= 90))       errors.push('Height has to be between 4′0″ and 7′6″.');
  if (input.sex !== 'male' && input.sex !== 'female') errors.push('Pick male or female — the formulas need it.');
  return errors;
}

/* -------------------------------------------------------- macro targets ---- */
/* input: { sex, age, weightLbs, heightIn, activity, goal, splitKey,
            customSplit:{p,c,f}, leanMassLbs (optional) }                      */
function calcTargets(input) {
  var errors = validateInput(input);
  if (errors.length) return { ok: false, errors: errors };

  var age      = parseFloat(input.age),
      weightLbs= parseFloat(input.weightLbs),
      heightIn = parseFloat(input.heightIn),
      act      = activityByValue(input.activity),
      goal     = goalByKey(input.goal),
      base     = { sex: input.sex, age: age, weightKg: lbsToKg(weightLbs), heightCm: inToCm(heightIn) };

  var bmrM = bmrMifflin(base), bmrH = bmrHarris(base);
  var bmrAvg = (bmrM + bmrH) / 2;
  var tdeeM = bmrM * act.value, tdeeH = bmrH * act.value, tdeeAvg = bmrAvg * act.value;

  var katch = null;
  if (input.leanMassLbs > 0) {
    var bk = bmrKatch(lbsToKg(parseFloat(input.leanMassLbs)));
    katch = { bmr: r0(bk), tdee: r0(bk * act.value) };
  }

  var calories = tdeeAvg + (tdeeAvg * goal.pct) + goal.abs;

  var split = splitByKey(input.splitKey);
  if (split.key === 'custom' && input.customSplit) {
    var cs = input.customSplit, sum = (cs.p + cs.c + cs.f) || 1;
    split = { key: 'custom', label: 'Custom', hint: split.hint, p: cs.p / sum, c: cs.c / sum, f: cs.f / sum };
  }

  var protein = (calories * split.p) / 4,
      carbs   = (calories * split.c) / 4,
      fat     = (calories * split.f) / 9;

  var t = {
    ok: true,
    errors: [],
    input: { sex: input.sex, age: age, weightLbs: weightLbs, heightIn: heightIn,
             activity: act.value, activityLabel: act.label, goal: goal.key, goalLabel: goal.label },
    bmr:  { mifflin: r0(bmrM), harris: r0(bmrH), average: r0(bmrAvg) },
    tdee: { mifflin: r0(tdeeM), harris: r0(tdeeH), average: r0(tdeeAvg),
            spread: r0(Math.abs(tdeeM - tdeeH)) },
    katch: katch,
    split: { key: split.key, label: split.label,
             p: Math.round(split.p * 100), c: Math.round(split.c * 100), f: Math.round(split.f * 100) },
    calories: r0(calories),
    protein: r0(protein),
    carbs: r0(carbs),
    fat: r0(fat),
    perLb: { protein: r1(protein / weightLbs), carbs: r1(carbs / weightLbs), fat: r1(fat / weightLbs) },
    fatPctCalories: Math.round((fat * 9 / calories) * 100)
  };
  t.flags = guardrails(t);
  return t;
}

/* ----------------------------------------------------------- guardrails ---- */
/* Severity: 'stop' means the plan is a bad idea, 'warn' means know what you
   are doing, 'note' is information.                                          */
function guardrails(t) {
  var f = [], w = t.input.weightLbs;

  if (t.perLb.protein > 1.6)
    f.push({ level: 'warn', title: 'Protein above the useful range',
      body: 'That is ' + t.perLb.protein + ' g per lb. Past roughly 1.6 the extra protein is expensive urine. Drop the protein percentage and put the calories into carbs.' });
  if (t.perLb.protein < 0.7)
    f.push({ level: 'warn', title: 'Protein too low to hold muscle',
      body: 'That is ' + t.perLb.protein + ' g per lb. In a deficit after 40 you want 1.0 or better or you will lose lean mass along with the fat.' });

  if (t.fatPctCalories < 20)
    f.push({ level: 'stop', title: 'Fat under the hormone floor',
      body: 'Fat is ' + t.fatPctCalories + '% of calories. Chapter 2 says do not live under 20% — testosterone takes the hit. Run this a few weeks at most, not as a lifestyle.' });
  else if (t.perLb.fat < 0.3)
    f.push({ level: 'warn', title: 'Fat is lean for your bodyweight',
      body: 'That is ' + t.perLb.fat + ' g per lb. Fine short term, thin for months on end.' });

  if (t.calories < 1500)
    f.push({ level: 'stop', title: 'Calories too low',
      body: t.calories + ' calories a day is not a plan, it is a crash. Raise the floor or pick an easier goal.' });

  var deficit = t.tdee.average - t.calories;
  if (deficit > t.tdee.average * 0.22)
    f.push({ level: 'warn', title: 'Aggressive deficit',
      body: 'You are ' + r0(deficit) + ' calories under maintenance. Expect strength to slide if you hold it more than 8 weeks.' });

  if (t.carbs / w < 0.5 && t.input.activity >= 1.55)
    f.push({ level: 'note', title: 'Low carbs for your training load',
      body: 'Training 3-plus days a week on ' + t.carbs + 'g of carbs will show up in the last set. Put most of them around training.' });

  if (t.tdee.spread > 180)
    f.push({ level: 'note', title: 'Formulas disagree by ' + t.tdee.spread + ' calories',
      body: 'Harris-Benedict runs high on bigger and heavier men. The average is the starting point — two weeks of real weigh-ins beats both formulas.' });

  return f;
}

/* --------------------------------------------------------------- pantry ---- */
/* Modular adjustments used to close the gap between what the cookbook can do
   and what the target asks for. Macros are per unit.                         */
var PANTRY = [
  { key: 'whey',   label: 'whey isolate',        portion: 'scoop',          max: 3, calories: 120, protein: 25, carbs: 2,  fat: 1 },
  { key: 'eggw',   label: 'egg whites',          portion: '1/2 cup',        max: 4, calories: 63,  protein: 13, carbs: 1,  fat: 0 },
  { key: 'breast', label: 'chicken breast',      portion: '4 oz cooked',    max: 3, calories: 185, protein: 35, carbs: 0,  fat: 4 },
  { key: 'gyog',   label: 'nonfat Greek yogurt', portion: 'cup',            max: 2, calories: 130, protein: 23, carbs: 9,  fat: 0 },
  { key: 'rice',   label: 'jasmine rice',        portion: '1/2 cup cooked', max: 4, calories: 103, protein: 2,  carbs: 22, fat: 0 },
  { key: 'potato', label: 'sweet potato',        portion: '100 g',          max: 3, calories: 90,  protein: 2,  carbs: 21, fat: 0 },
  { key: 'oats',   label: 'rolled oats',         portion: '1/2 cup dry',    max: 2, calories: 150, protein: 5,  carbs: 27, fat: 3 },
  { key: 'banana', label: 'banana',              portion: 'medium',         max: 2, calories: 105, protein: 1,  carbs: 27, fat: 0 },
  { key: 'oil',    label: 'olive oil',           portion: 'tbsp',           max: 2, calories: 119, protein: 0,  carbs: 0,  fat: 14 },
  { key: 'almond', label: 'almonds',             portion: 'oz',             max: 2, calories: 164, protein: 6,  carbs: 6,  fat: 14 },

  /* Trims carry negative macros. They only surface when the day runs fat-heavy
     AND the day's recipes actually contain the thing being trimmed. */
  { key: 'no_oil', label: 'cooking oil', portion: 'tbsp', max: 2, trim: true,
    trimText: 'Cook with one less tbsp of oil or butter', requires: /oil|butter|ghee/i,
    calories: -119, protein: 0, carbs: 0, fat: -14 },
  { key: 'swap_breast', label: 'thigh for breast', portion: '', max: 1, trim: true,
    trimText: 'Swap the chicken thigh for breast', requires: /thigh/i,
    calories: -60, protein: 4, carbs: 0, fat: -8 },
  { key: 'swap_whites', label: 'eggs for whites', portion: '', max: 1, trim: true,
    trimText: 'Use whites for two of the whole eggs', requires: /\begg/i,
    calories: -100, protein: -1, carbs: 0, fat: -10 }
];

/* "Add 1 scoop whey isolate" / "Add 2 × 1/2 cup egg whites" */
function portionText(item, n) {
  if (item.trim) return item.trimText + (n > 1 ? ' (×' + n + ')' : '');
  var p = item.portion || '';
  if (!p) return 'Add ' + n + ' ' + item.label;
  if (/^[\d\/]/.test(p)) {
    return n === 1 ? 'Add ' + p + ' ' + item.label
                   : 'Add ' + n + ' × ' + p + ' ' + item.label;
  }
  var plural = n > 1 ? (p.slice(-1) === 's' ? p : p + 's') : p;
  return 'Add ' + n + ' ' + plural + ' ' + item.label;
}

/* Everything a day's recipes mention, used to gate the trim suggestions. */
function dayHaystack(day) {
  var parts = [];
  (day.meals || []).forEach(function (m) {
    var r = m.recipe || {};
    parts.push(r.name || '');
    (r.ingredients || []).forEach(function (i) { parts.push(i); });
  });
  return parts.join(' | ').toLowerCase();
}

/* --------------------------------------------------------------- scoring --- */
var DEFAULT_WEIGHTS = { calories: 1.5, protein: 2.0, carbs: 1.0, fat: 1.0 };

function emptyTotals() { return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }; }

function addInto(acc, r, mult) {
  acc.calories += (r.calories || 0) * mult;
  acc.protein  += (r.protein  || 0) * mult;
  acc.carbs    += (r.carbs    || 0) * mult;
  acc.fat      += (r.fat      || 0) * mult;
  acc.fiber    += (r.fiber    || 0) * mult;
  return acc;
}

/* Going over on calories costs more than coming under. A guy cutting who eats
   120 calories under target still loses fat; 120 over and he does not. */
var OVERSHOOT = 1.8;

function scoreTotals(tot, T, weights) {
  weights = weights || DEFAULT_WEIGHTS;
  var keys = ['calories', 'protein', 'carbs', 'fat'], s = 0;
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i], target = T[k] || 1, diff = tot[k] - target;
    var err = Math.abs(diff) / target;
    if (k === 'calories' && diff > 0) err *= OVERSHOOT;
    s += weights[k] * err;
  }
  return s;
}

/* --------------------------------------------------------- day assembly ---- */
var DEFAULT_MULTS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function slotsForMealCount(n) {
  if (n <= 3) return ['breakfast', 'lunch', 'dinner'];
  if (n === 4) return ['breakfast', 'lunch', 'dinner', 'snacks'];
  if (n === 5) return ['breakfast', 'lunch', 'dinner', 'snacks', 'snacks'];
  return ['breakfast', 'lunch', 'dinner', 'snacks', 'snacks', 'snacks'];
}

function poolFor(lib, type) {
  return lib.filter(function (r) {
    return r.meal_type === type && r.active !== false &&
           r.calories > 0 && r.protein != null && r.carbs != null && r.fat != null;
  });
}

/* A plan a man will actually cook beats one that is two grams closer. Nudge
   the solver toward normal portions: one serving is free, a double costs. */
var PORTION_WEIGHT = 0.03;
function portionCost(mults) {
  var c = 0;
  for (var i = 0; i < mults.length; i++) c += Math.abs(mults[i] - 1);
  return c * PORTION_WEIGHT;
}

/* Pick the multiplier for each slot by coordinate descent. Fast, and it scales
   when the library grows past a few dozen recipes.                           */
function fitMultipliers(picks, T, mults, weights) {
  var m = picks.map(function () { return 1; }), passes = 4;
  for (var p = 0; p < passes; p++) {
    var moved = false;
    for (var i = 0; i < picks.length; i++) {
      var bestVal = m[i], bestScore = Infinity;
      for (var j = 0; j < mults.length; j++) {
        m[i] = mults[j];
        var tot = emptyTotals();
        for (var k = 0; k < picks.length; k++) addInto(tot, picks[k], m[k]);
        var sc = scoreTotals(tot, T, weights) + portionCost(m);
        if (sc < bestScore - 1e-9) { bestScore = sc; bestVal = mults[j]; }
      }
      if (m[i] !== bestVal) moved = true;
      m[i] = bestVal;
    }
    if (!moved) break;
  }
  return m;
}

function shuffled(arr, rnd) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* buildDay(lib, T, opts) -> { meals, totals, score, gap, fit }
   opts: { mealCount, multipliers, weights, penalty (recipeId->cost),
           maxCandidates, seed, allowRepeat }                                 */
function buildDay(lib, T, opts) {
  opts = opts || {};
  var slots   = opts.slots || slotsForMealCount(opts.mealCount || 5),
      mults   = opts.multipliers || DEFAULT_MULTS,
      weights = opts.weights || DEFAULT_WEIGHTS,
      penalty = opts.penalty || {},
      maxCand = opts.maxCandidates || 4000,
      rnd     = mulberry32(opts.seed == null ? 1 : opts.seed);

  var pools = slots.map(function (s) { return poolFor(lib, s); });
  var missing = [];
  slots.forEach(function (s, i) { if (!pools[i].length && missing.indexOf(s) < 0) missing.push(s); });
  if (missing.length) return { error: 'No recipes in the library for: ' + missing.join(', ') + '.' };

  var total = pools.reduce(function (n, p) { return n * p.length; }, 1);
  var candidates = [];

  if (total <= maxCand) {
    (function walk(i, picked, usedIds) {
      if (i === pools.length) { candidates.push(picked.slice()); return; }
      for (var j = 0; j < pools[i].length; j++) {
        var r = pools[i][j];
        if (!opts.allowRepeat && usedIds[r.id]) continue;
        usedIds[r.id] = 1; picked.push(r);
        walk(i + 1, picked, usedIds);
        picked.pop(); delete usedIds[r.id];
      }
    })(0, [], {});
  } else {
    var seen = {};
    for (var n = 0; n < maxCand; n++) {
      var picked = [], usedIds = {}, ok = true;
      for (var i = 0; i < pools.length; i++) {
        var pool = shuffled(pools[i], rnd), got = null;
        for (var j = 0; j < pool.length; j++) {
          if (opts.allowRepeat || !usedIds[pool[j].id]) { got = pool[j]; break; }
        }
        if (!got) { ok = false; break; }
        usedIds[got.id] = 1; picked.push(got);
      }
      if (!ok) continue;
      var sig = picked.map(function (r) { return r.id; }).join('|');
      if (seen[sig]) continue;
      seen[sig] = 1;
      candidates.push(picked);
    }
  }
  if (!candidates.length) return { error: 'Not enough distinct recipes to fill ' + slots.length + ' meals.' };

  var best = null;
  for (var c = 0; c < candidates.length; c++) {
    var picks = candidates[c];
    var m = fitMultipliers(picks, T, mults, weights);
    var tot = emptyTotals();
    for (var k = 0; k < picks.length; k++) addInto(tot, picks[k], m[k]);
    var sc = scoreTotals(tot, T, weights) + portionCost(m);
    for (var k2 = 0; k2 < picks.length; k2++) sc += (penalty[picks[k2].id] || 0);
    if (!best || sc < best.score) best = { score: sc, picks: picks, mults: m, totals: tot };
  }

  var meals = best.picks.map(function (r, i) {
    var mult = best.mults[i];
    return {
      slot: slots[i],
      recipe: r,
      servings: mult,
      calories: r0(r.calories * mult),
      protein: r0(r.protein * mult),
      carbs: r0(r.carbs * mult),
      fat: r0(r.fat * mult),
      fiber: r0((r.fiber || 0) * mult)
    };
  });

  return {
    meals: meals,
    totals: roundTotals(best.totals),
    score: best.score,
    gap: gapOf(best.totals, T),
    adjustments: []
  };
}

function roundTotals(t) {
  return { calories: r0(t.calories), protein: r0(t.protein), carbs: r0(t.carbs),
           fat: r0(t.fat), fiber: r0(t.fiber) };
}

function gapOf(tot, T) {
  return {
    calories: r0(tot.calories - T.calories),
    protein: r0(tot.protein - T.protein),
    carbs: r0(tot.carbs - T.carbs),
    fat: r0(tot.fat - T.fat)
  };
}

/* Recalculate a day after the coach edits servings or swaps a recipe. */
function recomputeDay(day, T, opts) {
  var tot = emptyTotals();
  day.meals.forEach(function (m) {
    m.servings = Number(m.servings) || 0;
    m.calories = r0(m.recipe.calories * m.servings);
    m.protein  = r0(m.recipe.protein  * m.servings);
    m.carbs    = r0(m.recipe.carbs    * m.servings);
    m.fat      = r0(m.recipe.fat      * m.servings);
    m.fiber    = r0((m.recipe.fiber || 0) * m.servings);
    addInto(tot, m.recipe, m.servings);
  });
  day.totals = roundTotals(tot);
  day.gap = gapOf(tot, T);
  day.score = scoreTotals(tot, T, opts && opts.weights);
  day.adjustments = [];
  delete day.totalsAdjusted;
  delete day.gapAdjusted;
  closeGap(day, T, opts);
  return day;
}

/* Deep-enough copy to hand back to React as new state. */
function cloneDay(day) {
  var out = {};
  for (var k in day) if (day.hasOwnProperty(k)) out[k] = day[k];
  out.meals = day.meals.map(function (m) {
    var c = {}; for (var k2 in m) if (m.hasOwnProperty(k2)) c[k2] = m[k2]; return c;
  });
  out.adjustments = (day.adjustments || []).slice();
  return out;
}

/* ------------------------------------------------------- close the gap ----- */
/* Greedy: keep adding the single pantry item that most reduces the weighted
   error, stop when nothing helps or we hit the step cap.                      */
function closeGap(day, T, opts) {
  opts = opts || {};
  var weights = opts.weights || DEFAULT_WEIGHTS,
      maxSteps = opts.maxSteps == null ? 8 : opts.maxSteps,
      hay = dayHaystack(day),
      fatOver = (day.totals.fat - T.fat) > 8,
      pool = PANTRY.filter(function (p) {
        if (!p.trim) return true;
        if (!fatOver) return false;                   /* lean day, nothing to trim */
        return !p.requires || p.requires.test(hay);   /* and only what the day has */
      });

  var tot = { calories: day.totals.calories, protein: day.totals.protein,
              carbs: day.totals.carbs, fat: day.totals.fat, fiber: day.totals.fiber };
  var counts = {}, cur = scoreTotals(tot, T, weights);

  for (var step = 0; step < maxSteps; step++) {
    var bestItem = null, bestScore = cur, bestTot = null;
    for (var i = 0; i < pool.length; i++) {
      var p = pool[i];
      if ((counts[p.key] || 0) >= p.max) continue;
      var cand = { calories: tot.calories + p.calories, protein: tot.protein + p.protein,
                   carbs: tot.carbs + p.carbs, fat: tot.fat + p.fat, fiber: tot.fiber };
      if (cand.fat < T.fat * 0.75) continue;        /* never trim below the floor */
      if (cand.protein < 0 || cand.calories < 0) continue;
      var sc = scoreTotals(cand, T, weights);
      if (sc < bestScore - 1e-6) { bestScore = sc; bestItem = p; bestTot = cand; }
    }
    if (!bestItem) break;
    counts[bestItem.key] = (counts[bestItem.key] || 0) + 1;
    tot = bestTot; cur = bestScore;
  }

  var adjustments = [];
  for (var k = 0; k < PANTRY.length; k++) {
    var it = PANTRY[k], n = counts[it.key] || 0;
    if (!n) continue;
    adjustments.push({
      key: it.key, label: it.label, portion: it.portion, count: n, trim: !!it.trim,
      text: portionText(it, n),
      calories: it.calories * n, protein: it.protein * n, carbs: it.carbs * n, fat: it.fat * n
    });
  }

  day.adjustments = adjustments;
  day.totalsAdjusted = roundTotals(tot);
  day.gapAdjusted = gapOf(tot, T);
  day.scoreAdjusted = cur;
  return day;
}

/* ------------------------------------------------------------- the week ---- */
/* Variety by penalising recipes already used, heaviest on the day just gone. */
function buildWeek(lib, T, opts) {
  opts = opts || {};
  var days = opts.days || 7, out = [], used = {};
  for (var d = 0; d < days; d++) {
    var penalty = {};
    for (var id in used) if (used.hasOwnProperty(id)) penalty[id] = used[id];
    var day = buildDay(lib, T, {
      mealCount: opts.mealCount, multipliers: opts.multipliers, weights: opts.weights,
      penalty: penalty, seed: (opts.seed || 1) * 97 + d, maxCandidates: opts.maxCandidates
    });
    if (day.error) return { error: day.error };
    if (opts.closeGap !== false) closeGap(day, T, opts);
    day.dayIndex = d;
    out.push(day);
    for (var id2 in used) if (used.hasOwnProperty(id2)) used[id2] = used[id2] * 0.5;
    day.meals.forEach(function (m) { used[m.recipe.id] = (used[m.recipe.id] || 0) + 0.35; });
  }
  return { days: out };
}

/* ------------------------------------------------- single meal matching ---- */
/* "Find me meals that fit 45g protein, 500 cal" — used by the coach tab.      */
function findMeals(lib, want, opts) {
  opts = opts || {};
  var type = opts.mealType, mults = opts.multipliers || DEFAULT_MULTS,
      weights = opts.weights || DEFAULT_WEIGHTS, limit = opts.limit || 10;
  var pool = type ? poolFor(lib, type) : lib.filter(function (r) { return r.active !== false && r.calories > 0; });
  var rows = [];
  pool.forEach(function (r) {
    var bestM = 1, bestS = Infinity;
    mults.forEach(function (m) {
      var tot = addInto(emptyTotals(), r, m);
      var s = scoreTotals(tot, want, weights);
      if (s < bestS) { bestS = s; bestM = m; }
    });
    var t = addInto(emptyTotals(), r, bestM);
    rows.push({ recipe: r, servings: bestM, score: bestS, totals: roundTotals(t), gap: gapOf(t, want) });
  });
  rows.sort(function (a, b) { return a.score - b.score; });
  return rows.slice(0, limit);
}

/* --------------------------------------------------------- fit reporting --- */
function fitLabel(day, T) {
  var g = day.gapAdjusted || day.gap;
  var worst = 0, keys = ['calories', 'protein', 'carbs', 'fat'];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i], pct = Math.abs(g[k]) / (T[k] || 1);
    if (pct > worst) worst = pct;
  }
  if (worst <= 0.05) return { key: 'dialed',  label: 'Dialed in',   hint: 'Everything within 5% of target.' };
  if (worst <= 0.10) return { key: 'close',   label: 'Close enough', hint: 'Within 10%. Good enough to eat and adjust later.' };
  if (worst <= 0.20) return { key: 'loose',   label: 'Loose fit',   hint: 'One macro is off by more than 10%. Worth a manual tweak.' };
  return { key: 'poor', label: 'Poor fit', hint: 'The library cannot reach this target. Add recipes or move the split.' };
}

/* When the calorie target outruns the meal count, portions go double. Say so. */
function portionNote(day) {
  var big = 0, n = (day.meals || []).length;
  for (var i = 0; i < n; i++) if (day.meals[i].servings >= 1.75) big++;
  if (n && big >= Math.ceil(n / 2))
    return 'Most of these are double portions. Add a meal or a snack and the plates go back to normal size.';
  return null;
}

/* -------------------------------------------------------- meal clock ------- */
var SLOT_TIMES = { breakfast: '7am', lunch: '12pm', dinner: '6:30pm', snacks: '3pm' };
function slotTime(slot, nth) {
  if (slot === 'snacks') return ['10am', '3pm', '8pm'][nth] || '3pm';
  return SLOT_TIMES[slot] || '';
}

function isUuid(v) { return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v); }

/* Flatten a day into rows ready for the meal_plans table. */
function dayToPlanRows(day, userId, dayOfWeek) {
  var snackN = 0, rows = [];
  day.meals.forEach(function (m, i) {
    var nth = m.slot === 'snacks' ? snackN++ : 0;
    rows.push({
      user_id: userId,
      meal_time: slotTime(m.slot, nth),
      meal_name: m.recipe.name + (m.servings !== 1 ? ' (' + m.servings + ' servings)' : ''),
      protein: m.protein, carbs: m.carbs, fat: m.fat, calories: m.calories,
      recipe_id: isUuid(m.recipe.id) ? m.recipe.id : null,   /* built-in ids are not table rows */
      servings: m.servings,
      day_of_week: dayOfWeek == null ? null : dayOfWeek,
      sort_order: i,
      notes: null
    });
  });
  (day.adjustments || []).forEach(function (a, i) {
    rows.push({
      user_id: userId, meal_time: 'anytime',
      meal_name: a.text,
      protein: r0(a.protein), carbs: r0(a.carbs), fat: r0(a.fat), calories: r0(a.calories),
      recipe_id: null, servings: a.count,
      day_of_week: dayOfWeek == null ? null : dayOfWeek,
      sort_order: 100 + i, notes: 'coach adjustment'
    });
  });
  return rows;
}

/* ====================================================== recipe viewing ==== */
/* Turn 1.375 into "1 3/8". Finer steps for small amounts, coarser for big. */
function niceAmount(v) {
  if (!(v > 0)) return '0';
  var step = v < 1 ? 8 : v < 10 ? 4 : 2;
  var n = Math.max(1, Math.round(v * step)), whole = Math.floor(n / step), rem = n % step;
  if (!rem) return String(whole);
  var g = (function gcd(a, b) { return b ? gcd(b, a % b) : a; })(rem, step);
  var frac = (rem / g) + '/' + (step / g);
  return whole ? whole + ' ' + frac : frac;
}

/* Scale the leading quantity of an ingredient line. "1 1/2 cups rice" x 1.5
   becomes "2 1/4 cups rice". Lines with no leading amount ("Salt to taste")
   and things that only look like amounts ("90/10 ground beef") pass through. */
var QTY = '(\\d+\\s+\\d+\\/(?:2|3|4|8|16)(?!\\d)|\\d+\\/(?:2|3|4|8|16)(?!\\d)|\\d+(?:\\.\\d+)?)';
var QTY_LINE = new RegExp('^' + QTY + '(?:(\\s*(?:to|-|\\u2013)\\s*)' + QTY + ')?(?=\\s|$)');
function qtyValue(t) {
  var mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  var frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  return parseFloat(t);
}
function scaleIngredient(text, factor) {
  text = String(text || '');
  if (!(factor > 0) || Math.abs(factor - 1) < 0.001) return text;
  var m = text.match(QTY_LINE);
  if (!m) return text;
  if (/^\s*%/.test(text.slice(m[0].length))) return text;
  var top = qtyValue(m[3] || m[1]) * factor;
  var out = niceAmount(qtyValue(m[1]) * factor);
  if (m[3]) out += m[2] + niceAmount(qtyValue(m[3]) * factor);
  /* "2 cup" reads wrong. Fix the unit word when the amount crosses one. */
  var rest = text.slice(m[0].length);
  var um = rest.match(/^(\s+)(cups?|scoops?|slices?|cloves?|cans?|stalks?|pieces?|packets?|sprigs?)\b/i);
  if (um) {
    var word = um[2], plural = /s$/i.test(word);
    if (top > 1 && !plural) rest = um[1] + word + 's' + rest.slice(um[0].length);
    else if (top <= 1 && plural) rest = um[1] + word.slice(0, -1) + rest.slice(um[0].length);
  }
  return out + rest;
}

/* Match a meal_plans row back to its recipe: by id when the row has one,
   otherwise by name, ignoring the "(1.5 servings)" suffix on assigned rows. */
function recipeForPlanRow(lib, row) {
  var name = String(row.meal_name || ''), servings = Number(row.servings) || 0;
  var sm = name.match(/\s*\(([\d.]+)\s+servings?\)\s*$/i);
  if (sm) { name = name.slice(0, sm.index); if (!servings) servings = parseFloat(sm[1]); }
  if (!servings) servings = 1;
  var hit = null, i, key = name.trim().toLowerCase();
  if (row.recipe_id) for (i = 0; i < lib.length; i++) if (String(lib[i].id) === String(row.recipe_id)) { hit = lib[i]; break; }
  if (!hit) for (i = 0; i < lib.length; i++) if (String(lib[i].name || '').trim().toLowerCase() === key) { hit = lib[i]; break; }
  if (!hit || !(hit.ingredients && hit.ingredients.length)) return null;
  return { recipe: hit, servings: servings, factor: servings / (Number(hit.serves) || 1) };
}

/* ================================================= recipe text importer ==== */
/* Accepts the cookbook's own layout, one or many recipes in one paste.        */
var NUM = '([\\d,]+(?:\\.\\d+)?)';
function grabNum(block, labels) {
  for (var i = 0; i < labels.length; i++) {
    var re = new RegExp('(?:^|\\n)[ \\t]*' + labels[i] + '[ \\t:.]*[\\. ]*' + NUM + '[ \\t]*g?[ \\t]*(?:\\n|$)', 'i');
    var m = block.match(re);
    if (m) return parseFloat(m[1].replace(/,/g, ''));
  }
  return null;
}

/* Running heads, footers and page numbers that land mid-recipe when a list
   crosses a page break in a pasted book. */
var PAGE_FURNITURE = /^(www\.\S+(\s*\|\s*\d+)?$|THE LONG GAME\b|The Muscle Chef\s{2,}|\d{1,3}$|Nutrition values are estimated|moisture loss, trimmed)/i;

function grabList(block, startLabel, stopLabels) {
  var re = new RegExp('(?:^|\\n)[ \\t]*' + startLabel + '[ \\t]*:?[ \\t]*(?:\\n|$)', 'i');
  var m = block.match(re);
  if (!m) return [];
  var rest = block.slice(m.index + m[0].length);
  var cut = rest.length;
  stopLabels.forEach(function (s) {
    var mm = rest.match(new RegExp('(?:^|\\n)[ \\t]*' + s, 'i'));
    if (mm && mm.index < cut) cut = mm.index;
  });
  rest = rest.slice(0, cut);
  var out = [], sawMarker = false;
  rest.split('\n').forEach(function (raw) {
    var line = raw.trim();
    if (!line) return;
    if (PAGE_FURNITURE.test(line)) return;        /* page headers and footers */
    var bulleted = /^([•·\-\*]|\d+[\.\)])\s+/.test(line);
    line = line.replace(/^([•·\-\*]|\d+[\.\)])\s+/, '').trim();
    if (!line) return;
    /* In a bulleted or numbered list, an unmarked line is a wrapped continuation. */
    if (!bulleted && out.length && (sawMarker || /^[a-z(]/.test(line))) out[out.length - 1] += ' ' + line;
    else out.push(line);
    if (bulleted) sawMarker = true;
  });
  return out;
}

/* The Long Game layout: "Name PROTOCOL A | 40/40/20", then a macro strip
   (38g 52g 6g 414 ...) in Protein / Carbs / Fat / Calories order.            */
function parseProtocolFormat(text, defaults, warnings) {
  var lines = text.split('\n'), titles = [], section = null, i;
  var junk = /(TIP|NOTE|INGREDIENTS|INSTRUCTIONS|www\.|Prep\/Cook|^\d+[\.\)]|^[•·\-\*])/i;
  var sectionAt = [];
  for (i = 0; i < lines.length; i++) {
    var sm = lines[i].match(/Recipes:\s*(Breakfast|Lunch|Dinner|Snacks?)/i) ||
             lines[i].match(/^\s*(Breakfast|Lunch|Dinner|Snacks?)\s+Recipes\s*$/i);
    if (sm) section = sm[1].toLowerCase().replace(/^snack$/, 'snacks');
    sectionAt[i] = section;
    var ln = lines[i].trim();
    if (!/PROTOCOL/i.test(ln) || /PROTOCOL\s*[AB]\s*(RECIPES|SNACKS)/i.test(ln)) continue;
    var pm = ln.match(/^(.*?)\s*PROTOCOL\s*([AB])?\s*\|?\s*(\d+\/\d+\/\d+)?\s*$/i);
    if (!pm) continue;
    var name = pm[1].trim(), proto = pm[2], split = pm[3], bodyStart = i + 1;
    if (!proto) {                      /* "…Vegetables PROTOCOL" / "B | 35/35/30" */
      var nx = (lines[i + 1] || '').trim().match(/^([AB])\s*\|?\s*(\d+\/\d+\/\d+)?\s*$/i);
      if (!nx) continue;
      proto = nx[1]; split = nx[2]; bodyStart = i + 2;
    }
    var prev = (lines[i - 1] || '').trim();   /* a wrapped title has no blank line */
    if (prev && !junk.test(prev) && !/\.$/.test(prev) && !/PROTOCOL/i.test(prev)) name = (prev + ' ' + name).trim();
    if (!name) continue;
    titles.push({ line: i, bodyStart: bodyStart, name: name.replace(/\s+/g, ' '),
                  proto: proto.toUpperCase(), split: split, section: section });
  }
  var out = [];
  for (i = 0; i < titles.length; i++) {
    var t = titles[i];
    var end = i + 1 < titles.length ? titles[i + 1].line : lines.length;
    var block = lines.slice(t.bodyStart, end).join('\n');
    var gs = [], re = /(\d+(?:\.\d+)?)\s*g\b/g, m, lastEnd = 0;
    while (gs.length < 3 && (m = re.exec(block)) !== null) { gs.push(parseFloat(m[1])); lastEnd = re.lastIndex; }
    var cm = block.slice(lastEnd).match(/(?:^|\s)(\d{2,4})(?=\s|$)/);
    if (gs.length < 3 || !cm) { warnings.push('Skipped "' + t.name + '" — could not read its macro strip.'); continue; }
    var tipM = block.match(/COACH'?S TIP[ \t:]*([\s\S]*?)(?=\n[ \t]*\n|SODIUM NOTE|$)/i);
    var noteM = block.match(/SODIUM NOTE[ \t:]*([\s\S]*?)(?=\n[ \t]*\n|$)/i);
    var split = t.split || (t.proto === 'A' ? '40/40/20' : '35/35/30');
    out.push({
      name: t.name,
      meal_type: t.section || defaults.meal_type || 'dinner',
      source: defaults.source || null,
      serves: 1, serving_label: '1 serving', prep: null, cook: null, total_time: null,
      calories: parseFloat(cm[1]), protein: gs[0], carbs: gs[1], fat: gs[2], fiber: null,
      ingredients: grabList(block, 'INGREDIENTS', ['INSTRUCTIONS', "COACH'?S TIP", 'SODIUM NOTE']),
      instructions: grabList(block, 'INSTRUCTIONS', ["COACH'?S TIP", 'SODIUM NOTE']),
      tip: tipM ? tipM[1].replace(/\s+/g, ' ').trim() || null : null,
      note: noteM ? noteM[1].replace(/\s+/g, ' ').trim() || null : null,
      tags: ['protocol-' + t.proto.toLowerCase(), split],
      active: true
    });
  }
  return out;
}

function parseRecipes(text, defaults) {
  defaults = defaults || {};
  text = String(text || '').replace(/\r/g, '');
  if (/PROTOCOL\s*[AB]\s*\|/i.test(text)) {
    var w0 = [], got = parseProtocolFormat(text, defaults, w0);
    if (got.length) return { recipes: got, warnings: w0 };
  }
  var metaRe = /(?:^|\n)[ \t]*Prep:[ \t]*(.+?)[ \t]+Cook:[ \t]*(.+?)[ \t]+Total:[ \t]*(.+?)[ \t]+Serves:[ \t]*(\d+)[ \t]*(?:\n|$)/gi;

  var marks = [], m;
  while ((m = metaRe.exec(text)) !== null) {
    marks.push({ index: m.index, end: m.index + m[0].length,
                 prep: m[1].trim(), cook: m[2].trim(), total: m[3].trim(), serves: parseInt(m[4], 10) });
  }

  var out = [], warnings = [];

  if (!marks.length) {
    /* No Prep/Cook header. Treat the whole paste, or each --- block, as one recipe. */
    var chunks = text.split(/\n[ \t]*(?:---+|===+|\*\*\*+)[ \t]*\n/).filter(function (c) { return c.trim(); });
    chunks.forEach(function (chunk) {
      var rec = parseOne(chunk, null, defaults, warnings);
      if (rec) out.push(rec);
    });
    if (!out.length) warnings.push('Could not find any macros in that paste. Each recipe needs at least a name and Calories / Protein / Carbohydrates / Fat lines.');
    return { recipes: out, warnings: warnings };
  }

  for (var i = 0; i < marks.length; i++) {
    var mk = marks[i];
    var headStart = i === 0 ? 0 : marks[i - 1].end;
    var head = text.slice(headStart, mk.index).split('\n').filter(function (l) { return l.trim(); });
    var name = head.length ? head[head.length - 1].trim() : null;
    var bodyEnd = i + 1 < marks.length ? marks[i + 1].index : text.length;
    var block = text.slice(mk.end, bodyEnd);
    var rec = parseOne(block, { name: name, meta: mk }, defaults, warnings);
    if (rec) out.push(rec);
  }
  return { recipes: out, warnings: warnings };
}

function parseOne(block, header, defaults, warnings) {
  var name = header && header.name;
  if (!name) {
    var lines = block.split('\n').filter(function (l) { return l.trim(); });
    name = lines.length ? lines[0].trim() : null;
    if (name) block = block.slice(block.indexOf(name) + name.length);
  }
  if (!name) return null;
  name = name.replace(/^#+\s*/, '').replace(/\s*\(.*serves.*\)\s*$/i, '').trim();

  var cal  = grabNum(block, ['Calories', 'Cals', 'Energy']),
      pro  = grabNum(block, ['Protein']),
      carb = grabNum(block, ['Carbohydrates', 'Carbs', 'Carbohydrate', 'Total Carbohydrate']),
      fat  = grabNum(block, ['Fat', 'Total Fat', 'Fats']),
      fib  = grabNum(block, ['Fiber', 'Fibre', 'Dietary Fiber']);

  if (cal == null || pro == null || carb == null || fat == null) {
    warnings.push('Skipped "' + name + '" — missing ' +
      [['calories', cal], ['protein', pro], ['carbs', carb], ['fat', fat]]
        .filter(function (p) { return p[1] == null; })
        .map(function (p) { return p[0]; }).join(', ') + '.');
    return null;
  }

  var servingLabel = null;
  var sl = block.match(/Serving[ \t]*:?[ \t]*(.+?)[ \t]*(?:\n|$)/i);
  if (sl && !/per serving/i.test(sl[1])) servingLabel = sl[1].trim();
  var psl = block.match(/Nutrition Per Serving[ \t]+Serving:[ \t]*(.+?)[ \t]*(?:\n|$)/i);
  if (psl) servingLabel = psl[1].trim();

  var mealType = defaults.meal_type || null;
  var mt = block.match(/(?:^|\n)[ \t]*(?:Type|Meal|Category)[ \t]*:[ \t]*(breakfast|lunch|dinner|snacks?|dessert)[ \t]*(?:\n|$)/i);
  if (mt) mealType = mt[1].toLowerCase().replace(/^snack$/, 'snacks');
  if (!mealType) mealType = 'dinner';

  var serves = header && header.meta ? header.meta.serves : null;
  if (!serves) {
    var sv = block.match(/Serves[ \t]*:?[ \t]*(\d+)/i);
    serves = sv ? parseInt(sv[1], 10) : 1;
  }

  return {
    name: name,
    meal_type: mealType,
    source: defaults.source || null,
    serves: serves,
    serving_label: servingLabel,
    prep: header && header.meta ? header.meta.prep : null,
    cook: header && header.meta ? header.meta.cook : null,
    total_time: header && header.meta ? header.meta.total : null,
    calories: cal, protein: pro, carbs: carb, fat: fat, fiber: fib,
    ingredients: grabList(block, 'Ingredients', ['Instructions', 'Directions', 'Method', "Chef'?s Tip", 'Nutrition']),
    instructions: grabList(block, '(?:Instructions|Directions|Method)', ["Chef'?s Tip", 'Nutrition', 'Notes?']),
    tip: grabList(block, "Chef'?s Tip", ['Nutrition', 'Prep:']).join(' ') || null,
    note: null, tags: [],
    active: true
  };
}

/* Sanity check a parsed recipe: do the macros add up to the stated calories? */
function macroCheck(r) {
  var computed = (r.protein * 4) + (r.carbs * 4) + (r.fat * 9);
  var diff = computed - r.calories;
  var pct = r.calories ? Math.abs(diff) / r.calories : 1;
  return {
    computed: r0(computed), stated: r0(r.calories), diff: r0(diff),
    pct: Math.round(pct * 100),
    ok: pct <= 0.12,
    note: pct <= 0.12 ? null
      : 'Macros compute to ' + r0(computed) + ' cal but the recipe says ' + r0(r.calories) +
        '. Fiber and rounding explain a little, not ' + r0(Math.abs(diff)) + '.'
  };
}

/* ------------------------------------------------- loading the library ----- */
/* Reads the recipes table when it exists, otherwise hands back the recipes
   built into this file. Either way the caller gets a usable library.         */
function normalizeRow(row) {
  function list(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { var p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
    return [];
  }
  return {
    id: row.id, name: row.name, meal_type: row.meal_type, source: row.source,
    serves: Number(row.serves) || 1, serving_label: row.serving_label,
    prep: row.prep, cook: row.cook, total_time: row.total_time,
    calories: Number(row.calories), protein: Number(row.protein),
    carbs: Number(row.carbs), fat: Number(row.fat),
    fiber: row.fiber == null ? null : Number(row.fiber),
    ingredients: list(row.ingredients), instructions: list(row.instructions),
    tip: row.tip, note: row.note || null, tags: row.tags || [], active: row.active !== false
  };
}

function loadLibrary(sb, cb) {
  if (!sb) { cb(RECIPES, 'builtin', null); return; }
  var done = false;
  function finish(lib, src, note) { if (!done) { done = true; cb(lib, src, note || null); } }
  try {
    sb.from('recipes').select('*').eq('active', true).then(function (res) {
      if (res && res.error) return finish(RECIPES, 'builtin', res.error.message);
      if (!res || !res.data || !res.data.length) return finish(RECIPES, 'builtin', 'recipes table is empty');
      finish(res.data.map(normalizeRow), 'supabase', null);
    }, function (err) {
      finish(RECIPES, 'builtin', (err && err.message) || 'could not reach the recipes table');
    });
  } catch (e) {
    finish(RECIPES, 'builtin', e.message);
  }
  setTimeout(function () { finish(RECIPES, 'builtin', 'recipes table timed out'); }, 8000);
}

/* ====================================================== built-in library === */
var RECIPES = [
  {
    "id": "mc-01",
    "name": "Bison & Sweet Potato Breakfast Hash",
    "meal_type": "breakfast",
    "source": "The Muscle Chef",
    "serves": 2,
    "serving_label": "1/2 skillet",
    "prep": "10 min",
    "cook": "20 min",
    "total_time": "30 min",
    "calories": 565,
    "protein": 42,
    "carbs": 34,
    "fat": 26,
    "fiber": 5,
    "ingredients": [
      "12 oz ground bison (or 90/10 ground beef)",
      "2 cups diced sweet potato (about 1 medium)",
      "1/2 yellow onion, diced",
      "2 garlic cloves, minced",
      "4 large eggs",
      "1 tbsp olive oil",
      "1 tsp smoked paprika",
      "1/2 tsp kosher salt",
      "Fresh cracked pepper",
      "Chopped parsley, to finish"
    ],
    "instructions": [
      "Heat olive oil in a large cast-iron or non-stick skillet over medium-high.",
      "Add sweet potato in a single layer. Cook 6 to 8 minutes, stirring occasionally, until edges are crisp and centers tender.",
      "Push potato to the edges. Add onion to the center and cook 2 minutes. Add garlic and cook 30 seconds until fragrant.",
      "Add bison, paprika, salt, and pepper. Break up the meat and cook 5 to 7 minutes until browned. Stir everything together.",
      "Make four wells in the hash. Crack an egg into each. Cover the skillet and cook 3 to 4 minutes until whites are set and yolks still soft.",
      "Finish with parsley. Serve straight from the skillet."
    ],
    "tip": "Cube the sweet potato small (about 1/2 inch). Bigger chunks turn this from a quick breakfast into a long one.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-02",
    "name": "Cottage Cheese Power Bowl",
    "meal_type": "breakfast",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "1 bowl",
    "prep": "5 min",
    "cook": "0 min",
    "total_time": "5 min",
    "calories": 490,
    "protein": 36,
    "carbs": 44,
    "fat": 18,
    "fiber": 6,
    "ingredients": [
      "1 cup low-fat (2%) cottage cheese",
      "1/2 cup mixed berries (blueberries, raspberries)",
      "1/4 cup low-sugar granola",
      "1 tbsp hemp seeds",
      "1 tbsp almond butter",
      "1 tsp honey (optional)",
      "Pinch of cinnamon"
    ],
    "instructions": [
      "Spoon cottage cheese into a bowl.",
      "Top with berries, granola, and hemp seeds.",
      "Warm the almond butter for 10 seconds in the microwave, then drizzle over the top.",
      "Finish with honey if using and a pinch of cinnamon."
    ],
    "tip": "Hate cottage cheese texture? Blend it for 20 seconds. Becomes a high-protein yogurt situation.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-03",
    "name": "Steak & Eggs Skillet",
    "meal_type": "breakfast",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "1 plate",
    "prep": "5 min",
    "cook": "12 min",
    "total_time": "17 min",
    "calories": 485,
    "protein": 52,
    "carbs": 4,
    "fat": 28,
    "fiber": null,
    "ingredients": [
      "5 oz top sirloin or flat iron steak",
      "2 whole eggs",
      "2 egg whites",
      "1 cup baby spinach",
      "1 tsp avocado oil",
      "1/2 tsp kosher salt",
      "Fresh cracked pepper",
      "1/2 tsp garlic powder"
    ],
    "instructions": [
      "Pat steak dry. Season both sides with salt, pepper, and garlic powder.",
      "Heat avocado oil in a skillet over medium-high until shimmering.",
      "Sear steak 3 to 4 minutes per side for medium-rare. Pull and rest on a cutting board.",
      "Reduce heat to medium. Add spinach to the same pan and wilt 30 seconds.",
      "Whisk whole eggs and whites together. Pour into the pan with the spinach and scramble until just set.",
      "Slice the steak against the grain and plate alongside the eggs."
    ],
    "tip": "Let the steak rest at least 5 minutes before slicing. Cutting too early bleeds out the juice and the work you put in.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-04",
    "name": "Banana Oat Protein Pancakes",
    "meal_type": "breakfast",
    "source": "The Muscle Chef",
    "serves": 2,
    "serving_label": "About 4 pancakes",
    "prep": "5 min",
    "cook": "10 min",
    "total_time": "15 min",
    "calories": 470,
    "protein": 40,
    "carbs": 52,
    "fat": 9,
    "fiber": 6,
    "ingredients": [
      "1 cup rolled oats",
      "2 scoops (60g) vanilla whey protein",
      "4 egg whites",
      "2 ripe bananas, mashed",
      "1/2 cup unsweetened almond milk",
      "1 tsp baking powder",
      "1 tsp cinnamon",
      "1 tsp vanilla extract",
      "Cooking spray"
    ],
    "instructions": [
      "Blend oats in a blender until they look like coarse flour, about 20 seconds.",
      "Add whey, egg whites, bananas, almond milk, baking powder, cinnamon, and vanilla. Blend until smooth.",
      "Let the batter sit 5 minutes to thicken.",
      "Heat a non-stick skillet over medium and lightly coat with cooking spray.",
      "Pour 1/4 cup batter per pancake. Cook 2 to 3 minutes until bubbles form on top and edges look set.",
      "Flip and cook another 1 to 2 minutes. Repeat with remaining batter."
    ],
    "tip": "Resist the urge to flip early. Wait for the bubbles. Patience is the difference between pancakes and protein pucks.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-05",
    "name": "Smoked Salmon Scramble",
    "meal_type": "breakfast",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "1 plate",
    "prep": "3 min",
    "cook": "5 min",
    "total_time": "8 min",
    "calories": 430,
    "protein": 39,
    "carbs": 4,
    "fat": 28,
    "fiber": null,
    "ingredients": [
      "3 large eggs",
      "3 oz smoked salmon, torn into pieces",
      "1 cup baby spinach",
      "1 tbsp light cream cheese",
      "1 tsp butter",
      "1 tbsp fresh dill, chopped",
      "Fresh cracked black pepper"
    ],
    "instructions": [
      "Whisk eggs in a bowl with a pinch of pepper.",
      "Melt butter in a non-stick skillet over medium-low.",
      "Add spinach and wilt for 30 seconds.",
      "Pour in eggs. Stir gently with a spatula, pulling cooked curds toward the center.",
      "When eggs are about 80 percent set, fold in the salmon and dot with cream cheese.",
      "Pull off the heat. Top with fresh dill and serve immediately."
    ],
    "tip": "Low and slow is the move here. High heat turns scrambled eggs into rubber every time.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-06",
    "name": "Greek Yogurt Power Parfait",
    "meal_type": "breakfast",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "1 parfait",
    "prep": "5 min",
    "cook": "0 min",
    "total_time": "5 min",
    "calories": 440,
    "protein": 36,
    "carbs": 42,
    "fat": 16,
    "fiber": 5,
    "ingredients": [
      "1 cup 2% plain Greek yogurt",
      "1/2 cup mixed berries",
      "1/4 cup low-sugar granola",
      "2 tbsp chopped walnuts",
      "1 tsp honey",
      "Pinch of cinnamon"
    ],
    "instructions": [
      "Stir cinnamon and honey into the yogurt.",
      "Spoon half the yogurt into a glass or bowl.",
      "Add half the berries, granola, and walnuts.",
      "Repeat the layers. Eat immediately or seal and take with you."
    ],
    "tip": "Use plain Greek yogurt, not flavored. The fruit and honey already bring sweetness, and you save 10 to 15 grams of added sugar.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-07",
    "name": "Sheet-Pan Chicken Thighs & Rainbow Veg",
    "meal_type": "lunch",
    "source": "The Muscle Chef",
    "serves": 2,
    "serving_label": "1/2 pan",
    "prep": "10 min",
    "cook": "30 min",
    "total_time": "40 min",
    "calories": 565,
    "protein": 42,
    "carbs": 40,
    "fat": 26,
    "fiber": 7,
    "ingredients": [
      "12 oz boneless skinless chicken thighs",
      "2 cups sweet potato, cubed",
      "1 red bell pepper, sliced",
      "1 zucchini, sliced",
      "1/2 red onion, sliced",
      "2 tbsp olive oil",
      "2 tsp smoked paprika",
      "1 tsp garlic powder",
      "1 tsp dried oregano",
      "1 tsp kosher salt",
      "Fresh cracked pepper"
    ],
    "instructions": [
      "Preheat oven to 425F. Line a sheet pan with parchment.",
      "Toss sweet potato with 1 tbsp olive oil, half the seasonings, and spread on the pan.",
      "Roast sweet potato 10 minutes alone (it needs a head start).",
      "Toss chicken and remaining vegetables with the rest of the olive oil and seasonings.",
      "Add to the sheet pan with the sweet potato and roast 20 to 25 minutes more, until chicken hits 165F internal.",
      "Rest 5 minutes before serving."
    ],
    "tip": "Sweet potatoes take longer than chicken. Give them the head start and everything finishes together.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-08",
    "name": "Lean Ground Beef Burrito Bowl",
    "meal_type": "lunch",
    "source": "The Muscle Chef",
    "serves": 2,
    "serving_label": "1 bowl",
    "prep": "5 min",
    "cook": "15 min",
    "total_time": "20 min",
    "calories": 620,
    "protein": 42,
    "carbs": 60,
    "fat": 22,
    "fiber": 10,
    "ingredients": [
      "10 oz 93/7 lean ground beef",
      "1 1/2 cups cooked brown rice",
      "1 cup black beans, rinsed",
      "1/2 cup salsa",
      "1/2 avocado, sliced",
      "1 tbsp olive oil",
      "1 tbsp chili powder",
      "1 tsp cumin",
      "1/2 tsp garlic powder",
      "1/2 tsp kosher salt",
      "Fresh cilantro and lime, to finish"
    ],
    "instructions": [
      "Heat olive oil in a skillet over medium-high.",
      "Add ground beef. Break it up and cook 6 to 8 minutes until browned.",
      "Stir in chili powder, cumin, garlic powder, and salt. Cook 1 minute more.",
      "Build bowls: rice, beans, beef, salsa.",
      "Top with avocado, cilantro, and a squeeze of lime."
    ],
    "tip": "Cook a big batch of rice and beans on Sunday and this becomes a 5-minute lunch all week.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-09",
    "name": "Tuna White Bean Power Salad",
    "meal_type": "lunch",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "1 large salad",
    "prep": "10 min",
    "cook": "0 min",
    "total_time": "10 min",
    "calories": 395,
    "protein": 40,
    "carbs": 28,
    "fat": 14,
    "fiber": 8,
    "ingredients": [
      "1 can (5 oz) tuna in water, drained",
      "1/2 cup cannellini beans, rinsed",
      "2 cups mixed greens or arugula",
      "1/4 red onion, thin sliced",
      "1 tbsp olive oil",
      "Juice of half a lemon",
      "1 tbsp chopped parsley",
      "1/2 tsp kosher salt",
      "Fresh cracked pepper"
    ],
    "instructions": [
      "Whisk olive oil, lemon juice, salt, and pepper in the bottom of a large bowl.",
      "Add greens and toss to coat.",
      "Top with tuna, beans, red onion, and parsley.",
      "Eat as-is or stuff into a whole-grain pita."
    ],
    "tip": "Buy tuna packed in water, not oil. You control the fat, you save calories, you keep the macros clean.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-10",
    "name": "Turkey Meatball Lunch Box",
    "meal_type": "lunch",
    "source": "The Muscle Chef",
    "serves": 4,
    "serving_label": "1 box (4 meatballs)",
    "prep": "10 min",
    "cook": "20 min",
    "total_time": "30 min",
    "calories": 545,
    "protein": 44,
    "carbs": 46,
    "fat": 18,
    "fiber": 5,
    "ingredients": [
      "1.25 lb 93/7 ground turkey",
      "1 large egg",
      "1/3 cup almond flour or whole-wheat breadcrumbs",
      "2 garlic cloves, minced",
      "2 tbsp grated parmesan",
      "1 tbsp Italian seasoning",
      "1 tsp kosher salt",
      "3 cups cooked quinoa",
      "1 1/3 cups marinara sauce",
      "Extra parmesan, to finish"
    ],
    "instructions": [
      "Preheat oven to 400F. Line a sheet pan with parchment.",
      "Combine turkey, egg, almond flour, garlic, parmesan, Italian seasoning, and salt in a bowl. Mix gently with hands; don't overwork.",
      "Roll into 16 meatballs, about 1.5 inches each. Place on the sheet pan.",
      "Bake 18 to 20 minutes until internal temp hits 165F.",
      "Warm marinara in a small pot.",
      "Build 4 lunch boxes: quinoa on one side, 4 meatballs on the other, marinara spooned over the top. Finish with parmesan."
    ],
    "tip": "Don't pack everything together hot. Cool the meatballs for 10 minutes before sealing the containers or you'll steam the quinoa into mush.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-11",
    "name": "Grilled Chicken Caesar Wrap",
    "meal_type": "lunch",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "1 wrap",
    "prep": "10 min",
    "cook": "10 min",
    "total_time": "20 min",
    "calories": 510,
    "protein": 45,
    "carbs": 38,
    "fat": 20,
    "fiber": 6,
    "ingredients": [
      "5 oz boneless skinless chicken breast",
      "1 large whole-wheat wrap (10 inch)",
      "1 1/2 cups chopped romaine",
      "2 tbsp light Caesar dressing",
      "2 tbsp grated parmesan",
      "1 tsp olive oil",
      "1/2 tsp garlic powder",
      "1/2 tsp Italian seasoning",
      "Salt and pepper"
    ],
    "instructions": [
      "Pound chicken breast to even thickness with the bottom of a heavy pan.",
      "Season both sides with garlic powder, Italian seasoning, salt, and pepper.",
      "Heat olive oil in a skillet over medium-high. Cook chicken 4 to 5 minutes per side until 165F internal.",
      "Rest 5 minutes, then slice thin.",
      "Toss romaine with Caesar dressing and parmesan.",
      "Warm the wrap for 15 seconds. Layer salad and chicken down the center. Fold sides in, roll tight, slice in half."
    ],
    "tip": "Warm the wrap before rolling. Cold tortillas crack; warm ones fold like a dream.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-12",
    "name": "Venison Chili Bowl",
    "meal_type": "lunch",
    "source": "The Muscle Chef",
    "serves": 4,
    "serving_label": "About 1 1/2 cups",
    "prep": "10 min",
    "cook": "30 min",
    "total_time": "40 min",
    "calories": 445,
    "protein": 44,
    "carbs": 38,
    "fat": 11,
    "fiber": 11,
    "ingredients": [
      "1.25 lb ground venison (or 90/10 ground beef)",
      "1 yellow onion, diced",
      "3 garlic cloves, minced",
      "1 can (15 oz) kidney beans, rinsed",
      "1 can (15 oz) black beans, rinsed",
      "1 can (28 oz) diced tomatoes",
      "1 cup beef broth",
      "2 tbsp tomato paste",
      "2 tbsp chili powder",
      "1 tbsp cumin",
      "1 tsp smoked paprika",
      "1 tsp kosher salt",
      "1 tbsp olive oil"
    ],
    "instructions": [
      "Heat olive oil in a Dutch oven over medium-high.",
      "Add onion and cook 4 minutes until soft. Add garlic and cook 30 seconds.",
      "Add venison. Break it up and brown 6 to 8 minutes.",
      "Stir in tomato paste and spices and cook 1 minute to bloom the flavor.",
      "Pour in tomatoes, broth, and beans. Bring to a simmer.",
      "Reduce heat to low, cover, and simmer 20 minutes. Taste and adjust salt."
    ],
    "tip": "Venison is lean, so it cooks fast and dries out faster. Don't oversear; brown and move on.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-13",
    "name": "Garlic Butter Sirloin with Jasmine Rice & Asparagus",
    "meal_type": "dinner",
    "source": "The Muscle Chef",
    "serves": 2,
    "serving_label": "1 plate",
    "prep": "10 min",
    "cook": "20 min",
    "total_time": "30 min",
    "calories": 595,
    "protein": 45,
    "carbs": 42,
    "fat": 24,
    "fiber": 4,
    "ingredients": [
      "12 oz top sirloin (2 steaks, about 6 oz each)",
      "1 1/2 cups cooked jasmine rice",
      "1 bunch asparagus, woody ends snapped off",
      "2 tbsp butter",
      "3 garlic cloves, smashed",
      "1 tsp olive oil",
      "1 tbsp fresh parsley, chopped",
      "1 tsp kosher salt",
      "Fresh cracked pepper"
    ],
    "instructions": [
      "Pat steaks dry. Season generously with salt and pepper. Let sit at room temp 15 minutes.",
      "Toss asparagus with olive oil, salt, and pepper. Roast at 425F for 10 to 12 minutes.",
      "Heat a cast-iron skillet over high until smoking.",
      "Sear steaks 3 to 4 minutes per side for medium-rare. Add butter and garlic in the last minute, basting steak with foamy butter.",
      "Pull steaks to a cutting board to rest 5 minutes.",
      "Plate rice, asparagus, and sliced steak. Spoon garlic butter from the pan over the top. Finish with parsley."
    ],
    "tip": "Let the steaks come to room temp before they hit the pan. Cold steak in a hot pan gives you gray meat, not crust.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-14",
    "name": "Sheet-Pan Salmon, Sweet Potato & Broccoli",
    "meal_type": "dinner",
    "source": "The Muscle Chef",
    "serves": 2,
    "serving_label": "1 plate",
    "prep": "10 min",
    "cook": "20 min",
    "total_time": "30 min",
    "calories": 615,
    "protein": 42,
    "carbs": 38,
    "fat": 28,
    "fiber": 8,
    "ingredients": [
      "12 oz salmon fillet (2 portions, about 6 oz each)",
      "2 cups sweet potato, cubed",
      "3 cups broccoli florets",
      "2 tbsp olive oil",
      "1 lemon (zest + juice)",
      "2 tsp dried dill",
      "1 tsp garlic powder",
      "1 tsp kosher salt",
      "Fresh cracked pepper"
    ],
    "instructions": [
      "Preheat oven to 425F. Line a sheet pan with parchment.",
      "Toss sweet potato with 1 tbsp olive oil, half the salt and pepper. Spread on the pan and roast 12 minutes.",
      "Toss broccoli with remaining olive oil, salt, and pepper.",
      "Pat salmon dry. Rub with garlic powder, dill, lemon zest, salt, and pepper.",
      "Pull the pan out. Push sweet potato to one side. Add salmon and broccoli to the pan.",
      "Roast 12 to 14 more minutes until salmon flakes and broccoli edges are crisp.",
      "Squeeze lemon juice over everything before serving."
    ],
    "tip": "Don't overcook the salmon. Pull it at 125F internal for medium; it'll keep cooking on the pan.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-15",
    "name": "Bison Burger with Avocado Smash (No Bun)",
    "meal_type": "dinner",
    "source": "The Muscle Chef",
    "serves": 2,
    "serving_label": "1 burger + potatoes",
    "prep": "10 min",
    "cook": "10 min",
    "total_time": "20 min",
    "calories": 625,
    "protein": 42,
    "carbs": 38,
    "fat": 32,
    "fiber": 8,
    "ingredients": [
      "12 oz ground bison",
      "1 ripe avocado",
      "Juice of 1/2 lime",
      "4 large butter lettuce leaves",
      "2 thick tomato slices",
      "2 cups baby potatoes, halved",
      "1 tbsp olive oil",
      "1 tsp garlic powder",
      "1 tsp smoked paprika",
      "1 tsp kosher salt",
      "Fresh cracked pepper"
    ],
    "instructions": [
      "Preheat oven to 425F. Toss potatoes with olive oil, paprika, half the salt and pepper. Roast 20 to 22 minutes, flipping halfway, until crisp.",
      "Form bison into 2 patties. Season both sides with garlic powder, remaining salt and pepper.",
      "Heat a cast-iron skillet over medium-high. Cook patties 3 to 4 minutes per side for medium.",
      "Mash avocado with lime juice and a pinch of salt.",
      "Build: lettuce leaf, tomato slice, patty, avocado smash, second lettuce leaf on top.",
      "Serve with roasted potatoes on the side."
    ],
    "tip": "Bison cooks faster than beef because it's leaner. Aim for medium, not well-done; otherwise you're chewing your money.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-16",
    "name": "Chicken Thigh Stir-Fry with Jasmine Rice",
    "meal_type": "dinner",
    "source": "The Muscle Chef",
    "serves": 2,
    "serving_label": "1 plate",
    "prep": "15 min",
    "cook": "15 min",
    "total_time": "30 min",
    "calories": 580,
    "protein": 42,
    "carbs": 55,
    "fat": 18,
    "fiber": 5,
    "ingredients": [
      "12 oz boneless skinless chicken thighs, sliced thin",
      "1 1/2 cups cooked jasmine rice",
      "1 cup broccoli florets",
      "1 red bell pepper, sliced",
      "1 cup snap peas",
      "3 tbsp low-sodium soy sauce",
      "1 tbsp rice vinegar",
      "1 tbsp honey",
      "2 tsp toasted sesame oil",
      "1 tbsp avocado oil",
      "3 garlic cloves, minced",
      "1 tbsp fresh ginger, grated",
      "Sesame seeds and sliced scallions, to finish"
    ],
    "instructions": [
      "Whisk soy sauce, rice vinegar, honey, and sesame oil in a small bowl.",
      "Heat avocado oil in a large skillet or wok over high heat.",
      "Add chicken in a single layer. Sear 2 to 3 minutes without stirring. Flip and cook another 2 minutes.",
      "Push chicken to the edge. Add garlic and ginger to the center for 30 seconds.",
      "Add broccoli, bell pepper, and snap peas. Stir-fry 3 to 4 minutes.",
      "Pour sauce over everything. Toss to coat. Cook 1 more minute until glossy.",
      "Serve over rice. Top with sesame seeds and scallions."
    ],
    "tip": "High heat is non-negotiable. Stir-fry on medium turns into chicken soup; on high you get char and texture.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-17",
    "name": "Pan-Seared Pork Tenderloin with Apples & Brussels",
    "meal_type": "dinner",
    "source": "The Muscle Chef",
    "serves": 4,
    "serving_label": "1 plate",
    "prep": "10 min",
    "cook": "25 min",
    "total_time": "35 min",
    "calories": 445,
    "protein": 40,
    "carbs": 28,
    "fat": 16,
    "fiber": 6,
    "ingredients": [
      "1.25 lb pork tenderloin",
      "1 honeycrisp apple, sliced",
      "4 cups brussels sprouts, halved",
      "2 tbsp olive oil, divided",
      "1 tbsp Dijon mustard",
      "1 tbsp maple syrup",
      "1 tsp dried thyme",
      "1 tsp kosher salt",
      "Fresh cracked pepper"
    ],
    "instructions": [
      "Preheat oven to 400F.",
      "Toss brussels with 1 tbsp olive oil, salt, and pepper. Spread on a sheet pan and roast 15 minutes.",
      "Pat tenderloin dry. Season with thyme, salt, and pepper.",
      "Heat remaining olive oil in an oven-safe skillet over medium-high. Sear tenderloin on all sides, about 6 to 8 minutes total.",
      "Whisk Dijon and maple syrup. Brush over the tenderloin.",
      "Add apple slices to the skillet around the pork. Transfer skillet to the oven and roast 10 to 12 minutes until pork hits 145F internal.",
      "Rest pork 5 minutes. Slice and serve with apples and roasted brussels."
    ],
    "tip": "Pull pork tenderloin at 145F. It's not chicken; it's safe and stays juicy. Cook it to 160 and you've wasted a perfectly good cut.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-18",
    "name": "Slow-Cooker Beef Short Rib Tacos",
    "meal_type": "dinner",
    "source": "The Muscle Chef",
    "serves": 6,
    "serving_label": "3 tacos",
    "prep": "15 min",
    "cook": "6 hr",
    "total_time": "6 hr 15 min",
    "calories": 610,
    "protein": 41,
    "carbs": 40,
    "fat": 28,
    "fiber": 6,
    "ingredients": [
      "3 lb boneless beef short ribs (trimmed of excess fat)",
      "1 onion, sliced",
      "4 garlic cloves, smashed",
      "2 tbsp tomato paste",
      "1 cup beef broth",
      "2 tbsp chili powder",
      "1 tbsp cumin",
      "1 tbsp smoked paprika",
      "1 tsp kosher salt",
      "Juice of 2 limes",
      "18 corn tortillas",
      "3 cups cabbage slaw mix",
      "1/3 cup light Mexican crema or thinned Greek yogurt",
      "Fresh cilantro, to finish"
    ],
    "instructions": [
      "Season short ribs with chili powder, cumin, paprika, and salt.",
      "Layer onion and garlic in the slow cooker. Top with short ribs. Add tomato paste and broth.",
      "Cook on low 6 hours until meat shreds easily with a fork.",
      "Transfer ribs to a board. Skim and discard the fat from the cooking liquid.",
      "Shred meat with two forks. Return to the pot with a few spoonfuls of skimmed cooking liquid and lime juice.",
      "Warm tortillas. Build tacos: 3 tortillas per plate, shredded beef, slaw, drizzle of crema, cilantro."
    ],
    "tip": "Trim the fat cap before slow-cooking and skim again after. Short ribs get rich; you don't need every gram of fat that came off the cow.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-19",
    "name": "Greek Yogurt with Almond Butter & Honey",
    "meal_type": "snacks",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "1 bowl",
    "prep": "2 min",
    "cook": "0 min",
    "total_time": "2 min",
    "calories": 250,
    "protein": 22,
    "carbs": 16,
    "fat": 11,
    "fiber": null,
    "ingredients": [
      "3/4 cup 2% plain Greek yogurt",
      "1 tbsp almond butter",
      "1 tsp honey",
      "Pinch of cinnamon"
    ],
    "instructions": [
      "Spoon yogurt into a bowl.",
      "Drizzle almond butter and honey on top.",
      "Dust with cinnamon. Eat."
    ],
    "tip": "Warm the almond butter for 8 seconds in the microwave. Drizzles like syrup, looks like you tried.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-20",
    "name": "Hard-Boiled Eggs & Beef Jerky Plate",
    "meal_type": "snacks",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "1 plate",
    "prep": "0 min",
    "cook": "0 min",
    "total_time": "0 min",
    "calories": 370,
    "protein": 32,
    "carbs": 8,
    "fat": 23,
    "fiber": 3,
    "ingredients": [
      "2 hard-boiled eggs, peeled",
      "1 oz lean beef jerky",
      "1/4 cup raw almonds",
      "A few dill pickle spears",
      "Pinch of sea salt"
    ],
    "instructions": [
      "Boil a dozen eggs at the start of the week and keep them in the fridge.",
      "Plate eggs, jerky, almonds, and pickles.",
      "Salt and pepper the eggs. Eat."
    ],
    "tip": "Boil a dozen eggs on Sunday. Salt-and-pepper shaker in a small zip bag and you've got grab-and-go protein for five days.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-21",
    "name": "Cottage Cheese & Pineapple Cup",
    "meal_type": "snacks",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "1 cup",
    "prep": "2 min",
    "cook": "0 min",
    "total_time": "2 min",
    "calories": 215,
    "protein": 22,
    "carbs": 18,
    "fat": 6,
    "fiber": null,
    "ingredients": [
      "3/4 cup low-fat cottage cheese",
      "1/2 cup pineapple chunks (fresh or canned in juice)",
      "1 tbsp slivered almonds",
      "Pinch of sea salt"
    ],
    "instructions": [
      "Spoon cottage cheese into a jar or small bowl.",
      "Top with pineapple and almonds.",
      "Pinch of salt to wake up the flavor. Done."
    ],
    "tip": "Buy pineapple canned in juice, not syrup. You keep the sweetness and dodge the extra sugar.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-22",
    "name": "Chocolate Peanut Butter Banana Protein Shake",
    "meal_type": "snacks",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "1 shake (about 16 oz)",
    "prep": "3 min",
    "cook": "0 min",
    "total_time": "3 min",
    "calories": 330,
    "protein": 30,
    "carbs": 22,
    "fat": 13,
    "fiber": 4,
    "ingredients": [
      "1 scoop (30g) chocolate whey protein",
      "1 tbsp natural peanut butter",
      "1/2 ripe banana",
      "1 cup unsweetened almond milk",
      "1/2 cup ice",
      "1 tsp cocoa powder (optional, for extra chocolate)"
    ],
    "instructions": [
      "Add everything to the blender.",
      "Blend on high 30 to 45 seconds until smooth.",
      "Pour and drink within 10 minutes for best texture."
    ],
    "tip": "Freeze ripe bananas in chunks. Frozen banana plus skipping the ice gives you a thicker, creamier shake without watering it down.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-23",
    "name": "Turkey & Provolone Roll-Ups with Cucumber",
    "meal_type": "snacks",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "4 roll-ups",
    "prep": "5 min",
    "cook": "0 min",
    "total_time": "5 min",
    "calories": 285,
    "protein": 30,
    "carbs": 4,
    "fat": 16,
    "fiber": null,
    "ingredients": [
      "4 slices deli turkey breast (about 4 oz)",
      "2 slices provolone cheese",
      "1/2 cucumber, cut into spears",
      "1 tbsp Dijon mustard",
      "Fresh cracked pepper"
    ],
    "instructions": [
      "Lay turkey slices flat on a cutting board.",
      "Spread mustard thinly over each slice.",
      "Top with half a slice of cheese and a cucumber spear.",
      "Roll up tight. Crack pepper on top. Eat."
    ],
    "tip": "Look for deli turkey with under 5 ingredients on the label. If it reads like a chemistry book, find a better brand.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "mc-24",
    "name": "Tuna & Hummus Cracker Plate",
    "meal_type": "snacks",
    "source": "The Muscle Chef",
    "serves": 1,
    "serving_label": "1 plate",
    "prep": "3 min",
    "cook": "0 min",
    "total_time": "3 min",
    "calories": 320,
    "protein": 28,
    "carbs": 28,
    "fat": 10,
    "fiber": 6,
    "ingredients": [
      "1 packet (3 oz) tuna (in water)",
      "1/3 cup hummus",
      "6 whole-grain crackers",
      "1 cup baby carrots",
      "Fresh cracked pepper",
      "Squeeze of lemon (optional)"
    ],
    "instructions": [
      "Plate the hummus with a swoosh in a shallow bowl.",
      "Top with tuna and crack pepper over it.",
      "Arrange crackers and carrots around the bowl.",
      "Squeeze lemon over the tuna if you've got it."
    ],
    "tip": "The single-serve tuna packets are worth the extra cents. No can opener, no drained mess at your desk.",
    "note": null,
    "tags": [],
    "active": true
  },
  {
    "id": "lg-01",
    "name": "Turkey and Egg White Scramble",
    "meal_type": "breakfast",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "5 / 10 min",
    "cook": null,
    "total_time": "5 / 10 min",
    "calories": 414,
    "protein": 38,
    "carbs": 52,
    "fat": 6,
    "fiber": null,
    "ingredients": [
      "6 oz ground turkey (93% lean)",
      "6 large egg whites",
      "1/2 cup cooked white rice (from batch prep)",
      "1/2 cup diced bell peppers and onion",
      "1 cup fresh spinach",
      "1/2 tsp garlic powder",
      "1/2 tsp smoked paprika",
      "Salt and black pepper to taste",
      "Cooking spray"
    ],
    "instructions": [
      "Heat a nonstick skillet over medium-high heat and coat with cooking spray.",
      "Add ground turkey and cook, breaking it up, until no pink remains, about 5 minutes. Season with garlic powder, paprika, salt, and pepper.",
      "Add bell peppers and onion to the pan and cook 2 minutes until slightly softened.",
      "Add spinach and stir until wilted, about 1 minute.",
      "Pour egg whites over the turkey and vegetable mixture. Stir gently and cook until egg whites are just set, about 2 minutes.",
      "Serve alongside the reheated white rice."
    ],
    "tip": "Batch cook the turkey on Sunday and reheat in the skillet in the morning. Add the egg whites fresh. Cuts active morning time to under 5 minutes.",
    "note": null,
    "tags": [
      "protocol-a",
      "40/40/20",
      "one-pan"
    ],
    "active": true
  },
  {
    "id": "lg-02",
    "name": "High-Protein Oatmeal Bowl",
    "meal_type": "breakfast",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "2 / 5 min",
    "cook": null,
    "total_time": "2 / 5 min",
    "calories": 345,
    "protein": 35,
    "carbs": 40,
    "fat": 5,
    "fiber": null,
    "ingredients": [
      "1/2 cup dry old-fashioned oats",
      "1 scoop vanilla whey protein isolate (25g protein)",
      "1 cup water or unsweetened almond milk",
      "1/2 cup blueberries (fresh or frozen)",
      "1 tbsp sugar-free maple syrup",
      "1/4 tsp cinnamon",
      "Pinch of salt"
    ],
    "instructions": [
      "Cook oats in water or almond milk on the stovetop over medium heat, stirring occasionally, until thickened, about 4 to 5 minutes.",
      "Remove from heat. Let cool for 60 seconds so the protein does not clump from excessive heat.",
      "Stir in the whey protein powder, cinnamon, and salt until fully incorporated.",
      "Top with blueberries and drizzle with sugar-free maple syrup.",
      "Eat immediately. This does not hold well once the protein is stirred in."
    ],
    "tip": "Microwave version: combine oats and liquid in a large bowl, microwave 2.5 minutes, stir, let cool slightly, then add protein. Same result, less cleanup.",
    "note": null,
    "tags": [
      "protocol-a",
      "40/40/20",
      "stovetop"
    ],
    "active": true
  },
  {
    "id": "lg-03",
    "name": "Grilled Chicken Breakfast Bowl",
    "meal_type": "breakfast",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "5 / 0 min",
    "cook": null,
    "total_time": "5 / 0 min",
    "calories": 403,
    "protein": 40,
    "carbs": 45,
    "fat": 7,
    "fiber": null,
    "ingredients": [
      "5 oz grilled chicken breast (from batch prep), sliced or shredded",
      "1/2 cup cooked sweet potato, cubed",
      "1 cup baby spinach or arugula",
      "1/4 cup salsa (fresh or jarred, no added sugar)",
      "1/4 cup black beans, rinsed and drained",
      "1/2 tsp cumin",
      "Salt and pepper to taste",
      "Hot sauce to taste"
    ],
    "instructions": [
      "If chicken and sweet potato are from batch prep, reheat them in the microwave for 90 seconds.",
      "Layer spinach in the bottom of a wide bowl.",
      "Add warm chicken, sweet potato, and black beans over the spinach.",
      "Top with salsa, a pinch of cumin, and as much hot sauce as you can handle.",
      "Season with salt and pepper. Eat."
    ],
    "tip": "This takes 5 minutes if you prepped the chicken and sweet potato on Sunday. It is one of the most complete Protocol A breakfasts in the book and looks like real food, not a punishment.",
    "note": null,
    "tags": [
      "protocol-a",
      "40/40/20",
      "batch prep / assemble"
    ],
    "active": true
  },
  {
    "id": "lg-04",
    "name": "Greek Yogurt Protein Parfait",
    "meal_type": "breakfast",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "3 / 0 min",
    "cook": null,
    "total_time": "3 / 0 min",
    "calories": 389,
    "protein": 36,
    "carbs": 50,
    "fat": 5,
    "fiber": null,
    "ingredients": [
      "1.5 cups plain nonfat Greek yogurt",
      "1/2 scoop vanilla whey protein isolate (12-13g protein)",
      "1/2 cup sliced strawberries",
      "1/2 cup blueberries",
      "1/4 cup dry old-fashioned oats (uncooked, stirred in)",
      "1 tsp honey",
      "1/4 tsp vanilla extract"
    ],
    "instructions": [
      "Stir the whey protein powder into the Greek yogurt until smooth. Add vanilla extract and mix well.",
      "Stir in the dry oats. They will soften slightly after a few minutes and add texture without cooking.",
      "Layer or top with strawberries and blueberries.",
      "Drizzle with honey. Serve immediately or refrigerate overnight for a ready-to-eat morning meal."
    ],
    "tip": "This is the fastest breakfast in the Protocol A section. Make it the night before, cover it, and it is ready when you wake up. The oats overnight gives you a texture closer to overnight oats than raw grain.",
    "note": null,
    "tags": [
      "protocol-a",
      "40/40/20",
      "no cook"
    ],
    "active": true
  },
  {
    "id": "lg-05",
    "name": "Salmon and Scrambled Eggs",
    "meal_type": "breakfast",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "5 / 8 min",
    "cook": null,
    "total_time": "5 / 8 min",
    "calories": 434,
    "protein": 32,
    "carbs": 45,
    "fat": 14,
    "fiber": null,
    "ingredients": [
      "3 oz canned or smoked salmon (no added oil)",
      "3 whole large eggs",
      "2 large egg whites",
      "1/2 cup cooked quinoa (from batch prep)",
      "1/2 cup cherry tomatoes, halved",
      "1 cup fresh spinach",
      "1 tsp olive oil",
      "1 tbsp fresh dill or 1/2 tsp dried dill",
      "Salt and black pepper to taste"
    ],
    "instructions": [
      "Heat olive oil in a nonstick skillet over medium heat.",
      "Add cherry tomatoes and cook 2 minutes until they begin to soften.",
      "Add spinach and stir until wilted, about 1 minute.",
      "Whisk eggs and egg whites together, season with salt, pepper, and dill. Pour into the pan.",
      "Stir gently with a spatula, cooking on medium-low heat until eggs are just set and still slightly creamy. Do not overcook.",
      "Fold in the salmon gently in the last 30 seconds of cooking.",
      "Serve alongside the warm quinoa."
    ],
    "tip": "Canned salmon works perfectly here and costs a fraction of fresh. Look for wild-caught Pacific salmon with no added oil. Drain it well before adding to the pan.",
    "note": null,
    "tags": [
      "protocol-b",
      "35/35/30",
      "one-pan"
    ],
    "active": true
  },
  {
    "id": "lg-06",
    "name": "Whole Egg and Avocado Power Bowl",
    "meal_type": "breakfast",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "5 / 6 min",
    "cook": null,
    "total_time": "5 / 6 min",
    "calories": 424,
    "protein": 30,
    "carbs": 40,
    "fat": 16,
    "fiber": null,
    "ingredients": [
      "3 whole large eggs",
      "1/2 medium avocado, sliced",
      "1/2 cup cooked white rice or farro",
      "1/2 cup cherry tomatoes, halved",
      "1 cup baby kale or spinach",
      "1/2 tsp garlic powder",
      "1/4 tsp red pepper flakes",
      "Salt and black pepper to taste",
      "Cooking spray",
      "Hot sauce to taste"
    ],
    "instructions": [
      "Coat a nonstick skillet with cooking spray and heat over medium heat.",
      "Add cherry tomatoes and cook 2 minutes. Add kale and stir until wilted.",
      "Push vegetables to the side and crack eggs directly into the pan. Season with garlic powder, salt, and pepper.",
      "Cook eggs to your preference: sunny side up, over easy, or scrambled.",
      "Assemble the bowl: rice on the bottom, then vegetables, then eggs on top.",
      "Fan avocado slices alongside. Finish with red pepper flakes and hot sauce."
    ],
    "tip": "Do not fear the yolk. The fat in whole eggs is where a significant portion of Protocol B's dietary fat comes from and it is exactly the kind of fat your hormones need. Three eggs is not too many. It is the protocol working correctly.",
    "note": null,
    "tags": [
      "protocol-b",
      "35/35/30",
      "one-pan"
    ],
    "active": true
  },
  {
    "id": "lg-07",
    "name": "Slow Cooker Protein Oats with Almonds",
    "meal_type": "breakfast",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "5 min prep / Overnight",
    "cook": null,
    "total_time": "5 min prep / Overnight",
    "calories": 399,
    "protein": 28,
    "carbs": 38,
    "fat": 15,
    "fiber": null,
    "ingredients": [
      "1/2 cup steel-cut oats (not instant)",
      "1.5 cups unsweetened almond milk",
      "1/2 cup water",
      "1 scoop vanilla whey protein isolate (added in the morning, not during cooking)",
      "2 tbsp sliced raw almonds",
      "1/2 cup diced apple or pear",
      "1 tsp cinnamon",
      "1/2 tsp vanilla extract",
      "1 tsp maple syrup",
      "Pinch of salt"
    ],
    "instructions": [
      "Before bed, combine steel-cut oats, almond milk, water, cinnamon, vanilla extract, salt, and diced apple in a small slow cooker (2 to 3 quart size). Stir to combine.",
      "Set slow cooker on LOW. Cook overnight, 6 to 8 hours.",
      "In the morning, stir the oats well. Let cool for 2 minutes.",
      "Stir in whey protein powder. Do not add during cooking as heat degrades the protein and causes clumping.",
      "Top with sliced almonds and drizzle with maple syrup. Serve immediately."
    ],
    "tip": "This is the ultimate zero-effort breakfast. You wake up to a fully cooked meal that took 5 minutes to set up the night before. Steel-cut oats hold up to overnight cooking far better than rolled oats, which turn to mush. Do not substitute them.",
    "note": null,
    "tags": [
      "protocol-b",
      "35/35/30",
      "crockpot"
    ],
    "active": true
  },
  {
    "id": "lg-08",
    "name": "Lean Beef Breakfast Hash",
    "meal_type": "breakfast",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "5 / 20 min",
    "cook": null,
    "total_time": "5 / 20 min",
    "calories": 421,
    "protein": 34,
    "carbs": 42,
    "fat": 13,
    "fiber": null,
    "ingredients": [
      "5 oz lean ground beef (93% lean)",
      "1 medium sweet potato, peeled and diced small (about 3/4 cup)",
      "1/2 cup diced yellow onion",
      "1/2 cup diced red bell pepper",
      "1 cup fresh spinach",
      "1 tsp olive oil",
      "1/2 tsp smoked paprika",
      "1/2 tsp garlic powder",
      "1/4 tsp onion powder",
      "Salt and black pepper to taste",
      "2 fried or poached eggs to top (optional, adjust macros accordingly)"
    ],
    "instructions": [
      "Heat olive oil in a large cast iron skillet or nonstick pan over medium-high heat.",
      "Add diced sweet potato and cook, stirring occasionally, for 8 to 10 minutes until it begins to soften and develop some color.",
      "Add onion and bell pepper. Cook another 3 to 4 minutes until vegetables soften.",
      "Push vegetables to one side. Add ground beef to the open half of the pan. Cook, breaking it up, until browned through, about 5 minutes.",
      "Combine the beef and vegetables in the pan. Season with paprika, garlic powder, onion powder, salt, and pepper. Stir to coat evenly.",
      "Add spinach and stir until wilted, about 1 minute.",
      "Serve as-is for the base macros above, or top with a fried egg if your remaining daily fat budget allows."
    ],
    "tip": "Make a double or triple batch of this hash on Sunday and reheat portions throughout the week. It holds in the refrigerator for 4 days and reheats in 2 minutes. Cast iron gives you the best sear on the sweet potato. Do not skip that step.",
    "note": null,
    "tags": [
      "protocol-b",
      "35/35/30",
      "one-pan"
    ],
    "active": true
  },
  {
    "id": "lg-09",
    "name": "Ground Turkey Breast Rice Bowl",
    "meal_type": "lunch",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "5 / 15 min",
    "cook": null,
    "total_time": "5 / 15 min",
    "calories": 503,
    "protein": 45,
    "carbs": 65,
    "fat": 7,
    "fiber": null,
    "ingredients": [
      "6 oz lean ground turkey breast",
      "1 cup cooked white rice (from batch prep)",
      "1 cup broccoli florets, steamed or roasted",
      "1/2 cup diced bell pepper (any color)",
      "1/2 tsp garlic powder",
      "1/2 tsp onion powder",
      "1/2 tsp smoked paprika",
      "1/2 tsp cumin",
      "Cooking spray",
      "Fresh lime juice to finish"
    ],
    "instructions": [
      "Heat a nonstick skillet over medium-high heat and coat with cooking spray.",
      "Add ground turkey breast. Cook, breaking up into crumbles, until fully cooked through, about 7 to 8 minutes. The meat will be very lean and cook fast; do not overcook or it dries out.",
      "Add bell pepper to the pan and cook 2 minutes until slightly softened.",
      "Season with garlic powder, onion powder, paprika, and cumin. Stir to coat evenly.",
      "Reheat rice in the microwave. Build the bowl: rice on the bottom, turkey and pepper mixture over the top, broccoli alongside.",
      "Squeeze fresh lime juice over everything before eating."
    ],
    "tip": "Ground turkey breast is significantly leaner than regular ground turkey. It dries out faster, so pull it off the heat while it is still just barely cooked through. The residual heat finishes it. A squeeze of lime at the end does more flavor work than you would expect.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "one-pan"
    ],
    "active": true
  },
  {
    "id": "lg-10",
    "name": "Grilled Chicken and Sweet Potato Bowl",
    "meal_type": "lunch",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "5 / 0 min",
    "cook": null,
    "total_time": "5 / 0 min",
    "calories": 442,
    "protein": 42,
    "carbs": 55,
    "fat": 6,
    "fiber": null,
    "ingredients": [
      "5 oz grilled chicken breast (from batch prep), sliced",
      "3/4 cup cooked sweet potato, cubed (from batch prep)",
      "1.5 cups mixed greens or arugula",
      "1/2 cup cherry tomatoes, halved",
      "1/4 cup cucumber, sliced",
      "2 tbsp balsamic vinegar (no oil, used as dressing)",
      "1/4 tsp black pepper",
      "Fresh herbs of choice: basil, parsley, or cilantro"
    ],
    "instructions": [
      "Reheat chicken and sweet potato in the microwave for 90 seconds.",
      "Build the bowl: greens as the base, then sweet potato, chicken, tomatoes, and cucumber arranged over the top.",
      "Drizzle balsamic vinegar over the bowl as the dressing. It adds acidity and depth without fat calories.",
      "Finish with black pepper and fresh herbs."
    ],
    "tip": "Balsamic vinegar as a dressing is one of the better tricks in the Protocol A toolkit. It adds real flavor complexity with essentially zero calories and zero fat. This is a fully assembled meal in 5 minutes if your batch prep is done. There is no reason to eat a bad lunch when this exists in your fridge.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "batch prep / assemble"
    ],
    "active": true
  },
  {
    "id": "lg-11",
    "name": "Lemon Herb Tuna Over Greens",
    "meal_type": "lunch",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "5 / 0 min",
    "cook": null,
    "total_time": "5 / 0 min",
    "calories": 463,
    "protein": 40,
    "carbs": 60,
    "fat": 7,
    "fiber": null,
    "ingredients": [
      "2 cans (5 oz each) albacore tuna in water, drained",
      "2 cups mixed greens or romaine, chopped",
      "1/2 cup cooked chickpeas, rinsed and drained",
      "1/2 cup cherry tomatoes, halved",
      "1/4 cup red onion, thinly sliced",
      "1/4 cup cucumber, diced",
      "Juice of 1 full lemon",
      "1 tsp dried oregano",
      "1/2 tsp garlic powder",
      "1/2 tsp black pepper",
      "1 tbsp capers (optional, low calorie, adds big flavor)"
    ],
    "instructions": [
      "Drain tuna thoroughly and place in a bowl.",
      "Add lemon juice, oregano, garlic powder, pepper, and capers if using. Mix well to combine into a dressed tuna mixture.",
      "Build the salad: greens as the base, then tomatoes, cucumber, red onion, and chickpeas.",
      "Spoon the seasoned tuna over the top.",
      "No additional dressing needed. The lemon juice from the tuna mixture doubles as the salad dressing."
    ],
    "tip": "This is a zero-cook, zero-heat lunch that takes 5 minutes and travels well in a container. Pack the greens and toppings separately from the dressed tuna if transporting to work, and combine right before eating so the greens stay crisp.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "no cook"
    ],
    "active": true
  },
  {
    "id": "lg-12",
    "name": "Crockpot Turkey Breast Chili",
    "meal_type": "lunch",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "15 / 6-8 hr",
    "cook": null,
    "total_time": "15 / 6-8 hr",
    "calories": 426,
    "protein": 38,
    "carbs": 55,
    "fat": 6,
    "fiber": null,
    "ingredients": [
      "1.5 lbs lean ground turkey breast",
      "1 can (15 oz) kidney beans, rinsed and drained",
      "1 can (15 oz) black beans, rinsed and drained",
      "1 can (28 oz) crushed tomatoes, no salt added",
      "1 cup low-sodium chicken broth",
      "1 medium onion, diced",
      "3 cloves garlic, minced",
      "1 medium green bell pepper, diced",
      "2 tbsp chili powder",
      "1 tsp cumin",
      "1 tsp smoked paprika",
      "1/2 tsp oregano",
      "1/2 tsp black pepper"
    ],
    "instructions": [
      "Brown ground turkey breast in a skillet over medium-high heat before adding to the crockpot. This step is important with turkey breast since it is very lean. Browning first prevents the gray, grainy texture that comes from cooking raw lean ground meat directly in liquid.",
      "Transfer browned turkey to the crockpot. Add all remaining ingredients and stir to combine.",
      "Cook on LOW for 6 to 8 hours or HIGH for 3 to 4 hours.",
      "Stir well before serving. Adjust seasoning with additional chili powder, cumin, or black pepper to taste.",
      "Portion into containers. Makes 5 to 6 servings. Macros above are per serving."
    ],
    "tip": "This is the single most efficient batch cook in the lunch section. One 15-minute prep session produces 5 to 6 macro-accurate meals that keep in the refrigerator for 5 days and freeze beautifully. Double the batch if you have a large crockpot and freeze half immediately.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "crockpot"
    ],
    "active": true
  },
  {
    "id": "lg-13",
    "name": "Grilled Salmon and Quinoa Bowl",
    "meal_type": "lunch",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "10 / 12 min",
    "cook": null,
    "total_time": "10 / 12 min",
    "calories": 504,
    "protein": 40,
    "carbs": 50,
    "fat": 16,
    "fiber": null,
    "ingredients": [
      "5 oz salmon fillet, skin on",
      "3/4 cup cooked quinoa (from batch prep)",
      "2 cups mixed greens or arugula",
      "1/2 cup roasted cherry tomatoes",
      "1/4 cup sliced cucumber",
      "1/4 medium avocado, sliced",
      "1 tbsp olive oil (used to grill salmon)",
      "Juice of half a lemon",
      "1/2 tsp garlic powder",
      "1/2 tsp smoked paprika",
      "Fresh dill or parsley to finish"
    ],
    "instructions": [
      "Brush salmon with olive oil and season with garlic powder and smoked paprika.",
      "Grill skin-side down over medium-high heat for 6 to 7 minutes without moving it. The skin will crisp and release from the grate naturally when it is ready to flip. Flip and cook 2 to 3 more minutes until the salmon is cooked through but still slightly translucent in the center.",
      "Reheat quinoa. Build the bowl: greens as the base, quinoa, roasted tomatoes, and cucumber arranged over the top.",
      "Place grilled salmon over the bowl. Fan avocado slices alongside.",
      "Squeeze lemon juice over everything. Finish with fresh dill or parsley."
    ],
    "tip": "Grill salmon on a well-oiled grate or use a fish basket if you have one. Skin-side down and do not touch it until it releases on its own. This is the single move that separates men who can grill fish from men who cannot. Patience. It will release.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "grill / assemble"
    ],
    "active": true
  },
  {
    "id": "lg-14",
    "name": "Lean Beef and Vegetable Stir-Fry",
    "meal_type": "lunch",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "10 / 15 min",
    "cook": null,
    "total_time": "10 / 15 min",
    "calories": 506,
    "protein": 38,
    "carbs": 48,
    "fat": 18,
    "fiber": null,
    "ingredients": [
      "5 oz lean beef sirloin or flank steak, thinly sliced against the grain",
      "3/4 cup cooked brown rice or white rice (from batch prep)",
      "1 cup broccoli florets",
      "1/2 cup snap peas",
      "1/2 cup sliced carrots",
      "1/2 cup sliced mushrooms",
      "1 tbsp sesame oil",
      "1 tbsp low-sodium soy sauce or coconut aminos",
      "1 tsp fresh ginger, minced or 1/2 tsp ground ginger",
      "2 cloves garlic, minced",
      "1/2 tsp black pepper",
      "1 tsp rice vinegar"
    ],
    "instructions": [
      "Combine soy sauce, rice vinegar, ginger, garlic, and black pepper in a small bowl to make the stir- fry sauce. Set aside.",
      "Heat sesame oil in a large skillet or wok over high heat until shimmering.",
      "Add sliced beef in a single layer and cook without stirring for 90 seconds to develop a sear. Flip and cook another 60 seconds. Remove from pan and set aside.",
      "Add broccoli, snap peas, carrots, and mushrooms to the hot pan. Stir-fry over high heat for 3 to 4 minutes until vegetables are tender-crisp.",
      "Return beef to the pan. Pour sauce over everything and toss to coat. Cook 60 more seconds.",
      "Serve over reheated rice."
    ],
    "tip": "High heat and minimal stirring are the two rules of a good stir-fry. A crowded pan with constant stirring steams the food instead of searing it. Use the biggest pan you have and let the heat do the work. Coconut aminos is a lower-sodium alternative to soy sauce with a slightly sweeter profile. Either works.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "one-pan"
    ],
    "active": true
  },
  {
    "id": "lg-15",
    "name": "One-Pan Chicken Thighs with Roasted Vegetables",
    "meal_type": "lunch",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "10 / 30 min",
    "cook": null,
    "total_time": "10 / 30 min",
    "calories": 501,
    "protein": 42,
    "carbs": 45,
    "fat": 17,
    "fiber": null,
    "ingredients": [
      "6 oz boneless skinless chicken thighs (2 small thighs)",
      "1 cup diced sweet potato",
      "1 cup broccoli florets",
      "1/2 cup sliced red onion",
      "1 tbsp olive oil (divided between chicken and vegetables)",
      "1 tsp garlic powder",
      "1 tsp smoked paprika",
      "1/2 tsp dried thyme",
      "1/2 tsp black pepper",
      "Juice of half a lemon"
    ],
    "instructions": [
      "Preheat oven to 425 degrees Fahrenheit.",
      "Toss diced sweet potato and red onion with half the olive oil, half the garlic powder, and half the paprika. Spread on one side of a sheet pan.",
      "Roast sweet potato and onion for 10 minutes while you prep the chicken.",
      "Coat chicken thighs with remaining olive oil, garlic powder, paprika, thyme, and black pepper.",
      "After the initial 10 minutes, add chicken thighs and broccoli to the sheet pan. Return to the oven.",
      "Roast for 20 to 22 more minutes until chicken registers 165 degrees internally and sweet potato is tender with caramelized edges.",
      "Squeeze lemon juice over everything before serving."
    ],
    "tip": "Staggering the cook time puts everything on the same finish line. Sweet potato needs more time than broccoli or chicken. This approach means nothing is overcooked and nothing is raw. One pan, one oven, thirty minutes.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "sheet pan"
    ],
    "active": true
  },
  {
    "id": "lg-16",
    "name": "Slow Cooker Turkey Breast Meatballs Over Zucchini Noodles",
    "meal_type": "lunch",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "20 / 4-6 hr",
    "cook": null,
    "total_time": "20 / 4-6 hr",
    "calories": 488,
    "protein": 36,
    "carbs": 50,
    "fat": 16,
    "fiber": null,
    "ingredients": [
      "1 lb lean ground turkey breast",
      "1 large egg",
      "1/4 cup rolled oats, finely ground (acts as binder)",
      "2 cloves garlic, minced",
      "1/2 tsp onion powder",
      "1/2 tsp smoked paprika",
      "1/2 tsp black pepper",
      "1 can (28 oz) crushed tomatoes, no salt added",
      "1 tsp Italian seasoning",
      "1/2 tsp garlic powder",
      "2 medium zucchini, spiralized or peeled into ribbons",
      "1 tbsp olive oil",
      "Fresh basil to finish"
    ],
    "instructions": [
      "Combine ground turkey breast, egg, ground oats, minced garlic, onion powder, paprika, and black pepper in a bowl. Mix until just combined. Do not over-mix or the meatballs become dense.",
      "Form into 12 to 14 meatballs, roughly golf ball size. Place on a sheet pan and broil for 5 minutes until the exterior is set. This prevents them from falling apart in the crockpot.",
      "Mix crushed tomatoes, Italian seasoning, and garlic powder in the crockpot. Add meatballs.",
      "Cook on LOW for 4 to 6 hours.",
      "When ready to serve, heat olive oil in a skillet over medium-high heat. Add zucchini noodles and toss for 2 minutes until just warmed through. Do not overcook or they become watery.",
      "Serve meatballs and sauce over zucchini noodles. Finish with fresh basil."
    ],
    "tip": "Zucchini noodles are not a sad pasta substitute on this protocol. They are a high-volume, near-zero-calorie vegetable base that makes a 36g protein meal look like a full bowl of food. The broiling step for the meatballs before the crockpot is not optional. Raw turkey breast meatballs will disintegrate in liquid without it.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "crockpot"
    ],
    "active": true
  },
  {
    "id": "lg-17",
    "name": "Crockpot Lemon Garlic Chicken Breast and Rice",
    "meal_type": "dinner",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "10 / 6-8 hr",
    "cook": null,
    "total_time": "10 / 6-8 hr",
    "calories": 432,
    "protein": 45,
    "carbs": 45,
    "fat": 8,
    "fiber": null,
    "ingredients": [
      "1.5 lbs boneless skinless chicken breast",
      "1 cup dry white rice (yields ~3 cups cooked, divided across servings)",
      "1.5 cups low-sodium chicken broth",
      "1 cup water",
      "4 cloves garlic, minced",
      "Juice and zest of 1 lemon",
      "1 tsp dried oregano",
      "1 tsp garlic powder",
      "1 tsp onion powder",
      "1/2 tsp black pepper",
      "1 cup frozen peas (added in last 30 minutes)",
      "Fresh parsley to finish"
    ],
    "instructions": [
      "Place chicken breasts in the bottom of the crockpot. Add garlic, lemon juice, lemon zest, oregano, garlic powder, onion powder, and black pepper. Pour broth and water over everything.",
      "Cook on LOW for 5 to 6 hours or HIGH for 3 hours until chicken is cooked through and tender.",
      "Remove chicken and shred or slice. Return to the crockpot.",
      "Add dry rice to the liquid in the crockpot. Stir to combine. Cook on HIGH for 30 to 40 minutes until rice is tender and has absorbed most of the liquid.",
      "Add frozen peas in the last 15 minutes of rice cooking.",
      "Portion and finish with fresh parsley. Makes 4 to 5 servings. Macros above are per serving."
    ],
    "tip": "Adding the rice directly to the crockpot liquid at the end is the move. The rice absorbs all the chicken and lemon flavor from the cooking liquid and comes out far more flavorful than rice cooked separately. Watch it in the final 15 minutes so it does not over-absorb and stick.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "crockpot"
    ],
    "active": true
  },
  {
    "id": "lg-18",
    "name": "Ground Turkey Breast Stuffed Bell Peppers",
    "meal_type": "dinner",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "15 / 35 min",
    "cook": null,
    "total_time": "15 / 35 min",
    "calories": 431,
    "protein": 42,
    "carbs": 50,
    "fat": 7,
    "fiber": null,
    "ingredients": [
      "1 lb lean ground turkey breast",
      "4 large bell peppers (any color), tops cut off and seeds removed",
      "1 cup cooked white rice",
      "1 can (14 oz) diced tomatoes, no salt added",
      "1/2 cup diced onion",
      "3 cloves garlic, minced",
      "1 tsp cumin",
      "1 tsp chili powder",
      "1 tsp smoked paprika",
      "1/2 tsp black pepper",
      "Cooking spray",
      "Fresh cilantro to finish"
    ],
    "instructions": [
      "Preheat oven to 375 degrees Fahrenheit.",
      "Heat a skillet over medium-high heat with cooking spray. Add onion and garlic, cook 2 minutes until softened.",
      "Add ground turkey breast and cook, breaking it up, until fully cooked through. Season with cumin, chili powder, paprika, and black pepper.",
      "Stir in diced tomatoes and cooked rice. Mix to combine. Remove from heat.",
      "Stand peppers upright in a baking dish. Stuff each pepper firmly with the turkey and rice mixture, mounding it slightly over the top.",
      "Add a splash of water to the bottom of the baking dish to create steam. Cover tightly with foil.",
      "Bake for 30 minutes covered, then remove foil and bake 5 more minutes to brown the tops.",
      "Finish with fresh cilantro."
    ],
    "tip": "These hold in the refrigerator for 4 days and reheat perfectly in the microwave in 2 minutes. Make a full batch of four on Sunday and you have dinner handled for most of the week. They also freeze well individually wrapped.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "oven"
    ],
    "active": true
  },
  {
    "id": "lg-19",
    "name": "Baked Tilapia with Herb-Roasted Potatoes",
    "meal_type": "dinner",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "10 / 25 min",
    "cook": null,
    "total_time": "10 / 25 min",
    "calories": 424,
    "protein": 40,
    "carbs": 48,
    "fat": 8,
    "fiber": null,
    "ingredients": [
      "6 oz tilapia fillet (or cod)",
      "1 medium Yukon gold potato, diced (about 1 cup)",
      "1 cup asparagus spears or green beans, trimmed",
      "1 tsp olive oil (for potatoes)",
      "1/2 tsp olive oil (for fish)",
      "Juice of half a lemon",
      "1 tsp garlic powder",
      "1 tsp dried thyme or dill",
      "1/2 tsp smoked paprika",
      "1/2 tsp black pepper",
      "Lemon slices to top fish during baking"
    ],
    "instructions": [
      "Preheat oven to 425 degrees Fahrenheit.",
      "Toss diced potato with 1 tsp olive oil, garlic powder, and black pepper. Spread on one side of a sheet pan. Roast for 15 minutes.",
      "While potatoes roast, coat tilapia with the remaining olive oil, lemon juice, thyme or dill, and paprika.",
      "After the initial 15 minutes, push potatoes to one side. Add asparagus alongside. Place tilapia on the pan. Top the fish with lemon slices.",
      "Return to the oven and bake 10 to 12 more minutes until tilapia flakes easily with a fork and potatoes are golden.",
      "Everything finishes at the same time. One pan, done."
    ],
    "tip": "Tilapia is the leanest, most macro-efficient white fish available and one of the cheapest. It has almost no flavor of its own, which makes it a blank canvas that takes on whatever you season it with. Do not skip the lemon. It is doing most of the flavor work here.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "sheet pan"
    ],
    "active": true
  },
  {
    "id": "lg-20",
    "name": "Lean Beef Taco Bowls",
    "meal_type": "dinner",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "10 / 15 min",
    "cook": null,
    "total_time": "10 / 15 min",
    "calories": 423,
    "protein": 44,
    "carbs": 46,
    "fat": 7,
    "fiber": null,
    "ingredients": [
      "6 oz lean ground beef (93% lean)",
      "3/4 cup cooked white rice",
      "1/2 cup black beans, rinsed and drained",
      "1/2 cup corn kernels (frozen or fresh, no added salt)",
      "1/2 cup fresh salsa or pico de gallo",
      "1/4 cup diced red onion",
      "1 cup shredded romaine or cabbage",
      "Juice of 1 lime",
      "1 tsp chili powder",
      "1 tsp cumin",
      "1/2 tsp garlic powder",
      "1/2 tsp onion powder",
      "1/2 tsp smoked paprika",
      "1/2 tsp black pepper",
      "Cooking spray",
      "Fresh cilantro and hot sauce to finish"
    ],
    "instructions": [
      "Heat a skillet over medium-high heat and coat with cooking spray. Add ground beef and cook, breaking it up, until browned through, about 6 to 7 minutes.",
      "Drain any excess fat from the pan. Add all spices and stir to coat the meat evenly. Cook 1 more minute to bloom the spices.",
      "Add corn and black beans to the pan and stir to combine. Heat through for 2 minutes.",
      "Build the bowl: rice on the bottom, then the beef and bean mixture, then shredded romaine and diced red onion.",
      "Top with fresh salsa, a squeeze of lime, cilantro, and hot sauce."
    ],
    "tip": "This is the most popular dinner in the Protocol A rotation with every client I have coached. It looks and tastes like a restaurant bowl, takes 15 minutes, and hits the numbers perfectly. Make a double batch of the beef mixture and reheat throughout the week. Build the bowl fresh each time so the lettuce stays crisp.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "one-pan"
    ],
    "active": true
  },
  {
    "id": "lg-21",
    "name": "Crockpot Lean Beef and Sweet Potato Stew",
    "meal_type": "dinner",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "15 / 7-8 hr",
    "cook": null,
    "total_time": "15 / 7-8 hr",
    "calories": 490,
    "protein": 40,
    "carbs": 42,
    "fat": 18,
    "fiber": null,
    "ingredients": [
      "1.5 lbs lean beef stew meat (bottom round or top sirloin, trimmed of visible fat), cut into 1-inch cubes",
      "2 medium sweet potatoes, peeled and cubed",
      "2 medium carrots, sliced",
      "1 cup diced celery",
      "1 medium onion, diced",
      "3 cloves garlic, minced",
      "1 can (14 oz) diced tomatoes, no salt added",
      "1.5 cups low-sodium beef broth",
      "1 tbsp olive oil (used to sear beef before crockpot)",
      "2 tsp smoked paprika",
      "1 tsp cumin",
      "1 tsp garlic powder",
      "1 tsp dried thyme",
      "1/2 tsp black pepper",
      "Fresh parsley to finish"
    ],
    "instructions": [
      "Heat olive oil in a large skillet over high heat. Sear beef cubes in batches, 2 minutes per side, until a deep brown crust forms. Do not crowd the pan. This step builds the flavor base of the entire stew. Do not skip it.",
      "Transfer seared beef to the crockpot. Add onion, garlic, carrots, and celery over the beef.",
      "Add diced tomatoes, beef broth, and all spices. Stir briefly to distribute.",
      "Cook on LOW for 7 to 8 hours. Add sweet potato cubes in the last 2 hours of cooking so they hold their shape and do not turn to mush.",
      "Stir well before portioning. Makes 5 to 6 servings. Finish with fresh parsley."
    ],
    "tip": "Searing the beef before the crockpot is the single step that separates a great stew from a gray, watery one. The Maillard reaction from the sear creates depth of flavor that slow cooking alone cannot produce. Take the 10 extra minutes. You will taste the difference.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "crockpot"
    ],
    "active": true
  },
  {
    "id": "lg-22",
    "name": "Salmon Sheet Pan Dinner with Roasted Vegetables",
    "meal_type": "dinner",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "10 / 22 min",
    "cook": null,
    "total_time": "10 / 22 min",
    "calories": 483,
    "protein": 38,
    "carbs": 40,
    "fat": 19,
    "fiber": null,
    "ingredients": [
      "6 oz salmon fillet, skin on",
      "1 cup diced sweet potato",
      "1 cup broccoli florets",
      "1/2 cup sliced red onion",
      "1 tbsp olive oil (split between vegetables and fish)",
      "1 tsp garlic powder",
      "1 tsp smoked paprika",
      "1/2 tsp dried oregano",
      "1/2 tsp black pepper",
      "Juice of half a lemon",
      "1/4 avocado, sliced and served on the side"
    ],
    "instructions": [
      "Preheat oven to 425 degrees Fahrenheit. Alternatively, fire up the grill for the salmon while the vegetables roast in the oven.",
      "Toss sweet potato and red onion with half the olive oil, half the garlic powder, and half the paprika. Spread on a sheet pan and roast for 12 minutes.",
      "Coat salmon with remaining olive oil, garlic powder, paprika, oregano, and black pepper.",
      "After the initial 12 minutes, add broccoli to the sheet pan and place salmon skin-side down. Return to oven and cook 10 to 12 more minutes until salmon is cooked through and broccoli is charred at the edges.",
      "Grill option: after roasting vegetables in the oven, finish the salmon skin-side down on a hot grill for 6 to 8 minutes instead.",
      "Plate everything together. Fan avocado alongside. Squeeze lemon over the salmon and vegetables before serving."
    ],
    "tip": "The avocado is not garnish. It is the Protocol B fat allocation doing its job. Do not leave it off. The combination of omega-3s from the salmon and monounsaturated fat from the avocado makes this one of the most hormonally supportive dinners in the book.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "sheet pan / grill"
    ],
    "active": true
  },
  {
    "id": "lg-23",
    "name": "One-Pan Chicken Thigh and Vegetable Bake",
    "meal_type": "dinner",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "10 / 35 min",
    "cook": null,
    "total_time": "10 / 35 min",
    "calories": 497,
    "protein": 42,
    "carbs": 44,
    "fat": 17,
    "fiber": null,
    "ingredients": [
      "7 oz boneless skinless chicken thighs (2 medium thighs)",
      "1 cup diced baby potatoes or fingerlings, halved",
      "1 cup green beans, trimmed",
      "1/2 cup cherry tomatoes",
      "1/2 cup sliced zucchini",
      "1 tbsp olive oil",
      "4 cloves garlic, minced",
      "1 tsp dried rosemary",
      "1 tsp dried thyme",
      "1 tsp smoked paprika",
      "1/2 tsp black pepper",
      "Juice of half a lemon",
      "Fresh rosemary sprigs optional for presentation"
    ],
    "instructions": [
      "Preheat oven to 425 degrees Fahrenheit.",
      "Combine olive oil, minced garlic, rosemary, thyme, paprika, black pepper, and lemon juice in a large bowl.",
      "Add chicken thighs and all vegetables to the bowl. Toss everything together until evenly coated with the herb and oil mixture.",
      "Spread in a single layer on a large sheet pan, placing chicken thighs skin-side up in the center with vegetables arranged around them.",
      "Roast for 30 to 35 minutes until chicken registers 165 degrees internally and vegetables are tender with caramelized edges.",
      "Rest 5 minutes before plating. Finish with any pan juices spooned over the top."
    ],
    "tip": "Everything goes in one bowl, gets coated, goes on one pan. The pan juices that collect during roasting are concentrated flavor. Spoon them back over the chicken and vegetables before serving. This is the closest thing to a foolproof dinner in the entire book.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "sheet pan"
    ],
    "active": true
  },
  {
    "id": "lg-24",
    "name": "Ground Turkey Breast Marinara over Spaghetti Squash",
    "meal_type": "dinner",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "15 / 45 min",
    "cook": null,
    "total_time": "15 / 45 min",
    "calories": 482,
    "protein": 36,
    "carbs": 44,
    "fat": 18,
    "fiber": null,
    "ingredients": [
      "1 lb lean ground turkey breast",
      "1 medium spaghetti squash (yields about 3 cups cooked strands)",
      "1 can (28 oz) crushed tomatoes, no salt added",
      "1/2 cup diced onion",
      "4 cloves garlic, minced",
      "1 tbsp olive oil",
      "1 tsp Italian seasoning",
      "1 tsp smoked paprika",
      "1/2 tsp black pepper",
      "1/4 tsp red pepper flakes (optional)",
      "Fresh basil to finish"
    ],
    "instructions": [
      "Preheat oven to 400 degrees Fahrenheit. Halve the spaghetti squash lengthwise and scoop out the seeds. Place cut-side down on a sheet pan. Roast for 35 to 40 minutes until the flesh is tender and separates into strands easily when scraped with a fork.",
      "While squash roasts, heat olive oil in a large skillet over medium heat. Add onion and cook 3 minutes until softened. Add garlic and cook 1 more minute.",
      "Add ground turkey breast and cook, breaking it up, until fully cooked through. Season with Italian seasoning, paprika, black pepper, and red pepper flakes.",
      "Pour crushed tomatoes over the turkey mixture. Stir to combine. Simmer on low for 10 to 15 minutes until the sauce thickens.",
      "When squash is done, use a fork to scrape the strands into a bowl or directly onto plates.",
      "Ladle the turkey marinara over the squash strands. Finish with fresh basil."
    ],
    "tip": "Spaghetti squash is one of the best volume foods in this protocol. A full cup of cooked strands is roughly 40 calories. It makes a modest serving of protein and sauce look like a full pasta bowl. The olive oil in this recipe is intentional and accounted for. It adds depth to the sauce base and contributes the Protocol B fat allocation alongside the turkey's natural fat content.",
    "note": "No added salt in the base recipe. Season to taste. Your shaker, your call.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "oven + one-pan"
    ],
    "active": true
  },
  {
    "id": "lg-25",
    "name": "Cottage Cheese and Fresh Fruit Bowl",
    "meal_type": "snacks",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "2 min",
    "cook": null,
    "total_time": "2 min",
    "calories": 227,
    "protein": 22,
    "carbs": 28,
    "fat": 3,
    "fiber": null,
    "ingredients": [
      "3/4 cup low-fat (1%) cottage cheese",
      "1/2 cup fresh strawberries, sliced",
      "1/2 cup fresh blueberries or raspberries",
      "1/4 tsp cinnamon",
      "1 tsp honey (optional, adds 5g carbs)"
    ],
    "instructions": [
      "Spoon cottage cheese into a bowl or container.",
      "Top with sliced strawberries and blueberries.",
      "Dust with cinnamon. Drizzle honey if using and your carb budget allows.",
      "Eat immediately or pack in a sealed container for transport. Keeps well for up to 4 hours in a cooler bag."
    ],
    "tip": "Cottage cheese is one of the most underrated proteins in this program. It is casein- dominant, meaning it digests slowly and keeps amino acids circulating for hours. This makes it an excellent mid-afternoon snack or pre-bed option. If the texture bothers you, blend it smooth. Same macros, different mouthfeel.",
    "note": "Snacks are where reasonable sodium is acceptable. Season to taste and read labels on packaged items.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "no cook"
    ],
    "active": true
  },
  {
    "id": "lg-26",
    "name": "Protein Shake and Rice Cake Stack",
    "meal_type": "snacks",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "2 min",
    "cook": null,
    "total_time": "2 min",
    "calories": 234,
    "protein": 24,
    "carbs": 30,
    "fat": 2,
    "fiber": null,
    "ingredients": [
      "1 scoop whey protein isolate, any flavor (GMP certified, 3g+ leucine per serving)",
      "8 to 10 oz cold water or unsweetened almond milk",
      "3 plain rice cakes",
      "1 tbsp sugar-free jam or 1 tsp honey (optional)"
    ],
    "instructions": [
      "Combine protein powder and liquid in a shaker bottle. Shake for 20 seconds until fully mixed.",
      "Stack rice cakes on a plate or pack them in a zip bag.",
      "If using jam or honey on the rice cakes, apply just before eating so they do not go soggy during transport.",
      "Drink the shake and eat the rice cakes together as one snack. Do not drink the shake and skip the rice cakes. The carbs matter for protein utilization and appetite management."
    ],
    "tip": "This is the fastest, most portable snack in the book. Shake bottle in one hand, rice cakes in the other. You can be in and out of a break room in 3 minutes. The rice cakes are not sad. They are measured, clean carbs that pair with protein perfectly. If plain rice cakes offend you, get the lightly salted version. They still track cleanly and you will actually eat them.",
    "note": "Snacks are where reasonable sodium is acceptable. Season to taste and read labels on packaged items.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "no cook"
    ],
    "active": true
  },
  {
    "id": "lg-27",
    "name": "Greek Yogurt and Mixed Berry Bowl",
    "meal_type": "snacks",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "2 min",
    "cook": null,
    "total_time": "2 min",
    "calories": 211,
    "protein": 20,
    "carbs": 26,
    "fat": 3,
    "fiber": null,
    "ingredients": [
      "3/4 cup plain nonfat Greek yogurt",
      "1/2 cup mixed berries, fresh or frozen and thawed",
      "1 tsp honey",
      "1/4 tsp vanilla extract",
      "Pinch of cinnamon"
    ],
    "instructions": [
      "Stir vanilla extract into Greek yogurt until combined.",
      "Top with mixed berries.",
      "Drizzle honey over the top and dust with cinnamon.",
      "Eat immediately or refrigerate covered for up to 24 hours. Frozen berries thawed overnight in the fridge work perfectly for a grab-and-go morning snack."
    ],
    "tip": "Plain nonfat Greek yogurt is bitter to some men at first, particularly those coming from flavored versions that are loaded with added sugar. The honey and vanilla in this recipe bridge that gap without adding significant calories. Give it two weeks. Your palate adapts faster than you think, and the flavored versions will start tasting overwhelmingly sweet once it does.",
    "note": "Snacks are where reasonable sodium is acceptable. Season to taste and read labels on packaged items.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "no cook"
    ],
    "active": true
  },
  {
    "id": "lg-28",
    "name": "Turkey Breast Roll-Ups with Mustard",
    "meal_type": "snacks",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "4 min",
    "cook": null,
    "total_time": "4 min",
    "calories": 206,
    "protein": 25,
    "carbs": 22,
    "fat": 2,
    "fiber": null,
    "ingredients": [
      "4 oz sliced deli turkey breast (low sodium, look for under 300mg per serving)",
      "4 rice cakes",
      "1 tbsp yellow or Dijon mustard",
      "1/4 cup sliced cucumber",
      "1/4 cup shredded romaine or spinach leaves",
      "1/4 tsp black pepper"
    ],
    "instructions": [
      "Lay turkey slices flat on a cutting board.",
      "Spread a thin layer of mustard on each slice.",
      "Add a few pieces of cucumber and a leaf or two of spinach to each slice.",
      "Roll tightly and secure with a toothpick if transporting, or eat as-is.",
      "Serve alongside rice cakes. Use the remaining mustard as a dip for the rice cakes."
    ],
    "tip": "This is the most portable snack in the Protocol A section. It requires no refrigeration for up to 2 hours in a bag, which makes it a legitimate option for desk drawers, gym bags, and car consoles.",
    "note": "Snacks are where reasonable sodium is acceptable. Season to taste and read labels on packaged items.",
    "tags": [
      "protocol-a",
      "40/40/20",
      "no cook"
    ],
    "active": true
  },
  {
    "id": "lg-29",
    "name": "Smoked Salmon and Cucumber Bites",
    "meal_type": "snacks",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "5 min",
    "cook": null,
    "total_time": "5 min",
    "calories": 258,
    "protein": 20,
    "carbs": 22,
    "fat": 10,
    "fiber": null,
    "ingredients": [
      "3 oz smoked salmon (wild-caught, no added oil)",
      "1 medium cucumber, sliced into 1/2-inch rounds (about 16 slices)",
      "2 tbsp plain nonfat Greek yogurt (used as a spread)",
      "1 tsp capers (optional)",
      "Fresh dill or chives",
      "1/2 tsp black pepper",
      "Squeeze of fresh lemon",
      "4 rice cakes (for carb balance)"
    ],
    "instructions": [
      "Spread a small amount of Greek yogurt on each cucumber round.",
      "Top each round with a small piece of smoked salmon.",
      "Add a caper and a small sprig of dill or pinch of chives to each bite.",
      "Finish with a crack of black pepper and a squeeze of lemon over the whole tray.",
      "Serve alongside rice cakes for the carbohydrate balance."
    ],
    "tip": "This snack looks significantly more impressive than the effort required to make it. It takes 5 minutes, costs almost nothing, and carries the omega-3 profile of salmon in a format you can eat at your desk without heating anything up. The Greek yogurt replaces cream cheese at a fraction of the fat and calories while maintaining the creamy base the salmon needs.",
    "note": "Snacks are where reasonable sodium is acceptable. Season to taste and read labels on packaged items.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "no cook"
    ],
    "active": true
  },
  {
    "id": "lg-30",
    "name": "Hard Boiled Eggs with Almonds and Apple",
    "meal_type": "snacks",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "2 min (batch eggs ahead)",
    "cook": null,
    "total_time": "2 min (batch eggs ahead)",
    "calories": 276,
    "protein": 22,
    "carbs": 20,
    "fat": 12,
    "fiber": null,
    "ingredients": [
      "2 large hard boiled eggs (batch cooked on Sunday)",
      "1 oz raw unsalted almonds (about 23 almonds)",
      "1 small apple, sliced",
      "1/4 tsp smoked paprika or everything bagel seasoning (on eggs)",
      "Hot sauce to taste"
    ],
    "instructions": [
      "Peel hard boiled eggs if not already done. Slice in half lengthwise.",
      "Dust egg yolks with smoked paprika or everything bagel seasoning. Add a dash of hot sauce if using.",
      "Arrange eggs, almonds, and apple slices together on a plate or in a compartmented container.",
      "Eat as a complete snack. The combination of protein and fat from the eggs and almonds with the natural sugar from the apple covers all three macros in one portable package."
    ],
    "tip": "Hard boiling a dozen eggs on Sunday takes 12 minutes and costs almost nothing. They keep unpeeled in the refrigerator for a full week. This snack requires zero active prep if the eggs are already done. Two eggs plus almonds and fruit is a genuinely complete snack that holds you for 3 hours without a single hot appliance involved.",
    "note": "Snacks are where reasonable sodium is acceptable. Season to taste and read labels on packaged items.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "no cook"
    ],
    "active": true
  },
  {
    "id": "lg-31",
    "name": "Almond Butter Protein Shake",
    "meal_type": "snacks",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "3 min",
    "cook": null,
    "total_time": "3 min",
    "calories": 258,
    "protein": 18,
    "carbs": 24,
    "fat": 10,
    "fiber": null,
    "ingredients": [
      "1 scoop chocolate or vanilla whey protein isolate (GMP certified, 3g+ leucine)",
      "1 tbsp natural almond butter (no added sugar or oil)",
      "8 oz unsweetened almond milk",
      "1/2 medium banana, frozen",
      "1/2 tsp cinnamon",
      "3 to 4 ice cubes"
    ],
    "instructions": [
      "Combine all ingredients in a blender.",
      "Blend on high for 30 to 45 seconds until smooth and creamy.",
      "Pour into a shaker bottle or glass and drink immediately.",
      "No blender available: skip the banana and ice, shake protein powder and almond milk in a shaker bottle, eat the almond butter separately off a spoon. Same macros, less elegant."
    ],
    "tip": "The frozen banana replaces ice cream without the sugar hit and gives the shake a thick, creamy texture that a protein shake mixed with water will never achieve. Peel and freeze bananas in advance in a zip bag and they are always ready. Natural almond butter means one ingredient on the label: almonds. Any other version is adding sugar and vegetable oil to something that does not need either.",
    "note": "Snacks are where reasonable sodium is acceptable. Season to taste and read labels on packaged items.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "blender / shaker"
    ],
    "active": true
  },
  {
    "id": "lg-32",
    "name": "Egg and Avocado Snack Plate",
    "meal_type": "snacks",
    "source": "The Long Game",
    "serves": 1,
    "serving_label": "1 serving",
    "prep": "3 min (batch eggs ahead)",
    "cook": null,
    "total_time": "3 min (batch eggs ahead)",
    "calories": 267,
    "protein": 24,
    "carbs": 18,
    "fat": 11,
    "fiber": null,
    "ingredients": [
      "2 large hard boiled eggs, peeled and halved",
      "1/4 medium avocado, sliced",
      "4 rice cakes",
      "1/4 cup cherry tomatoes, halved",
      "1/2 tsp everything bagel seasoning or smoked paprika",
      "Squeeze of lemon or lime",
      "Hot sauce to taste",
      "Black pepper to taste"
    ],
    "instructions": [
      "Arrange halved eggs and avocado slices on a plate or in a flat container.",
      "Add cherry tomatoes alongside.",
      "Season eggs with everything bagel seasoning or smoked paprika and black pepper.",
      "Squeeze lemon or lime over the avocado to keep it from browning and add brightness.",
      "Serve with rice cakes on the side. Use the avocado as a spread on the rice cakes if preferred.",
      "Add hot sauce to the eggs or across the whole plate to taste."
    ],
    "tip": "This is the most complete snack in the Protocol B section in terms of macronutrient coverage. The eggs provide protein and fat, the avocado provides monounsaturated fat and potassium, the rice cakes provide clean carbs, and the tomatoes add volume and micronutrients for almost no calories. It also looks like a real plate of food rather than a protein bar torn out of a wrapper. Presentation matters more than most men admit. Eating well should not feel like a penalty.",
    "note": "Snacks are where reasonable sodium is acceptable. Season to taste and read labels on packaged items.",
    "tags": [
      "protocol-b",
      "35/35/30",
      "no cook"
    ],
    "active": true
  }
];

/* ------------------------------------------------------------- exports ---- */
global.MB = {
  /* units */
  lbsToKg: lbsToKg, kgToLbs: kgToLbs, inToCm: inToCm, cmToIn: cmToIn,
  /* reference data */
  ACTIVITY: ACTIVITY, GOALS: GOALS, SPLITS: SPLITS, PANTRY: PANTRY, RECIPES: RECIPES,
  activityByValue: activityByValue, goalByKey: goalByKey, splitByKey: splitByKey,
  /* formulas */
  bmrMifflin: bmrMifflin, bmrHarris: bmrHarris, bmrKatch: bmrKatch,
  navyBodyFat: navyBodyFat, validateInput: validateInput,
  calcTargets: calcTargets, guardrails: guardrails,
  /* planning */
  buildDay: buildDay, closeGap: closeGap, buildWeek: buildWeek, findMeals: findMeals,
  fitLabel: fitLabel, portionNote: portionNote, slotTime: slotTime, dayToPlanRows: dayToPlanRows,
  scoreTotals: scoreTotals, slotsForMealCount: slotsForMealCount,
  /* importing */
  parseRecipes: parseRecipes, macroCheck: macroCheck, portionText: portionText,
  scaleIngredient: scaleIngredient, niceAmount: niceAmount, recipeForPlanRow: recipeForPlanRow,
  loadLibrary: loadLibrary, normalizeRow: normalizeRow,
  recomputeDay: recomputeDay, cloneDay: cloneDay, poolFor: poolFor
};

})(typeof window !== 'undefined' ? window : this);
