export type TodoAttachment = {
  storage_id: string
  name: string
  content_type: string | null
  size: number
  url: string | null
}

export type Todo = {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  important: boolean
  due_date: string | null
  reminder_minutes_before: number | null
  attachments: TodoAttachment[]
  created_at: string
  updated_at: string
}

export type CreateTodoInput = {
  title: string
  description?: string
  due_date?: string
  important?: boolean
  reminder_minutes_before?: number | null
  attachments?: Array<{
    storage_id: string
    name: string
    content_type?: string | null
    size: number
  }>
}

export type UpdateTodoInput = Partial<Omit<Todo, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export type Tag = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export type TodoTag = {
  id: string
  todo_id: string
  tag_id: string
  created_at: string
}

export type CreateTagInput = {
  name: string
  color?: string
}

export type UpdateTagInput = {
  name?: string
  color?: string
}

export type Subtask = {
  id: string
  todo_id: string
  title: string
  completed: boolean
  order: number
  created_at: string
  updated_at: string
}

export type CreateSubtaskInput = {
  title: string
  order?: number
}

export type UpdateSubtaskInput = {
  title?: string
  completed?: boolean
  order?: number
}
