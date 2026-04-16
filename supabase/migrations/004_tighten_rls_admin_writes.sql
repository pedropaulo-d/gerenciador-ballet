-- ============================================
-- Migration: Restringir INSERT/UPDATE/DELETE a admins via RLS
-- ============================================
-- Contexto: as policies anteriores ("Allow all for authenticated")
-- permitiam que qualquer usuario autenticado (teacher) executasse
-- operacoes de escrita direto na API REST do Supabase, bypassando
-- as Server Actions que verificam role. Esta migration implementa
-- defesa em profundidade no banco de dados.
--
-- O app usa getServiceSupabase() (service_role) para todas as queries,
-- que bypassa RLS. Portanto, esta migration NAO afeta o funcionamento
-- do sistema — apenas bloqueia acesso direto nao autorizado.

-- Helper: verifica se o usuario logado tem role admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ============================================
-- STUDENTS
-- ============================================
drop policy if exists "Allow all for authenticated" on students;

create policy "Authenticated can read students"
  on students for select to authenticated using (true);

create policy "Admin can insert students"
  on students for insert to authenticated with check (is_admin());

create policy "Admin can update students"
  on students for update to authenticated using (is_admin());

create policy "Admin can delete students"
  on students for delete to authenticated using (is_admin());

-- ============================================
-- ENROLLMENTS
-- ============================================
drop policy if exists "Allow all for authenticated" on enrollments;

create policy "Authenticated can read enrollments"
  on enrollments for select to authenticated using (true);

create policy "Admin can insert enrollments"
  on enrollments for insert to authenticated with check (is_admin());

create policy "Admin can update enrollments"
  on enrollments for update to authenticated using (is_admin());

create policy "Admin can delete enrollments"
  on enrollments for delete to authenticated using (is_admin());

-- ============================================
-- MONTHLY_FEES
-- ============================================
drop policy if exists "Allow all for authenticated" on monthly_fees;

create policy "Authenticated can read monthly_fees"
  on monthly_fees for select to authenticated using (true);

create policy "Admin can insert monthly_fees"
  on monthly_fees for insert to authenticated with check (is_admin());

create policy "Admin can update monthly_fees"
  on monthly_fees for update to authenticated using (is_admin());

create policy "Admin can delete monthly_fees"
  on monthly_fees for delete to authenticated using (is_admin());

-- ============================================
-- ATTENDANCE
-- ============================================
-- Attendance e diferente: teachers precisam INSERT/UPDATE (chamada)
-- mas NAO precisam DELETE.
drop policy if exists "Allow all for authenticated" on attendance;

create policy "Authenticated can read attendance"
  on attendance for select to authenticated using (true);

create policy "Authenticated can insert attendance"
  on attendance for insert to authenticated with check (true);

create policy "Authenticated can update attendance"
  on attendance for update to authenticated using (true);

create policy "Admin can delete attendance"
  on attendance for delete to authenticated using (is_admin());

-- ============================================
-- LOCATIONS e CLASSES
-- ============================================
drop policy if exists "Allow all for authenticated" on locations;

create policy "Authenticated can read locations"
  on locations for select to authenticated using (true);

create policy "Admin can insert locations"
  on locations for insert to authenticated with check (is_admin());

create policy "Admin can update locations"
  on locations for update to authenticated using (is_admin());

create policy "Admin can delete locations"
  on locations for delete to authenticated using (is_admin());

drop policy if exists "Allow all for authenticated" on classes;

create policy "Authenticated can read classes"
  on classes for select to authenticated using (true);

create policy "Admin can insert classes"
  on classes for insert to authenticated with check (is_admin());

create policy "Admin can update classes"
  on classes for update to authenticated using (is_admin());

create policy "Admin can delete classes"
  on classes for delete to authenticated using (is_admin());
