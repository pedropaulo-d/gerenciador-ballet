-- ============================================
-- Petit Allegro Manager — Schema SQL (Supabase)
-- ============================================

-- Extensão para gerar UUIDs
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. LOCATIONS (Escolas / Creches parceiras)
-- ============================================
create table locations (
  id            uuid primary key default uuid_generate_v4(),
  name            text not null,
  address         text,
  -- Taxa de repasse fixa por aluna matriculada (em R$)
  fee_per_student numeric(10,2) not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================
-- 2. CLASSES (Turmas)
-- ============================================
create table classes (
  id           uuid primary key default uuid_generate_v4(),
  location_id  uuid not null references locations(id) on delete cascade,
  name         text not null,
  days_of_week smallint[] not null default '{}', -- array de dias: 0=Dom, 6=Sáb
  start_time   time not null,
  end_time     time not null,
  max_students smallint,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================
-- 3. STUDENTS (Alunas)
-- ============================================
create table students (
  id                uuid primary key default uuid_generate_v4(),
  full_name         text not null,
  birth_date        date,
  -- Dados do responsável
  guardian_name     text not null,
  guardian_phone    text,
  guardian_email    text,
  guardian_cpf      text,
  -- Interna (da creche) ou externa
  is_internal       boolean not null default true,
  notes             text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================
-- 4. ENROLLMENTS (Matrículas)
-- ============================================
create table enrollments (
  id              uuid primary key default uuid_generate_v4(),
  student_id      uuid not null references students(id) on delete cascade,
  class_id        uuid not null references classes(id) on delete cascade,
  status          text not null check (status in ('active', 'inactive', 'pending')) default 'pending',
  validity_type   text not null check (validity_type in ('semester', 'annual')) default 'semester',
  starts_at       date not null,
  ends_at         date not null,
  base_fee        numeric(10,2) not null, -- valor base bruto da mensalidade (Asaas cuida de descontos/juros)
  due_day         smallint not null default 5 check (due_day in (5, 7)), -- dia de vencimento: 5 ou 7
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Impede duplicata de matrícula ativa na mesma turma
  unique (student_id, class_id, starts_at)
);

-- ============================================
-- 5. MONTHLY_FEES (Mensalidades)
-- ============================================
create table monthly_fees (
  id                uuid primary key default uuid_generate_v4(),
  enrollment_id     uuid not null references enrollments(id) on delete cascade,
  reference_month   date not null, -- sempre dia 1 do mês (ex: 2026-03-01)
  gross_amount      numeric(10,2) not null,
  asaas_fee         numeric(10,2) not null default 0,
  location_fee      numeric(10,2) not null default 0,
  net_amount        numeric(10,2) generated always as (gross_amount - asaas_fee - location_fee) stored,
  status            text not null check (status in ('pending', 'paid', 'overdue', 'cancelled')) default 'pending',
  paid_at           timestamptz,
  asaas_payment_id  text, -- ID externo do Asaas para reconciliação
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (enrollment_id, reference_month)
);

-- ============================================
-- 6. ATTENDANCE (Chamada / Frequência)
-- ============================================
create table attendance (
  id              uuid primary key default uuid_generate_v4(),
  enrollment_id   uuid not null references enrollments(id) on delete cascade,
  date            date not null,
  status          text not null check (status in ('present', 'absent', 'justified')) default 'present',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (enrollment_id, date)
);

-- ============================================
-- Trigger genérico para atualizar updated_at
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_locations_updated_at
  before update on locations for each row execute function update_updated_at();

create trigger trg_classes_updated_at
  before update on classes for each row execute function update_updated_at();

create trigger trg_students_updated_at
  before update on students for each row execute function update_updated_at();

create trigger trg_enrollments_updated_at
  before update on enrollments for each row execute function update_updated_at();

create trigger trg_monthly_fees_updated_at
  before update on monthly_fees for each row execute function update_updated_at();

create trigger trg_attendance_updated_at
  before update on attendance for each row execute function update_updated_at();

-- ============================================
-- Índices úteis para consultas frequentes
-- ============================================
create index idx_classes_location    on classes(location_id);
create index idx_enrollments_student on enrollments(student_id);
create index idx_enrollments_class   on enrollments(class_id);
create index idx_enrollments_status  on enrollments(status);
create index idx_monthly_fees_enrollment on monthly_fees(enrollment_id);
create index idx_monthly_fees_month  on monthly_fees(reference_month);
create index idx_monthly_fees_status on monthly_fees(status);
create index idx_attendance_enrollment on attendance(enrollment_id);
create index idx_attendance_date       on attendance(date);

-- Índices GIN (pg_trgm) para busca textual parcial (ILIKE) na search bar
create extension if not exists pg_trgm;

create index idx_students_full_name_trgm     on students using gin (full_name     gin_trgm_ops);
create index idx_students_guardian_name_trgm  on students using gin (guardian_name  gin_trgm_ops);
create index idx_students_guardian_phone_trgm on students using gin (guardian_phone gin_trgm_ops);
create index idx_students_guardian_cpf_trgm   on students using gin (guardian_cpf   gin_trgm_ops);

-- ============================================
-- Row Level Security (placeholder — habilitar após configurar auth)
-- ============================================
alter table locations    enable row level security;
alter table classes      enable row level security;
alter table students     enable row level security;
alter table enrollments  enable row level security;
alter table monthly_fees enable row level security;
alter table attendance   enable row level security;

-- Políticas permissivas temporárias (substitua por regras reais depois)
create policy "Allow all for authenticated" on locations    for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on classes      for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on students     for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on enrollments  for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on monthly_fees for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on attendance   for all to authenticated using (true) with check (true);

-- Políticas temporárias para anon (até configurar Auth)
create policy "Allow all for anon" on locations    for all to anon using (true) with check (true);
create policy "Allow all for anon" on classes      for all to anon using (true) with check (true);
create policy "Allow all for anon" on students     for all to anon using (true) with check (true);
create policy "Allow all for anon" on enrollments  for all to anon using (true) with check (true);
create policy "Allow all for anon" on monthly_fees for all to anon using (true) with check (true);
create policy "Allow all for anon" on attendance   for all to anon using (true) with check (true);
