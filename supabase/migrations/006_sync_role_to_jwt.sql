-- Etapa 2: replicar profiles.role em auth.users.raw_app_meta_data
-- para que o claim `app_metadata.role` apareca no JWT e elimine
-- o SELECT em profiles no hot-path de autenticacao.
--
-- Escolha: raw_app_meta_data (NAO raw_user_meta_data).
-- Motivo: user_metadata e editavel pelo proprio usuario via
-- auth.updateUser(); app_metadata so pelo service_role.

create or replace function public.sync_profile_role_to_jwt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
     set raw_app_meta_data =
           coalesce(raw_app_meta_data, '{}'::jsonb)
           || jsonb_build_object('role', new.role)
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_profile_role_to_jwt on public.profiles;

create trigger sync_profile_role_to_jwt
after insert or update of role on public.profiles
for each row
execute function public.sync_profile_role_to_jwt();

-- Backfill: perfis existentes ganham o claim imediatamente.
-- Tokens ja emitidos so recebem no proximo refresh (~1h) -
-- por isso o codigo tem fallback para ler da tabela profiles.
update auth.users u
   set raw_app_meta_data =
         coalesce(u.raw_app_meta_data, '{}'::jsonb)
         || jsonb_build_object('role', p.role)
  from public.profiles p
 where u.id = p.id;
