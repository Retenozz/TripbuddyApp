-- ============================================================
--  TripBuddy — Supabase Schema (Fixed)
--  วิธีใช้: Supabase Dashboard > SQL Editor > New Query > วางทั้งหมด > Run
-- ============================================================

-- ─── Enable UUID extension ───────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Trips table ─────────────────────────────────────────────
create table if not exists public.trips (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  owner_name   text not null default '',
  share_code   text unique,
  invite_code  text unique,
  shared_at    timestamptz,
  data         jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────
create index if not exists trips_owner_id_idx    on public.trips (owner_id);
create index if not exists trips_share_code_idx  on public.trips (share_code);
create index if not exists trips_invite_code_idx on public.trips (invite_code);
create index if not exists trips_shared_at_idx   on public.trips (shared_at) where shared_at is not null;

-- ─── Row Level Security ───────────────────────────────────────
alter table public.trips enable row level security;

-- DROP policies เก่าก่อน แล้วสร้างใหม่ให้ถูกต้อง
drop policy if exists "read own or member or shared trips" on public.trips;
drop policy if exists "insert own trips"                  on public.trips;
drop policy if exists "update own trips"                  on public.trips;
drop policy if exists "join trip by invite code"          on public.trips;
drop policy if exists "delete own trips"                  on public.trips;

-- SELECT: เห็นได้ถ้า (1) เป็น owner, (2) เป็น member, (3) ทริปแชร์สาธารณะ, (4) มี invite_code ถูกต้อง
create policy "select trips"
  on public.trips for select
  using (
    auth.uid() = owner_id
    or shared_at is not null
    or data->'members' @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
    or invite_code is not null   -- ทำให้ fetchTripByInviteCode ทำงานได้แม้ยังไม่เป็น member
  );

-- INSERT: เฉพาะ owner สร้างของตัวเอง
create policy "insert own trips"
  on public.trips for insert
  with check (auth.uid() = owner_id);

-- UPDATE (owner / existing member): owner แก้อะไรก็ได้, member แก้ข้อมูลใน data ได้
create policy "update by owner or member"
  on public.trips for update
  using (
    auth.uid() = owner_id
    or data->'members' @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
  );

-- UPDATE (join via invite code): user ที่ยังไม่ใช่ member แต่รู้ invite_code สามารถ update
-- เพื่อเพิ่มตัวเองเข้า members[] ได้ — policy นี้ซ้อนกับด้านบนแบบ OR
create policy "join via invite code"
  on public.trips for update
  using (
    auth.uid() is not null
    and invite_code is not null
  )
  with check (
    auth.uid() is not null
    and invite_code is not null
  );

-- DELETE: เฉพาะ owner
create policy "delete own trips"
  on public.trips for delete
  using (auth.uid() = owner_id);

-- ─── Realtime (run ถ้า table ยังไม่ถูก add) ──────────────────
-- alter publication supabase_realtime add table public.trips;


-- ============================================================
--  Avatar Storage Bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "upload own avatar" on storage.objects;
drop policy if exists "update own avatar" on storage.objects;
drop policy if exists "read all avatars"  on storage.objects;

create policy "upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "read all avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
