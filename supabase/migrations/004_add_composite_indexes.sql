create index if not exists idx_todos_user_important_created_at
  on todos(user_id, important desc, created_at desc);

create index if not exists idx_tags_user_name
  on tags(user_id, name);

create index if not exists idx_subtasks_todo_order
  on subtasks(todo_id, "order");
