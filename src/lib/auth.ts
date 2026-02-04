import { createMiddleware } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { createServerSupabaseClient, getServerUser } from './supabase.server'

export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const user = await getServerUser()

    if (!user) {
      throw redirect({ to: '/auth/login' })
    }

    return next({
      context: {
        user,
        userId: user.id,
        supabase: createServerSupabaseClient(),
      },
    })
  }
)

export const optionalAuthMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  const user = await getServerUser()
  const supabase = createServerSupabaseClient()

  return next({
    context: {
      user,
      userId: user?.id ?? null,
      supabase,
    },
  })
})
