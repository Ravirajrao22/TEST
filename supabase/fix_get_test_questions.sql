-- ==============================================================================
-- TestHub: Complete Fix for Foreign Key attempts_student_id_fkey & Test Submission
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/mbeylconhvuodhaaaljs/sql
-- ==============================================================================

-- 1. Backfill all existing users from auth.users into public.profiles
insert into public.profiles (id, email, role, full_name, created_at)
select
  u.id,
  u.email,
  case
    when exists (select 1 from public.admin_emails ae where ae.email = lower(trim(u.email))) then 'admin'
    else 'student'
  end as role,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Student') as full_name,
  now()
from auth.users u
on conflict (id) do update
set email = excluded.email,
    role = case
      when exists (select 1 from public.admin_emails ae where ae.email = lower(trim(excluded.email))) then 'admin'
      else profiles.role
    end;

-- 2. Fix get_test_questions() so "id" is never ambiguous
create or replace function public.get_test_questions(p_test_id uuid)
returns table (
  id uuid,
  test_id uuid,
  "position" int,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not exists (
    select 1 from public.tests as t
    where t.id = p_test_id and (t.is_published = true or public.is_admin())
  ) then
    raise exception 'Test is not available or not published';
  end if;

  return query
  select
    q.id,
    q.test_id,
    q."position",
    q.question_text,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d
  from public.questions as q
  where q.test_id = p_test_id
  order by q."position" asc;
end;
$$;

grant execute on function public.get_test_questions(uuid) to authenticated, anon;

-- 3. Fix submit_attempt() with automatic profile creation to prevent foreign key errors
create or replace function public.submit_attempt(
  p_test_id uuid,
  p_student_name text,
  p_class_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_student_id uuid := auth.uid();
  v_test record;
  v_q record;
  v_selected char(1);
  v_raw_val text;
  v_is_correct boolean;
  v_total_questions int := 0;
  v_correct int := 0;
  v_wrong int := 0;
  v_unanswered int := 0;
  v_score numeric := 0;
  v_attempt_id uuid;
begin
  if v_student_id is null then
    raise exception 'Authentication required to submit test';
  end if;

  -- Ensure student profile exists in public.profiles to satisfy attempts_student_id_fkey
  if not exists (select 1 from public.profiles p where p.id = v_student_id) then
    insert into public.profiles (id, email, role, full_name, created_at)
    values (
      v_student_id,
      coalesce(auth.jwt() ->> 'email', 'student@coaching.com'),
      'student',
      trim(p_student_name),
      now()
    )
    on conflict (id) do nothing;
  end if;

  select t.id, t.marks_per_question, t.negative_marks, t.show_result, t.is_published
  into v_test
  from public.tests t
  where t.id = p_test_id;

  if v_test.id is null then
    raise exception 'Test not found';
  end if;

  if not v_test.is_published and not public.is_admin() then
    raise exception 'Test is not published and cannot be submitted';
  end if;

  if not exists (select 1 from public.classes c where c.id = p_class_id) then
    raise exception 'Invalid class level';
  end if;

  if exists (
    select 1 from public.attempts a
    where a.test_id = p_test_id and a.student_id = v_student_id
  ) then
    raise exception 'You have already submitted an attempt for this test';
  end if;

  insert into public.attempts (
    test_id,
    student_id,
    student_name,
    class_id,
    total_questions,
    correct,
    wrong,
    unanswered,
    score,
    started_at,
    submitted_at
  ) values (
    p_test_id,
    v_student_id,
    trim(p_student_name),
    p_class_id,
    0, 0, 0, 0, 0,
    now(),
    now()
  ) returning id into v_attempt_id;

  for v_q in
    select q.id, q.correct_option
    from public.questions q
    where q.test_id = p_test_id
    order by q."position" asc
  loop
    v_total_questions := v_total_questions + 1;

    if jsonb_typeof(p_answers) = 'object' then
      v_raw_val := p_answers->>v_q.id::text;
    else
      select elem->>'selected_option'
      into v_raw_val
      from jsonb_array_elements(p_answers) elem
      where elem->>'question_id' = v_q.id::text;
    end if;

    v_selected := upper(trim(v_raw_val));

    if v_selected is null or v_selected = '' or v_selected not in ('A', 'B', 'C', 'D') then
      v_selected := null;
      v_unanswered := v_unanswered + 1;
      v_is_correct := false;
    elsif v_selected = v_q.correct_option then
      v_correct := v_correct + 1;
      v_score := v_score + coalesce(v_test.marks_per_question, 1);
      v_is_correct := true;
    else
      v_wrong := v_wrong + 1;
      v_score := v_score - coalesce(v_test.negative_marks, 0);
      v_is_correct := false;
    end if;

    insert into public.attempt_answers (
      attempt_id,
      question_id,
      selected_option,
      is_correct
    ) values (
      v_attempt_id,
      v_q.id,
      v_selected,
      v_is_correct
    );
  end loop;

  update public.attempts
  set total_questions = v_total_questions,
      correct = v_correct,
      wrong = v_wrong,
      unanswered = v_unanswered,
      score = v_score
  where attempts.id = v_attempt_id;

  if v_test.show_result = true then
    return jsonb_build_object(
      'success', true,
      'show_result', true,
      'attempt_id', v_attempt_id,
      'score', v_score,
      'total_questions', v_total_questions,
      'correct', v_correct,
      'wrong', v_wrong,
      'unanswered', v_unanswered
    );
  else
    return jsonb_build_object(
      'success', true,
      'show_result', false,
      'attempt_id', v_attempt_id
    );
  end if;
end;
$$;

grant execute on function public.submit_attempt(uuid, text, uuid, jsonb) to authenticated, anon;
