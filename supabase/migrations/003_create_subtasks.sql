create table subtasks (
  id uuid default gen_random_uuid() primary key,
  todo_id uuid references todos on delete cascade not null,
  title text not null check (char_length(title) > 0),
  completed boolean default false,
  "order" integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table subtasks enable row level security;

create trigger update_subtasks_updated_at
  before update on subtasks
  for each row
  execute function update_updated_at_column();

create policy "Users can create subtasks for their own todos"
  on subtasks for insert
  with check (
    exists (
      select 1 from todos
      where todos.id = subtasks.todo_id
      and todos.user_id = auth.uid()
    )
  );

create policy "Users can view subtasks of their own todos"
  on subtasks for select
  using (
    exists (
      select 1 from todos
      where todos.id = subtasks.todo_id
      and todos.user_id = auth.uid()
    )
  );

create policy "Users can update subtasks of their own todos"
  on subtasks for update
  using (
    exists (
      select 1 from todos
      where todos.id = subtasks.todo_id
      and todos.user_id = auth.uid()
    )
  );

create policy "Users can delete subtasks of their own todos"
  on subtasks for delete
  using (
    exists (
      select 1 from todos
      where todos.id = subtasks.todo_id
      and todos.user_id = auth.uid()
    )
  );

create index idx_subtasks_todo_id on subtasks(todo_id);
create index idx_subtasks_completed on subtasks(completed);
create index idx_subtasks_order on subtasks("order");
