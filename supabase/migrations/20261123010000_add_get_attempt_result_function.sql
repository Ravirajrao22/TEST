-- ==============================================================================
-- TestHub Schema Migration: 20261123010000_add_get_attempt_result_function.sql
-- Result visibility control & dynamic attempt result inspection
-- ==============================================================================

-- 1. Ensure default_show_result setting exists in app_settings
insert into public.app_settings (key, value)
values ('default_show_result', 'false'::jsonb)
on conflict (key) do nothing;

-- 2. Database function: get_attempt_result(attempt_id)
-- Security definer function that dynamically checks tests.show_result.
-- If show_result is false (and caller is not admin), it returns ONLY the submission status.
-- If show_result is true, it returns scorecard + question-by-question review.
create or replace function public.get_attempt_result(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_attempt record;
  v_test record;
  v_subject record;
  v_class record;
  v_is_visible boolean;
  v_questions jsonb := '[]'::jsonb;
begin
  -- 1. Caller must be signed in
  if v_student_id is null then
    raise exception 'Authentication required to view attempt result';
  end if;

  -- 2. Fetch attempt
  select a.id, a.test_id, a.student_id, a.student_name, a.class_id,
         a.total_questions, a.correct, a.wrong, a.unanswered, a.score,
         a.started_at, a.submitted_at
  into v_attempt
  from public.attempts a
  where a.id = p_attempt_id;

  if v_attempt.id is null then
    raise exception 'Attempt not found';
  end if;

  -- 3. Verify attempt belongs to signed-in student (or caller is admin)
  if v_attempt.student_id != v_student_id and not public.is_admin() then
    raise exception 'Access denied: You can only view your own attempt results';
  end if;

  -- 4. Retrieve test details & read CURRENT show_result flag
  select t.id, t.title, t.marks_per_question, t.negative_marks, t.show_result, t.subject_id
  into v_test
  from public.tests t
  where t.id = v_attempt.test_id;

  if v_test.id is null then
    raise exception 'Associated test not found';
  end if;

  -- 5. Fetch subject and class grade details
  select s.name, s.class_id into v_subject from public.subjects s where s.id = v_test.subject_id;
  select c.grade into v_class from public.classes c where c.id = v_attempt.class_id;

  -- Visibility check: true if tests.show_result is true OR caller is admin
  v_is_visible := coalesce(v_test.show_result, false);
  if public.is_admin() then
    v_is_visible := true;
  end if;

  -- 6. Case A: Results are HIDDEN from students
  -- Returns only submission status. No score, no answers, no breakdown.
  if not v_is_visible then
    return jsonb_build_object(
      'is_visible', false,
      'attempt_id', v_attempt.id,
      'test_id', v_test.id,
      'test_title', v_test.title,
      'subject_name', coalesce(v_subject.name, 'Subject'),
      'class_grade', coalesce(v_class.grade, 10),
      'student_name', v_attempt.student_name,
      'submitted_at', v_attempt.submitted_at,
      'status', 'submitted'
    );
  end if;

  -- 7. Case B: Results are VISIBLE to students
  -- Build question-by-question review: question text, student's answer, correct answer, and explanation.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'question_id', q.id,
      'position', q.position,
      'question_text', q.question_text,
      'option_a', q.option_a,
      'option_b', q.option_b,
      'option_c', q.option_c,
      'option_d', q.option_d,
      'student_selected_option', aa.selected_option,
      'correct_option', q.correct_option,
      'is_correct', coalesce(aa.is_correct, false),
      'explanation', coalesce(q.explanation, '')
    ) order by q.position asc
  ), '[]'::jsonb)
  into v_questions
  from public.questions q
  left join public.attempt_answers aa
    on aa.question_id = q.id and aa.attempt_id = v_attempt.id
  where q.test_id = v_test.id;

  return jsonb_build_object(
    'is_visible', true,
    'attempt_id', v_attempt.id,
    'test_id', v_test.id,
    'test_title', v_test.title,
    'subject_name', coalesce(v_subject.name, 'Subject'),
    'class_grade', coalesce(v_class.grade, 10),
    'student_name', v_attempt.student_name,
    'submitted_at', v_attempt.submitted_at,
    'score', v_attempt.score,
    'marks_per_question', v_test.marks_per_question,
    'negative_marks', v_test.negative_marks,
    'total_questions', v_attempt.total_questions,
    'correct', v_attempt.correct,
    'wrong', v_attempt.wrong,
    'unanswered', v_attempt.unanswered,
    'questions', v_questions
  );
end;
$$;
