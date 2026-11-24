-- ==============================================================================
-- TestHub: One-Click Fix for Admin Role, Classes, and Subjects
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/mbeylconhvuodhaaaljs/sql
-- ==============================================================================

-- 1. Fix is_admin() by fully qualifying public.profiles.id (resolves "id is ambiguous")
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where public.profiles.id = auth.uid() and public.profiles.role = 'admin'
  ) or exists (
    select 1 from public.admin_emails
    where public.admin_emails.email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

-- 2. Grant Admin Privileges to the Coaching Center Owner
insert into public.admin_emails (email)
values ('ravikumarraj0408@gmail.com')
on conflict (email) do nothing;

update public.profiles
set role = 'admin'
where public.profiles.email = 'ravikumarraj0408@gmail.com';

-- 3. Seed All Classes (Grades 8, 9, 10, 11, 12)
insert into public.classes (grade)
values
  (8),
  (9),
  (10),
  (11),
  (12)
on conflict (grade) do nothing;

-- 4. Seed Standard Subjects for Classes 8, 9, 10
insert into public.subjects (class_id, name)
select classes.id, sub.name
from public.classes
cross join (values
  ('Mathematics'),
  ('Science'),
  ('English'),
  ('Social Science'),
  ('Hindi')
) as sub(name)
where public.classes.grade in (8, 9, 10)
on conflict (class_id, name) do nothing;

-- 5. Seed Standard Subjects for Classes 11 and 12
insert into public.subjects (class_id, name)
select classes.id, sub.name
from public.classes
cross join (values
  ('Physics'),
  ('Chemistry'),
  ('Mathematics'),
  ('Biology'),
  ('English')
) as sub(name)
where public.classes.grade in (11, 12)
on conflict (class_id, name) do nothing;
