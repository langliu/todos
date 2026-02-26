import { convexMutation, convexQuery } from '@/lib/convex'
import { clearSessionCookie, getSessionToken, hashSessionToken } from '@/lib/session'

export type AuthUser = {
  id: string
  email: string
}

type SessionQueryResult = {
  session: {
    id: string
    expires_at: number
  }
  user: {
    id: string
    email: string
    password_hash: string
  }
} | null

export async function getCurrentSessionUser(): Promise<AuthUser | null> {
  const sessionToken = getSessionToken()
  if (!sessionToken) {
    return null
  }

  const tokenHash = await hashSessionToken(sessionToken)
  const sessionResult = await convexQuery<SessionQueryResult>('auth:getSessionByTokenHash', {
    tokenHash,
  })

  if (!sessionResult) {
    clearSessionCookie()
    return null
  }

  if (sessionResult.session.expires_at <= Date.now()) {
    await convexMutation<void>('auth:deleteSessionById', {
      sessionId: sessionResult.session.id,
    })
    clearSessionCookie()
    return null
  }

  return {
    id: sessionResult.user.id,
    email: sessionResult.user.email,
  }
}
