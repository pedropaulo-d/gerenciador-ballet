-- ============================================
-- Migration 005: Harden SECURITY DEFINER functions
-- ============================================
-- Fixa o search_path das funcoes SECURITY DEFINER para prevenir
-- privilege escalation via shadowing de nomes em schemas de
-- maior precedencia (ex: um "public.profiles" criado por um
-- usuario malicioso em outro schema na frente de "public").
--
-- Referencia: Supabase linter "function_search_path_mutable".
--
-- Idempotente: ALTER FUNCTION ... SET apenas ajusta a propriedade.

alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.is_admin() set search_path = public, pg_temp;
