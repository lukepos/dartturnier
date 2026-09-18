-- =====================================================================
--  Hartefelder Hobby-Dartturnier — Supabase-Setup
--  Einmal komplett im SQL-Editor von Supabase ausführen.
--  Vorher unten bei "DEIN-PIN" die gewünschte PIN eintragen.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Die Turnierdaten. Drei Zeilen: meta, team, einzel.
--    payload ist der komplette Zustand als JSON,
--    rev ist der Zeitstempel des schreibenden Geräts in Millisekunden.
-- ---------------------------------------------------------------------
create table if not exists public.tournament_docs (
  id          text primary key,
  payload     jsonb       not null default '{}'::jsonb,
  rev         bigint      not null default 0,
  device      text,
  updated_at  timestamptz not null default now()
);

alter table public.tournament_docs enable row level security;

-- Lesen darf jeder, der die Seite öffnet (Anzeigebildschirm, Zuschauer).
drop policy if exists "tournament_docs_read" on public.tournament_docs;
create policy "tournament_docs_read"
  on public.tournament_docs for select
  to anon, authenticated
  using (true);

-- Schreiben gibt es bewusst KEINE Policy: direkte Writes sind gesperrt.
-- Geschrieben wird ausschließlich über save_doc() weiter unten.

-- ---------------------------------------------------------------------
-- 2. Die PIN der Turnierleitung — liegt nur als bcrypt-Hash hier.
--    Ohne Policy ist die Tabelle mit dem öffentlichen Key unlesbar.
-- ---------------------------------------------------------------------
create table if not exists public.tournament_secret (
  id       int primary key default 1,
  pin_hash text not null
);

alter table public.tournament_secret enable row level security;

-- >>> HIER DIE PIN EINTRAGEN <<<
insert into public.tournament_secret (id, pin_hash)
values (1, crypt('DEIN-PIN', gen_salt('bf')))
on conflict (id) do update set pin_hash = excluded.pin_hash;

-- ---------------------------------------------------------------------
-- 3. PIN prüfen — für die Anmeldung in der App.
-- ---------------------------------------------------------------------
create or replace function public.check_pin(p_pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select pin_hash = crypt(p_pin, pin_hash)
       from public.tournament_secret where id = 1),
    false);
$$;

-- ---------------------------------------------------------------------
-- 4. Speichern. Prüft die PIN und verwirft ältere Stände automatisch
--    (rev ist der Zeitstempel des Absenders, höher gewinnt).
-- ---------------------------------------------------------------------
create or replace function public.save_doc(
  p_id      text,
  p_payload jsonb,
  p_rev     bigint,
  p_device  text,
  p_pin     text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rev bigint;
begin
  if p_id not in ('meta', 'team', 'einzel') then
    raise exception 'unknown_doc';
  end if;

  if not public.check_pin(p_pin) then
    raise exception 'invalid_pin';
  end if;

  insert into public.tournament_docs (id, payload, rev, device, updated_at)
  values (p_id, p_payload, p_rev, p_device, now())
  on conflict (id) do update
     set payload    = excluded.payload,
         rev        = excluded.rev,
         device     = excluded.device,
         updated_at = now()
   where public.tournament_docs.rev < excluded.rev;

  select rev into v_rev from public.tournament_docs where id = p_id;
  return v_rev;
end;
$$;

revoke all on function public.check_pin(text) from public;
revoke all on function public.save_doc(text, jsonb, bigint, text, text) from public;
grant execute on function public.check_pin(text) to anon, authenticated;
grant execute on function public.save_doc(text, jsonb, bigint, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Realtime einschalten, damit der Anzeigebildschirm sofort nachzieht.
-- ---------------------------------------------------------------------
alter table public.tournament_docs replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.tournament_docs;
exception
  when duplicate_object then null;
end
$$;
