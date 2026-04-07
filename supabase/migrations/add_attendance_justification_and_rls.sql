-- ============================================
-- Migration: attendance — coluna justification + RLS policies
-- Executar no Supabase SQL Editor
-- ============================================

-- 1. Adicionar coluna de justificativa
alter table attendance add column if not exists justification text;

-- 2. Habilitar RLS (caso ainda não esteja)
alter table attendance enable row level security;

-- 3. Criar policies permissivas (mesmo padrão das outras tabelas)
-- Drop first to avoid "already exists" errors
drop policy if exists "Allow all for authenticated" on attendance;
drop policy if exists "Allow all for anon" on attendance;

create policy "Allow all for authenticated" on attendance
  for all to authenticated using (true) with check (true);

create policy "Allow all for anon" on attendance
  for all to anon using (true) with check (true);
