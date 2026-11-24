-- ==============================================================================
-- TestHub: One-Click Fix for Admin Role, Classes, and Subjects
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/mbeylconhvuodhaaaljs/sql
-- ==============================================================================

-- 1. Grant Admin Privileges to the Coaching Center Owner
insert into public.admin_emails (email)
values ('ravikumarraj0408@gmail.com')
on conflict (email) do nothing;

update public.profiles
set role = 'admin'
where email = 'ravikumarraj0408@gmail.com';

-- 2. Seed All Classes (Grades 8, 9, 10, 11, 12)
insert into public.classes (grade)
values
  (8),
  (9),
  (10),
  (11),
  (12)
on conflict (grade) do nothing;

-- 3. Seed Standard Subjects for Classes 8, 9, 10
insert into public.subjects (class_id, name)
select c.id, s.name
from public.classes c
cross join (values
  ('Mathematics'),
  ('Science'),
  ('English'),
  ('Social Science'),
  ('Hindi')
) as s(name)
where c.grade in (8, 9, 10)
on conflict (class_id, name) do nothing;

-- 4. Seed Standard Subjects for Classes 11 and 12
insert into public.subjects (class_id, name)
select c.id, s.name
from public.classes c
cross join (values
  ('Physics'),
  ('Chemistry'),
  ('Mathematics'),
  ('Biology'),
  ('English')
) as s(name)
where c.grade in (11, 12)
on conflict (class_id, name) do nothing;
