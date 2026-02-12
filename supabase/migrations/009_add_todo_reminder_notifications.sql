alter table public.todos
  add column if not exists reminder_minutes_before integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'todos_reminder_non_negative'
      and conrelid = 'public.todos'::regclass
  ) then
    alter table public.todos
      add constraint todos_reminder_non_negative
      check (reminder_minutes_before is null or reminder_minutes_before >= 0);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'todos_reminder_requires_due_date'
      and conrelid = 'public.todos'::regclass
  ) then
    alter table public.todos
      add constraint todos_reminder_requires_due_date
      check (reminder_minutes_before is null or due_date is not null);
  end if;
end;
$$;

create or replace function public.get_due_todo_reminders(p_lookback_seconds integer default 300)
returns table (
  id uuid,
  title text,
  due_date timestamp with time zone,
  reminder_minutes_before integer,
  remind_at timestamp with time zone
)
language sql
security invoker
set search_path = public
as $$
  select
    t.id,
    t.title,
    t.due_date,
    t.reminder_minutes_before,
    t.due_date - make_interval(mins => t.reminder_minutes_before) as remind_at
  from public.todos t
  where t.user_id = (select auth.uid())
    and t.completed = false
    and t.due_date is not null
    and t.reminder_minutes_before is not null
    and t.reminder_minutes_before >= 0
    and t.due_date - make_interval(mins => t.reminder_minutes_before) <= now()
    and t.due_date - make_interval(mins => t.reminder_minutes_before) >
      now() - make_interval(secs => greatest(p_lookback_seconds, 0))
  order by remind_at desc;
$$;

grant execute on function public.get_due_todo_reminders(integer) to authenticated;

create index if not exists idx_todos_active_due_reminder
  on public.todos(user_id, due_date)
  where completed = false
    and due_date is not null
    and reminder_minutes_before is not null;
