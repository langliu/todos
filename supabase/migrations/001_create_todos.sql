create table todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null check (char_length(title) > 0),
  description text,
  completed boolean default false,
  important boolean default false,
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table todos enable row level security;

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_todos_updated_at
  before update on todos
  for each row
  execute function update_updated_at_column();

create policy "Users can create their own todos"
  on todos for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own todos"
  on todos for select
  using (auth.uid() = user_id);

create policy "Users can update their own todos"
  on todos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own todos"
  on todos for delete
  using (auth.uid() = user_id);

create index idx_todos_user_id on todos(user_id);
create index idx_todos_completed on todos(completed);
create index idx_todos_important on todos(important);
create index idx_todos_due_date on todos(due_date);
