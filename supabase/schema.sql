-- Annies fjärilar — Supabase setup
-- Kör i Supabase SQL Editor. Bucketnamn: fjarilsbilder

create extension if not exists "pgcrypto";

create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  butterfly_id text not null,
  image_path text not null,
  note text,
  story text,
  location jsonb,
  spotted_at date default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_butterflies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  app_id text,
  swedish_name text not null,
  scientific_name text not null,
  description text not null,
  image_1_path text not null,
  image_2_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Om tabellen redan hann skapas med en äldre variant lägger detta till app_id.
alter table public.custom_butterflies add column if not exists app_id text;

-- Idempotent skydd om schema.sql körs mot en äldre testdatabas.
-- Nya tomma projekt får kolumnerna direkt via create table ovan.
alter table public.sightings add column if not exists location jsonb;
alter table public.sightings add column if not exists story text;

create unique index if not exists custom_butterflies_user_app_id_idx
on public.custom_butterflies (user_id, app_id)
where app_id is not null;

alter table public.sightings enable row level security;
alter table public.custom_butterflies enable row level security;

-- Eftersom "Automatically expose new tables" är avstängt ger vi bara authenticated-rollen explicit åtkomst.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.sightings to authenticated;
grant select, insert, update, delete on public.custom_butterflies to authenticated;


-- RLS för samlingsposter
drop policy if exists "sightings_select_own" on public.sightings;
drop policy if exists "sightings_insert_own" on public.sightings;
drop policy if exists "sightings_update_own" on public.sightings;
drop policy if exists "sightings_delete_own" on public.sightings;

create policy "sightings_select_own"
on public.sightings
for select
to authenticated
using (user_id = auth.uid());

create policy "sightings_insert_own"
on public.sightings
for insert
to authenticated
with check (user_id = auth.uid());

create policy "sightings_update_own"
on public.sightings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "sightings_delete_own"
on public.sightings
for delete
to authenticated
using (user_id = auth.uid());

-- RLS för egna fjärilar
drop policy if exists "custom_butterflies_select_own" on public.custom_butterflies;
drop policy if exists "custom_butterflies_insert_own" on public.custom_butterflies;
drop policy if exists "custom_butterflies_update_own" on public.custom_butterflies;
drop policy if exists "custom_butterflies_delete_own" on public.custom_butterflies;

create policy "custom_butterflies_select_own"
on public.custom_butterflies
for select
to authenticated
using (user_id = auth.uid());

create policy "custom_butterflies_insert_own"
on public.custom_butterflies
for insert
to authenticated
with check (user_id = auth.uid());

create policy "custom_butterflies_update_own"
on public.custom_butterflies
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "custom_butterflies_delete_own"
on public.custom_butterflies
for delete
to authenticated
using (user_id = auth.uid());

-- Storage policies för privat bucket fjarilsbilder.
-- Filer ska ligga under användarens egen mapp:
-- <auth.uid()>/sightings/... eller <auth.uid()>/custom-butterflies/...
drop policy if exists "storage_select_own_folder" on storage.objects;
drop policy if exists "storage_insert_own_folder" on storage.objects;
drop policy if exists "storage_update_own_folder" on storage.objects;
drop policy if exists "storage_delete_own_folder" on storage.objects;

create policy "storage_select_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'fjarilsbilder'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'fjarilsbilder'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'fjarilsbilder'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'fjarilsbilder'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'fjarilsbilder'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Version 1.5.44 — kanonisk fjärilskatalog
-- Både grundarter och egna arter kan ligga i public.butterflies.
-- data/butterflies.json finns kvar som offline/bootstrap-fallback i frontend.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.butterflies (
  id text primary key,
  app_id text not null default 'annies-fjarilar',
  swedish_name text not null,
  scientific_name text,
  description text,
  tags text[] not null default '{}',
  images jsonb not null default '[]'::jsonb,
  commons_category_url text,
  sort_order integer,
  is_custom boolean not null default false,
  deleted_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists butterflies_app_sort_idx
on public.butterflies (app_id, sort_order);

create index if not exists butterflies_app_deleted_idx
on public.butterflies (app_id, deleted_at);

create index if not exists butterflies_is_custom_idx
on public.butterflies (is_custom);

drop trigger if exists set_butterflies_updated_at on public.butterflies;
create trigger set_butterflies_updated_at
before update on public.butterflies
for each row
execute function public.set_updated_at();

drop trigger if exists set_sightings_updated_at on public.sightings;
create trigger set_sightings_updated_at
before update on public.sightings
for each row
execute function public.set_updated_at();

drop trigger if exists set_custom_butterflies_updated_at on public.custom_butterflies;
create trigger set_custom_butterflies_updated_at
before update on public.custom_butterflies
for each row
execute function public.set_updated_at();

alter table public.butterflies enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.butterflies to authenticated;

drop policy if exists "butterflies_select_authenticated" on public.butterflies;
create policy "butterflies_select_authenticated"
on public.butterflies
for select
to authenticated
using (true);

drop policy if exists "butterflies_insert_authenticated" on public.butterflies;
create policy "butterflies_insert_authenticated"
on public.butterflies
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "butterflies_update_authenticated" on public.butterflies;
create policy "butterflies_update_authenticated"
on public.butterflies
for update
to authenticated
using (true)
with check (auth.uid() is not null);

drop policy if exists "butterflies_delete_authenticated" on public.butterflies;
create policy "butterflies_delete_authenticated"
on public.butterflies
for delete
to authenticated
using (true);

-- Legacy-skydd: om det redan råkar finnas egna arter i custom_butterflies
-- flyttas de in i nya katalogen utan att originaltabellen tas bort.
insert into public.butterflies (
  id,
  app_id,
  swedish_name,
  scientific_name,
  description,
  tags,
  images,
  is_custom,
  created_by,
  created_at,
  updated_at
)
select
  coalesce(nullif(app_id, ''), 'custom-' || id::text),
  'annies-fjarilar',
  swedish_name,
  scientific_name,
  description,
  '{}'::text[],
  jsonb_strip_nulls(
    jsonb_build_array(
      jsonb_build_object('path', image_1_path, 'imagePath', image_1_path, 'author', 'Egen bild', 'license', 'Privat'),
      case
        when image_2_path is not null and image_2_path <> ''
        then jsonb_build_object('path', image_2_path, 'imagePath', image_2_path, 'author', 'Egen bild', 'license', 'Privat')
        else null
      end
    )
  ),
  true,
  user_id,
  created_at,
  updated_at
from public.custom_butterflies
on conflict (id) do nothing;
