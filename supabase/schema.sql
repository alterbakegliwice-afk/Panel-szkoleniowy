-- Alterbake — schemat backendu (Supabase / PostgreSQL).
-- Uruchom w panelu Supabase → SQL Editor. Region projektu: UE (Frankfurt) — dane osobowe (RODO).
--
-- Zasada: model 1:1 z lokalnym stanem aplikacji. Logi są append-only; regułę
-- „ostatni po dacie wygrywa" liczy aplikacja (progress.js) — baza tylko przechowuje wiersze.
-- Dzięki temu dane z wielu urządzeń po prostu się SUMUJĄ, bez konfliktów.

-- ------------------------------------------------------------------ tabele

-- Profil łączy zalogowanego użytkownika (auth.users) z pracownikiem i rolą.
create table if not exists profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  id_prac text not null,
  rola text not null default 'Pracownik',
  is_owner boolean not null default false,
  is_mentor boolean not null default false,
  utworzono timestamptz not null default now()
);

create table if not exists pracownicy (
  id_prac text primary key,
  imie text not null,
  rola text,
  data_startu date,
  poziom_docelowy text,
  pin text default ''
);

create table if not exists wyniki (
  id bigint generated always as identity primary key,
  data timestamptz not null default now(),
  id_prac text not null,
  id_pytania text not null,
  zaliczyl boolean not null,
  oceniajacy text default '',
  notatka text default ''
);

create table if not exists nauka (
  id bigint generated always as identity primary key,
  id_prac text not null,
  obszar text not null,
  data timestamptz not null default now()
);

create table if not exists praktyka (
  id bigint generated always as identity primary key,
  id_prac text not null,
  tom text not null,
  potwierdzil boolean not null,
  data timestamptz not null default now(),
  oceniajacy text default '',
  notatka text default ''
);

create table if not exists przypisania (
  id bigint generated always as identity primary key,
  id_prac text not null,
  tom text not null,
  termin date,
  utworzono timestamptz not null default now(),
  przez text default '',
  usuniete boolean not null default false
);

create table if not exists kolejka (
  id text primary key,
  data timestamptz not null default now(),
  id_prac text not null,
  id_pytania text not null,
  typ text,
  odpowiedz text
);

create table if not exists zatwierdzone (
  tom text primary key
);

-- Ustawienia „bieżące" (nie-log): progi, PIN, bank. Edytuje tylko właściciel. Jeden wiersz.
create table if not exists ustawienia (
  id int primary key default 1 check (id = 1),
  konfig jsonb not null default '{}'::jsonb,
  bank jsonb,               -- null = seed wbudowany w aplikację
  aktualizacja timestamptz not null default now()
);
insert into ustawienia (id) values (1) on conflict do nothing;

-- ------------------------------------------------------------------ pomocnicy

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profile where user_id = auth.uid() and is_owner);
$$;

create or replace function is_staff() returns boolean  -- właściciel lub mentor
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profile where user_id = auth.uid() and (is_owner or is_mentor));
$$;

create or replace function moje_id_prac() returns text
language sql stable security definer set search_path = public as $$
  select id_prac from profile where user_id = auth.uid();
$$;

-- ------------------------------------------------------------------ RLS
-- Właściciel/mentor: pełny wgląd w zespół. Pracownik: czyta listy wspólne,
-- dopisuje i czyta WYŁĄCZNIE własne wpisy w logach nauki/wyników.

alter table profile      enable row level security;
alter table pracownicy   enable row level security;
alter table wyniki       enable row level security;
alter table nauka        enable row level security;
alter table praktyka     enable row level security;
alter table przypisania  enable row level security;
alter table kolejka      enable row level security;
alter table zatwierdzone enable row level security;
alter table ustawienia   enable row level security;

-- profile: użytkownik widzi swój; personel wszystkie; zapis tylko właściciel.
create policy profile_read on profile for select using (user_id = auth.uid() or is_staff());
create policy profile_write on profile for all using (is_owner()) with check (is_owner());

-- pracownicy (lista): wszyscy zalogowani czytają; pisze właściciel.
create policy prac_read on pracownicy for select using (auth.uid() is not null);
create policy prac_write on pracownicy for all using (is_owner()) with check (is_owner());

-- wyniki: personel wszystko; pracownik czyta+dopisuje własne.
create policy wyniki_staff on wyniki for all using (is_staff()) with check (is_staff());
create policy wyniki_self_sel on wyniki for select using (id_prac = moje_id_prac());
create policy wyniki_self_ins on wyniki for insert with check (id_prac = moje_id_prac());

-- nauka: jak wyniki.
create policy nauka_staff on nauka for all using (is_staff()) with check (is_staff());
create policy nauka_self_sel on nauka for select using (id_prac = moje_id_prac());
create policy nauka_self_ins on nauka for insert with check (id_prac = moje_id_prac());

-- kolejka (odpowiedzi do oceny): pracownik dopisuje/czyta własne, personel wszystko.
create policy kolejka_staff on kolejka for all using (is_staff()) with check (is_staff());
create policy kolejka_self_sel on kolejka for select using (id_prac = moje_id_prac());
create policy kolejka_self_ins on kolejka for insert with check (id_prac = moje_id_prac());

-- praktyka: potwierdza personel (mentor/właściciel); pracownik tylko czyta swoje.
create policy praktyka_staff on praktyka for all using (is_staff()) with check (is_staff());
create policy praktyka_self_sel on praktyka for select using (id_prac = moje_id_prac());

-- przypisania: nadaje personel; pracownik czyta swoje.
create policy przyp_staff on przypisania for all using (is_staff()) with check (is_staff());
create policy przyp_self_sel on przypisania for select using (id_prac = moje_id_prac());

-- zatwierdzone tomy i ustawienia: czytają wszyscy zalogowani, pisze właściciel.
create policy zatw_read on zatwierdzone for select using (auth.uid() is not null);
create policy zatw_write on zatwierdzone for all using (is_owner()) with check (is_owner());
create policy ust_read on ustawienia for select using (auth.uid() is not null);
create policy ust_write on ustawienia for all using (is_owner()) with check (is_owner());

-- ------------------------------------------------------------------ realtime (opcjonalnie)
-- Żywy widok „Zespół": włącz replikację dla tabel logów.
-- alter publication supabase_realtime add table wyniki, nauka, praktyka, przypisania;
