-- ==============================================================================
-- TestHub Schema Migration: 20261123000000_add_student_profile_fields.sql
-- Add full_name and grade to profiles table with self-update RLS policy
-- ==============================================================================

-- 1. Add full_name and grade to profiles table if they don't already exist
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists grade int check (grade is null or (grade >= 8 and grade <= 12));

-- 2. Allow authenticated users to update their own profile (name, grade)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on public.profiles for update to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end;
$$;
