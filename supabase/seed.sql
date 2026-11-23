-- ==============================================================================
-- TestHub Seed Data: supabase/seed.sql
-- ==============================================================================

-- 1. Seed Coaching Centre Admin Email (Replace owner@gmail.com with your real Gmail address)
insert into public.admin_emails (email)
values ('owner@gmail.com')
on conflict (email) do nothing;

-- 2. Seed Default App Settings
insert into public.app_settings (key, value)
values
  ('default_show_result', 'false'::jsonb)
on conflict (key) do update
set value = excluded.value;

-- 3. Seed Grades 8, 9, 10, 11, 12
insert into public.classes (grade)
values
  (8),
  (9),
  (10),
  (11),
  (12)
on conflict (grade) do nothing;

-- 4. Seed Standard School Subjects for Classes 8, 9, 10, 11, and 12
-- Class 8
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
where c.grade = 8
on conflict (class_id, name) do nothing;

-- Class 9
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
where c.grade = 9
on conflict (class_id, name) do nothing;

-- Class 10
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
where c.grade = 10
on conflict (class_id, name) do nothing;

-- Class 11
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
where c.grade = 11
on conflict (class_id, name) do nothing;

-- Class 12
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
where c.grade = 12
on conflict (class_id, name) do nothing;
