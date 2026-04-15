-- ============================================
-- Migration: Backfill profiles para usuários existentes
-- ============================================
-- O trigger on_auth_user_created só cria profiles para NOVOS usuários.
-- Usuários criados ANTES da migration 002 não têm profile.
-- Este script preenche os profiles faltantes.

-- 1. Inserir profiles para todos os auth.users que não têm profile
INSERT INTO public.profiles (id, full_name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'full_name', ''),
  'teacher'::app_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 2. Promover o seu usuário admin (substitua pelo seu e-mail real)
-- IMPORTANTE: rode esta linha manualmente no SQL Editor do Supabase
-- substituindo 'seu@email.com' pelo e-mail da conta admin:
--
-- UPDATE public.profiles
-- SET role = 'admin', full_name = 'Karol'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'seu@email.com');
