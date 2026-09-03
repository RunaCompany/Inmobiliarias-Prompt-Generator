create extension if not exists pgcrypto;

create table if not exists public.prompt_builder_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null default gen_random_uuid(),
  participant_id uuid not null,
  session_slug text not null check (session_slug ~ '^[a-z0-9][a-z0-9-]{0,47}$'),
  progress_step smallint not null default 1 check (progress_step between 1 and 5),
  website_type text,
  company_name text,
  location text,
  specialty text,
  target_audience text,
  differentiator text,
  brand_tone text,
  visual_style text,
  style_intensity text,
  brand_color text,
  contact_channel text,
  contact_name text,
  email text,
  whatsapp text,
  whatsapp_consent boolean not null default false,
  contact_consent boolean not null default false,
  starter_pack_requested boolean not null default false,
  prompt_version smallint not null default 2,
  builder_data jsonb not null default '{}'::jsonb,
  generated_prompt text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_slug, participant_id, submission_id),
  check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$'),
  check (whatsapp is null or contact_consent = true)
);

-- Migración idempotente para instalaciones creadas con la primera versión.
alter table public.prompt_builder_submissions add column if not exists submission_id uuid;
update public.prompt_builder_submissions set submission_id = id where submission_id is null;
alter table public.prompt_builder_submissions alter column submission_id set default gen_random_uuid();
alter table public.prompt_builder_submissions alter column submission_id set not null;

alter table public.prompt_builder_submissions add column if not exists visual_style text;
alter table public.prompt_builder_submissions add column if not exists style_intensity text;
alter table public.prompt_builder_submissions add column if not exists brand_color text;
alter table public.prompt_builder_submissions add column if not exists email text;
alter table public.prompt_builder_submissions add column if not exists contact_consent boolean not null default false;
alter table public.prompt_builder_submissions add column if not exists starter_pack_requested boolean not null default false;
alter table public.prompt_builder_submissions add column if not exists prompt_version smallint not null default 2;
alter table public.prompt_builder_submissions add column if not exists builder_data jsonb not null default '{}'::jsonb;

alter table public.prompt_builder_submissions
  drop constraint if exists prompt_builder_submissions_session_slug_participant_id_key;

alter table public.prompt_builder_submissions
  drop constraint if exists prompt_builder_submissions_progress_step_check;

alter table public.prompt_builder_submissions
  add constraint prompt_builder_submissions_progress_step_check
  check (progress_step between 1 and 5);

create unique index if not exists prompt_builder_submissions_page_key
  on public.prompt_builder_submissions (session_slug, participant_id, submission_id);

create index if not exists prompt_builder_submissions_session_created_idx
  on public.prompt_builder_submissions (session_slug, created_at desc);

alter table public.prompt_builder_submissions enable row level security;

-- No public policies are intentional. The browser writes through the validated
-- server route; only the server-side service role can read or modify this table.
revoke all on public.prompt_builder_submissions from anon, authenticated;

comment on table public.prompt_builder_submissions is
  'Respuestas y prompts generados por participantes del Prompt Builder de Runna.';
