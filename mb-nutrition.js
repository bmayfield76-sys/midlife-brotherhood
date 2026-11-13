/* ============================================================================
   mb-nutrition.js — Midlife Brotherhood nutrition engine
   Shared by index.html (client) and admin.html (coach). Plain JS, no build step.
   Formulas and the plan builder only. No recipe content lives in this file.
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
      recipe_id: isUuid(m.recipe.id) ? m.recipe.id : null,   /* only real table rows get linked */
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
/* Reads the recipes table. The callback gets (recipes, source, note): source
   is 'supabase' when recipes came back, 'none' when the table is missing,
   empty, or unreachable, with the reason in note.                            */
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
  if (!sb) { cb([], 'none', 'no database connection'); return; }
  var done = false;
  function finish(lib, src, note) { if (!done) { done = true; cb(lib, src, note || null); } }
  try {
    sb.from('recipes').select('*').eq('active', true).then(function (res) {
      if (res && res.error) return finish([], 'none', res.error.message);
      if (!res || !res.data || !res.data.length) return finish([], 'none', 'the recipes table is empty');
      finish(res.data.map(normalizeRow), 'supabase', null);
    }, function (err) {
      finish([], 'none', (err && err.message) || 'could not reach the recipes table');
    });
  } catch (e) {
    finish([], 'none', e.message);
  }
  setTimeout(function () { finish([], 'none', 'the recipes table timed out'); }, 8000);
}

/* ======================================================== recipe content === */
/* Deliberately empty. The recipes are paid content, and this file is served to
   anyone who opens the site, signed in or not. They live in the Supabase
   recipes table, where only signed-in clients can read them. */
var RECIPES = [];

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
