create index if not exists idx_subtasks_completed_todo_id
  on subtasks(todo_id)
  where completed = true;
