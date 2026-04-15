-- ============================================
-- Migration: Profiles + RBAC (V2 Auth)
-- ============================================

-- Enum para roles da aplicação
create type app_role as enum ('admin', 'teacher');

-- Tabela profiles estendendo auth.users
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  role       app_role not null default 'teacher',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger updated_at (reutiliza função existente)
create trigger trg_profiles_updated_at
  before update on profiles for each row execute function update_updated_at();

-- Cria profile automaticamente ao inserir usuário no auth.users
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'teacher'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS
alter table profiles enable row level security;

create policy "Users can read own profile" on profiles
  for select to authenticated using (id = auth.uid());

create policy "Admin can read all profiles" on profiles
  for select to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admin can update profiles" on profiles
  for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
