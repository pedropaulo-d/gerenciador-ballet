-- ============================================
-- Remove políticas permissivas para anon
-- Mantém apenas acesso para usuários autenticados
-- ============================================

-- 1. Revogar políticas anon (acesso público) — CRÍTICO
drop policy if exists "Allow all for anon" on locations;
drop policy if exists "Allow all for anon" on classes;
drop policy if exists "Allow all for anon" on students;
drop policy if exists "Allow all for anon" on enrollments;
drop policy if exists "Allow all for anon" on monthly_fees;
drop policy if exists "Allow all for anon" on attendance;

-- 2. Política específica para o service_role do webhook Asaas
-- O webhook usa a service_role key (server-side), que bypassa RLS por padrão.
-- Nenhuma policy adicional necessária para o webhook.

-- 3. (Opcional) Se quiser restringir por user_id no futuro, adicione
-- uma coluna owner_id e refine as policies de authenticated.
-- Por enquanto, qualquer usuário autenticado tem acesso total,
-- o que é adequado para um app single-tenant (uma escola).
