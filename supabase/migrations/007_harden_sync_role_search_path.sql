-- ============================================
-- Migration 007: Harden sync_profile_role_to_jwt search_path
-- ============================================
-- A funcao definida em 006_sync_role_to_jwt.sql usa apenas
-- `set search_path = public`, divergindo do padrao endurecido em
-- 005 (`public, pg_temp`). Sem `pg_temp`, um usuario malicioso
-- com permissao de criar objetos temporarios em pg_temp poderia,
-- em teoria, sequestrar resolucao de nomes em SECURITY DEFINER.
--
-- No Supabase managed o vetor e residual (apenas o owner consegue
-- criar pg_temp objects relevantes), mas a consistencia com 005
-- elimina o ruido do linter `function_search_path_mutable`.
--
-- Idempotente: ALTER FUNCTION ... SET so ajusta a propriedade.

alter function public.sync_profile_role_to_jwt() set search_path = public, pg_temp;
