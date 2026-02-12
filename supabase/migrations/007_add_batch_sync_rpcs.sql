create or replace function public.sync_todo_tags(p_todo_id uuid, p_tag_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owned_todo_count integer;
  v_input_count integer;
  v_allowed_count integer;
begin
  select count(*)
  into v_owned_todo_count
  from public.todos t
  where t.id = p_todo_id
    and t.user_id = auth.uid();

  if v_owned_todo_count = 0 then
    raise exception '任务不存在或无权限';
  end if;

  with input_tags as (
    select distinct unnest(coalesce(p_tag_ids, '{}'::uuid[])) as tag_id
  )
  select count(*)
  into v_input_count
  from input_tags;

  with input_tags as (
    select distinct unnest(coalesce(p_tag_ids, '{}'::uuid[])) as tag_id
  )
  select count(*)
  into v_allowed_count
  from input_tags i
  join public.tags t
    on t.id = i.tag_id
   and t.user_id = auth.uid();

  if v_allowed_count <> v_input_count then
    raise exception '标签不存在或无权限';
  end if;

  with allowed_tags as (
    select t.id as tag_id
    from public.tags t
    where t.user_id = auth.uid()
      and t.id = any(coalesce(p_tag_ids, '{}'::uuid[]))
  )
  delete from public.todo_tags tt
  where tt.todo_id = p_todo_id
    and not exists (
      select 1
      from allowed_tags at
      where at.tag_id = tt.tag_id
    );

  insert into public.todo_tags (todo_id, tag_id)
  select p_todo_id, at.tag_id
  from (
    select distinct t.id as tag_id
    from public.tags t
    where t.user_id = auth.uid()
      and t.id = any(coalesce(p_tag_ids, '{}'::uuid[]))
  ) at
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
    select p_subtask_ids[i] as id
    from generate_subscripts(p_subtask_ids, 1) as i
  )
  select count(*), count(distinct id)
  into v_input_count, v_distinct_count
  from input_rows;

  if v_distinct_count <> v_input_count then
    raise exception '子任务列表存在重复项';
  end if;

  with input_rows as (
    select p_subtask_ids[i] as id
    from generate_subscripts(p_subtask_ids, 1) as i
  )
  select count(*)
  into v_matched_count
  from input_rows ir
  join public.subtasks s
    on s.id = ir.id
   and s.todo_id = p_todo_id;

  if v_matched_count <> v_input_count then
    raise exception '子任务列表已发生变化，请刷新后重试';
  end if;

  with input_rows as (
    select p_subtask_ids[i] as id, p_orders[i] as next_order
    from generate_subscripts(p_subtask_ids, 1) as i
  )
  update public.subtasks s
  set "order" = ir.next_order
  from input_rows ir
  where s.id = ir.id
    and s.todo_id = p_todo_id;
end;
$$;

grant execute on function public.reorder_subtasks_batch(uuid, uuid[], integer[]) to authenticated;
