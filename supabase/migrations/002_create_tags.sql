create table tags (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null check (char_length(name) > 0),
  color text not null default '#3b82f6' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, name)
);

alter table tags enable row level security;

create trigger update_tags_updated_at
  before update on tags
  for each row
  execute function update_updated_at_column();

create policy "Users can create their own tags"
  on tags for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own tags"
  on tags for select
  using (auth.uid() = user_id);

create policy "Users can update their own tags"
  on tags for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tags"
  on tags for delete
  using (auth.uid() = user_id);

create index idx_tags_user_id on tags(user_id);

create table todo_tags (
  id uuid default gen_random_uuid() primary key,
  todo_id uuid references todos on delete cascade not null,
  tag_id uuid references tags on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(todo_id, tag_id)
);

alter table todo_tags enable row level security;

create policy "Users can view todo_tags for their own todos"
  on todo_tags for select
  using (
    exists (
      select 1 from todos
      where todos.id = todo_tags.todo_id
      and todos.user_id = auth.uid()
    )
  );

create policy "Users can insert todo_tags for their own todos"
  on todo_tags for insert
  with check (
    exists (
      select 1 from todos
      where todos.id = todo_tags.todo_id
      and todos.user_id = auth.uid()
    )
  );

create policy "Users can delete todo_tags for their own todos"
  on todo_tags for delete
  using (
    exists (
      select 1 from todos
      where todos.id = todo_tags.todo_id
      and todos.user_id = auth.uid()
    )
  );

create index idx_todo_tags_todo_id on todo_tags(todo_id);
create index idx_todo_tags_tag_id on todo_tags(tag_id);
