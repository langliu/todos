import { redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'

import { getCurrentSessionUser } from '@/lib/auth-session'

export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const user = await getCurrentSessionUser()

  if (!user) {
    throw redirect({ to: '/auth/login' })
  }

  return next({
    context: {
      user,
      userId: user.id,
    },
  })
})

export const optionalAuthMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  const user = await getCurrentSessionUser()

  return next({
    context: {
      user,
      userId: user?.id ?? null,
    },
  })
})
