create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  concerns text[] not null default '{}',
  skin_types text[] not null default '{}',
  product_type text not null,
  routine_step text not null check (routine_step in ('morning', 'evening', 'both')),
  step_order integer not null,
  affiliate_url text not null,
  image_url text,
  price_eur numeric(10, 2)
);

create table if not exists diagnostics (
  id uuid primary key default gen_random_uuid(),
  session_token uuid not null unique,
  skin_type text not null,
  concerns text[] not null default '{}',
  top_priority text not null,
  paid boolean not null default false,
  stripe_session_id text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid not null references diagnostics(id) on delete cascade,
  morning_product_ids uuid[] not null default '{}',
  evening_product_ids uuid[] not null default '{}',
  ai_explanation text not null,
  created_at timestamptz not null default now()
);

create index if not exists products_concerns_idx on products using gin (concerns);
create index if not exists products_skin_types_idx on products using gin (skin_types);
create index if not exists diagnostics_session_token_idx on diagnostics (session_token);
create index if not exists diagnostics_paid_idx on diagnostics (paid);
create index if not exists routines_diagnostic_id_idx on routines (diagnostic_id);
