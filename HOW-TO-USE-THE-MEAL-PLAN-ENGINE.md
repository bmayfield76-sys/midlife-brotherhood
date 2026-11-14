# How to Use the Meal Plan Engine

The app now does the math and the menu. A client enters his stats, the app runs Mifflin-St Jeor and Harris-Benedict, averages them, applies his goal and macro split, then builds a day (or a week) of meals out of your cookbooks that hits those numbers. Nothing lands on a client's Meals tab until you approve it.

## Setup (10 minutes, once)

**1. Put the new file next to the other two.** There are three files that have to live in the same folder wherever the app is hosted: `index.html`, `admin.html`, and `mb-nutrition.js`. If `mb-nutrition.js` is missing, both pages break. That file holds the formulas and the plan builder. It holds no recipes.

**2. Run the SQL.** Open Supabase, go to SQL Editor, start a new query, paste in everything from `supabase-meal-engine.sql`, and hit Run. It only adds things. It doesn't touch your existing clients, messages, or meal plans, and it's safe to run twice.

**3. Load the recipes.** Your recipes live in the Supabase `recipes` table and nowhere else. If the Recipes tab in the coach dashboard already lists them, you're done. If it says the library is empty, run your private `recipes-seed.sql` backup in the SQL Editor the same way as step 2, or paste the recipes in with **Add recipes**.

## Where the recipes live, and why

The recipes are paid content, so they are not in this repo and not in any file the website serves. Anyone can open a website's files without logging in; only a signed-in client can read the `recipes` table. Keep `recipes-seed.sql` somewhere private (your computer, a private Drive folder). Don't add it to the repo.

Without recipes in the table the calculators still work, but the plan builder has nothing to build from and says so.

## What your clients see

**Tools tab, Macro Blueprint.** He enters sex, age, weight, height, activity level, and goal, picks a split, and hits Run My Numbers. He gets his calories, his protein/carbs/fat in grams, and both formulas shown side by side so he can see where the number came from.

Then **Build My Day** assembles breakfast, lunch, dinner, and snacks from the cookbooks. If he doesn't like the menu, **Different day** deals another one. **Send to Coach Billy for Approval** drops it in your queue and sends you a message with the whole breakdown.

**Meals tab.** Shows today's meals in clock order with a bar for each macro against his target. If you assigned a week, it shows the right day automatically.

Tapping a meal opens the recipe: ingredients, steps, and your coach's tip. The ingredient amounts are scaled to his portion, so if you assigned 1.5 servings of the oatmeal bowl he sees 3/4 cup of oats, not a math problem. A toggle flips back to the recipe as the book wrote it, which is what he wants when he's batch cooking a four-serving recipe for the week. A meal you typed in by hand on the Meal Plans tab has no recipe behind it, so it just isn't tappable.

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

## The Klein Method: for the guy who won't cook recipes

Some men don't want a recipe or a macro target. They want to be told what goes on the plate. That's the Klein Method from the bonus chapter of The Long Game, and it's a second plan style in the app.

**How it works.** Three main meals, each a lean protein, a carb, and vegetables, with lean protein snacks in between. Portions come off Keith Klein's bodyweight chart: 5 oz of protein per main meal at 150 to 180 lbs, 6 oz at 180 to 200, 7 oz at 200 and up, with the matching carb range and vegetable amount. Protein and carbs are weighed cooked. Vegetables aren't weighed. Oatmeal and grits are the exception and use the dry serving on the package. Healthy fats are capped at 2 or 3 servings a day.

**What the client does.** Tools tab, **Klein Method**. He enters his bodyweight, taps off any food he won't eat, and hits Show My Portions, then Build My Day. He gets something like "7 oz chicken breast + 7 oz baked potato + vegetables" with a one-line how-to for each. No calories, no grams. He sends it to you the same way as a macro plan. **Label Check**, right below it, is Klein's ten-second test: calories and fat grams off a label, and it tells him whether the food is under 25 percent fat.

**What you do.** Plan Builder, pick the client, and flip **Plan style** to Klein Method. Build one day or seven, swap any protein, carb, or snack from the dropdowns, and assign. On a seven-day plan salmon and lean beef show up at most twice each, and never both on the same day, which is how the protocol treats the higher-fat proteins.

**The numbers you see and he doesn't.** The builder shows you a rough calorie and macro estimate for each day, and if you've run his numbers before, how far under his maintenance the plan sits. Klein portions are set by bodyweight, not activity, so a big or active man lands well under maintenance on any setting. That's why the portion settings are called Tighter, Standard, and Fuller instead of cut, hold, and build. If the builder flags a hard cut, add snacks or go Fuller. His Meals tab shows ounces, cups, and how to cook it, nothing else.

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
