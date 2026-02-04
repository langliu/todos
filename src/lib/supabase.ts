import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Todo = {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  important: boolean
  due_date: string | null
  created_at: string
  updated_at: string
}

export type CreateTodoInput = {
  title: string
  description?: string
  due_date?: string
  important?: boolean
}

export type UpdateTodoInput = Partial<Omit<Todo, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
