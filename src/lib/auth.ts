import { redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'

import { createServerSupabaseClient } from './supabase.server'

export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw redirect({ to: '/auth/login' })
  }

  return next({
    context: {
      user,
      userId: user.id,
      supabase,
    },
  })
})

export const optionalAuthMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  return next({
    context: {
      user: error ? null : user,
      userId: error ? null : (user?.id ?? null),
      supabase,
    },
  })
})
