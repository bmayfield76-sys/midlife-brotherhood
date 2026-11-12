# How to Use the Meal Plan Engine

The app now does the math and the menu. A client enters his stats, the app runs Mifflin-St Jeor and Harris-Benedict, averages them, applies his goal and macro split, then builds a day (or a week) of meals out of your cookbooks that hits those numbers. Nothing lands on a client's Meals tab until you approve it.

## Setup (10 minutes, once)

**1. Put the new file next to the other two.** There are three files that have to live in the same folder wherever the app is hosted: `index.html`, `admin.html`, and the new `mb-nutrition.js`. If `mb-nutrition.js` is missing, both pages break. That file holds the formulas, the plan builder, and all 56 recipes from The Muscle Chef and The Long Game.

**2. Run the SQL.** Open Supabase, go to SQL Editor, start a new query, paste in everything from `supabase-meal-engine.sql`, and hit Run. It only adds things. It doesn't touch your existing clients, messages, or meal plans, and it's safe to run twice.

**3. Load the cookbooks into the table.** Open the coach dashboard, click **Recipes**, then **Load both cookbooks**. That copies all 56 recipes into your database so you can edit them.

If you skip steps 2 and 3, the app still works. It runs on the built-in copy of both books. You just can't add cookbooks, edit recipes, save a client's stats, or assign a seven-day plan with a different menu each day.

## What your clients see

**Tools tab, Macro Blueprint.** He enters sex, age, weight, height, activity level, and goal, picks a split, and hits Run My Numbers. He gets his calories, his protein/carbs/fat in grams, and both formulas shown side by side so he can see where the number came from.

Then **Build My Day** assembles breakfast, lunch, dinner, and snacks from the cookbooks. If he doesn't like the menu, **Different day** deals another one. **Send to Coach Billy for Approval** drops it in your queue and sends you a message with the whole breakdown.

**Meals tab.** Shows today's meals in clock order with a bar for each macro against his target. If you assigned a week, it shows the right day automatically.

## What you do

**Plan Builder tab.** Pending requests sit at the top. Click **Open in builder** and the client's plan loads as something you can edit: swap any meal from the dropdown, bump servings up or down with the plus and minus, or remove a meal. The totals recalculate as you go.

Or start from scratch: pick a client, check his numbers, hit **Run Numbers**, then **Build One Day** (same menu every day) or **Build Seven Days** (different menu each day, with repeats kept to a minimum).

**Assign** replaces whatever plan he's on. It asks you to confirm first because the old plan is gone once you do. He gets a message that the new plan is live.

**Recipes tab.** Everything the builder is allowed to pick from. Turn a recipe off and it stops showing up in plans. Edit fixes a name, meal type, or macro.

## The three splits

**35/35/30, Brotherhood Standard.** The default. It's what Chapter 2 of The Muscle Chef teaches and what Protocol B in The Long Game is built for.

**40/40/20, High Protein Push.** Protocol A. Fat sits right at the 20 percent floor, so the app flags it when a client's fat drops low for his bodyweight. Good for a focused cut, not a lifestyle.

**30/35/35, Lower Carb.** For the guy who runs better on fewer carbs.

**Custom.** Type any three percentages for a special case. The guardrails still fire: protein past 1.6 g per pound, fat under 20 percent of calories, calories under 1,500, or a deficit deeper than about 22 percent all get called out in plain English. A red flag doesn't block you. It makes sure you chose it on purpose.

## Adding another cookbook

Recipes tab, **Add recipes**. Type the cookbook's name, paste a recipe or an entire chapter straight from the manuscript, and click **Read recipes**. Both of your book layouts are recognized automatically. You get a preview of every recipe it found, with a warning on any where the macros don't add up to the stated calories (usually a typo in the book). Uncheck anything you don't want, then save.

For a recipe typed by hand, this is all it needs:

```
Blackened Chicken Rice Bowl
Type: lunch
Serves: 2
Calories: 480
Protein: 46g
Carbs: 44g
Fat: 12g

Ingredients
- 12 oz chicken breast
- 2 cups cooked jasmine rice

Instructions
1. Season and sear the chicken.
2. Slice and serve over rice.
```

Macros are per serving. Separate multiple hand-typed recipes with a line of three dashes.

## Reading the fit badge

Every day the builder produces gets a grade. **Dialed in** means every macro is within 5 percent of target. **Close enough** is within 10. **Loose fit** means one macro is off by more than 10 and deserves a manual tweak. **Poor fit** means the library can't reach that target as asked.

When the recipes alone can't close the gap, the builder adds a short list of adjustments under the day, things like "Add 1 scoop whey isolate" or "Cook with one less tbsp of oil or butter." Those show up on the client's Meals tab as their own section.

If you see a note about double portions, the calorie target is too big for the number of meals. Add a meal or a snack and the plates go back to normal.

## What was wrong with the old calculator

The Mifflin-St Jeor and Harris-Benedict cards never converted pounds to kilograms, so a 220-pound man was calculated as if he weighed 220 kilograms. His maintenance came out at 4,285 calories instead of 2,632. The body fat card had the mirror-image bug in metric mode. All three are fixed, and every calculator now refuses nonsense input (a blank height, a weight of 12) with a clear message instead of quietly printing a wrong number.
