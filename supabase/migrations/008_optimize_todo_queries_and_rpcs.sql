create or replace function public.sync_todo_tags(p_todo_id uuid, p_tag_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tag_ids uuid[];
  v_input_count integer;
  v_allowed_count integer;
begin
  if not exists (
    select 1
    from public.todos t
    where t.id = p_todo_id
      and t.user_id = (select auth.uid())
  ) then
    raise exception '任务不存在或无权限';
  end if;

  select coalesce(array_agg(distinct input.tag_id), '{}'::uuid[])
  into v_tag_ids
  from unnest(coalesce(p_tag_ids, '{}'::uuid[])) as input(tag_id);

  v_input_count := coalesce(array_length(v_tag_ids, 1), 0);

  if v_input_count > 0 then
    select count(*)
    into v_allowed_count
    from public.tags t
    where t.user_id = (select auth.uid())
      and t.id = any(v_tag_ids);

    if v_allowed_count <> v_input_count then
      raise exception '标签不存在或无权限';
    end if;
  end if;

  delete from public.todo_tags tt
  where tt.todo_id = p_todo_id
    and not (tt.tag_id = any(v_tag_ids));

  insert into public.todo_tags (todo_id, tag_id)
  select p_todo_id, input.tag_id
  from unnest(v_tag_ids) as input(tag_id)
  on conflict (todo_id, tag_id) do nothing;
end;
$$;

grant execute on function public.sync_todo_tags(uuid, uuid[]) to authenticated;

create or replace function public.reorder_subtasks_batch(
  p_todo_id uuid,
  p_subtask_ids uuid[],
  p_orders integer[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_input_count integer;
  v_distinct_count integer;
  v_matched_count integer;
begin
  if coalesce(array_length(p_subtask_ids, 1), 0) = 0 then
    return;
  end if;

  if array_length(p_subtask_ids, 1) <> array_length(p_orders, 1) then
    raise exception '子任务排序参数不合法';
  end if;

  with input_rows as (
    select unnest(p_subtask_ids) as id
  )
  select count(*), count(distinct ir.id), count(s.id)
  into v_input_count, v_distinct_count, v_matched_count
  from input_rows ir
  left join public.subtasks s
    on s.id = ir.id
   and s.todo_id = p_todo_id;

  if v_distinct_count <> v_input_count then
    raise exception '子任务列表存在重复项';
  end if;

  if v_matched_count <> v_input_count then
    raise exception '子任务列表已发生变化，请刷新后重试';
  end if;

  with input_rows as (
    select ir.id, ir.next_order
    from unnest(p_subtask_ids, p_orders) as ir(id, next_order)
  )
  update public.subtasks s
  set "order" = ir.next_order
  from input_rows ir
  where s.id = ir.id
    and s.todo_id = p_todo_id;
end;
$$;

grant execute on function public.reorder_subtasks_batch(uuid, uuid[], integer[]) to authenticated;

create or replace function public.get_todo_list_counts()
returns table (
  my_day integer,
  important integer,
  planned integer,
  tasks integer
)
language sql
security invoker
set search_path = public
as $$
  select
    count(*) filter (where t.completed = false)::integer as my_day,
    count(*) filter (where t.completed = false and t.important = true)::integer as important,
    count(*) filter (where t.completed = false and t.due_date is not null)::integer as planned,
    count(*) filter (where t.completed = false)::integer as tasks
  from public.todos t
  where t.user_id = (select auth.uid());
$$;

grant execute on function public.get_todo_list_counts() to authenticated;

create index if not exists idx_todo_tags_tag_id_todo_id
  on public.todo_tags(tag_id, todo_id);

create index if not exists idx_todos_user_active_important_created_at
  on public.todos(user_id, important desc, created_at desc)
  where completed = false;

create index if not exists idx_todos_user_active_due_date
  on public.todos(user_id, due_date)
  where completed = false and due_date is not null;
