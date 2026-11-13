-- ============================================================================
--  Midlife Brotherhood - Meal Plan Engine
--  Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--  Safe to run more than once. It adds things, it never drops your data.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1. Who is the coach
--     Every policy below uses this instead of hardcoding the email in ten
--     places. Change the address here if it ever moves.
-- ---------------------------------------------------------------------------
create or replace function public.mb_is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'bmayfield76@gmail.com';
$$;

grant execute on function public.mb_is_coach() to authenticated, anon;


-- ---------------------------------------------------------------------------
--  2. The recipe library
--     One row per recipe, macros stated per serving. Grows as you paste in
--     more cookbooks from the Recipes tab in the coach dashboard.
-- ---------------------------------------------------------------------------
create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  meal_type     text not null check (meal_type in ('breakfast','lunch','dinner','snacks')),
  source        text,
  serves        integer default 1,
  serving_label text,
  prep          text,
  cook          text,
  total_time    text,
  calories      numeric not null check (calories > 0),
  protein       numeric not null check (protein  >= 0),
  carbs         numeric not null check (carbs    >= 0),
  fat           numeric not null check (fat      >= 0),
  fiber         numeric,
  ingredients   jsonb default '[]'::jsonb,
  instructions  jsonb default '[]'::jsonb,
  tip           text,
  note          text,
  tags          text[] default '{}',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- In case the table was created by an earlier copy of this file.
alter table public.recipes add column if not exists note text;

create index if not exists recipes_meal_type_idx on public.recipes (meal_type) where active;
create index if not exists recipes_source_idx    on public.recipes (source);

-- Same recipe from the same book should not land twice when you paste again.
create unique index if not exists recipes_name_source_key
  on public.recipes (lower(name), coalesce(lower(source), ''));


-- ---------------------------------------------------------------------------
--  3. Client numbers on the profile
--     So a plan can be rebuilt later without asking the client to re-enter
--     his stats, and so the coach dashboard can see what he actually typed.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists sex               text;
alter table public.profiles add column if not exists age               integer;
alter table public.profiles add column if not exists height_in         numeric;
alter table public.profiles add column if not exists activity_factor   numeric;
alter table public.profiles add column if not exists goal              text;
alter table public.profiles add column if not exists split_key         text;
alter table public.profiles add column if not exists split_protein_pct integer;
alter table public.profiles add column if not exists split_carbs_pct   integer;
alter table public.profiles add column if not exists split_fat_pct     integer;
alter table public.profiles add column if not exists meals_per_day     integer;
alter table public.profiles add column if not exists bmr_mifflin       integer;
alter table public.profiles add column if not exists bmr_harris        integer;
alter table public.profiles add column if not exists tdee_average      integer;
alter table public.profiles add column if not exists target_calories   integer;
alter table public.profiles add column if not exists target_protein    integer;
alter table public.profiles add column if not exists target_carbs      integer;
alter table public.profiles add column if not exists target_fat        integer;
alter table public.profiles add column if not exists macros_updated_at timestamptz;


-- ---------------------------------------------------------------------------
--  4. Richer assigned plans
--     meal_plans keeps working exactly as it does now. These columns just let
--     a row remember which recipe it came from, how many servings, and which
--     day of the week it belongs to.
-- ---------------------------------------------------------------------------
alter table public.meal_plans add column if not exists recipe_id   uuid references public.recipes(id) on delete set null;
alter table public.meal_plans add column if not exists servings    numeric default 1;
alter table public.meal_plans add column if not exists day_of_week integer;  -- 0 = Monday, null = every day
alter table public.meal_plans add column if not exists sort_order  integer default 0;
alter table public.meal_plans add column if not exists notes       text;

create index if not exists meal_plans_user_day_idx on public.meal_plans (user_id, day_of_week, sort_order);


-- ---------------------------------------------------------------------------
--  5. Plans the client built and sent over for approval
--     Nothing here reaches a client's Meals tab. The coach reviews it, edits
--     it, and assigns it - that write goes to meal_plans.
-- ---------------------------------------------------------------------------
create table if not exists public.plan_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','approved','declined')),
  targets     jsonb not null default '{}'::jsonb,  -- calories + macros + the inputs behind them
  plan        jsonb not null default '{}'::jsonb,  -- the day the client was shown
  client_note text,
  coach_note  text,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists plan_requests_pending_idx on public.plan_requests (status, created_at desc);
create index if not exists plan_requests_user_idx    on public.plan_requests (user_id, created_at desc);


-- ---------------------------------------------------------------------------
--  6. Row level security
--     If your existing policies already handle coach access differently, you
--     can skip this section - it only governs the two NEW tables.
-- ---------------------------------------------------------------------------
alter table public.recipes       enable row level security;
alter table public.plan_requests enable row level security;

-- Recipes: any signed-in client can read the library. Only the coach writes.
drop policy if exists recipes_read       on public.recipes;
drop policy if exists recipes_coach_all  on public.recipes;

create policy recipes_read on public.recipes
  for select to authenticated
  using (active or public.mb_is_coach());

create policy recipes_coach_all on public.recipes
  for all to authenticated
  using (public.mb_is_coach())
  with check (public.mb_is_coach());

-- Plan requests: a client sees and creates his own. The coach sees everything.
drop policy if exists plan_requests_own_read   on public.plan_requests;
drop policy if exists plan_requests_own_insert on public.plan_requests;
drop policy if exists plan_requests_coach_all  on public.plan_requests;

create policy plan_requests_own_read on public.plan_requests
  for select to authenticated
  using (auth.uid() = user_id or public.mb_is_coach());

create policy plan_requests_own_insert on public.plan_requests
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy plan_requests_coach_all on public.plan_requests
  for all to authenticated
  using (public.mb_is_coach())
  with check (public.mb_is_coach());


-- ---------------------------------------------------------------------------
--  7. Keep updated_at honest on recipes
-- ---------------------------------------------------------------------------
create or replace function public.mb_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_touch_updated_at on public.recipes;
create trigger recipes_touch_updated_at
  before update on public.recipes
  for each row execute function public.mb_touch_updated_at();


-- ============================================================================
--  Done. The recipes table starts empty. Recipes are paid content, so they are
--  NOT stored in this repo or in the app's files. Load them by running your
--  private recipes-seed.sql backup here, or paste them in from the coach
--  dashboard: Recipes -> Add recipes. Only signed-in clients can read them.
-- ============================================================================
