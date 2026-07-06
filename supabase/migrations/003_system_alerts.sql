-- Allow the daily health check to log alerts into the feedback list.
alter table public.arjuna_feedback
  drop constraint if exists arjuna_feedback_submitted_by_check;

alter table public.arjuna_feedback
  add constraint arjuna_feedback_submitted_by_check
  check (submitted_by in ('mother', 'father', 'system'));
