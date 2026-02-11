create or replace function public.get_completed_subtask_counts(p_todo_ids uuid[])
returns table (
  todo_id uuid,
  completed_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.todo_id,
    count(*)::bigint as completed_count
  from public.subtasks s
  where s.completed = true
    and s.todo_id = any(p_todo_ids)
  group by s.todo_id
$$;

grant execute on function public.get_completed_subtask_counts(uuid[]) to authenticated;
