import { createServerFn } from '@tanstack/react-start'

import { getCurrentSessionUser } from '@/lib/auth-session'
import { convexMutation, convexQuery } from '@/lib/convex'
import { hashPassword, verifyPassword } from '@/lib/password'
import {
  SESSION_MAX_AGE_SECONDS,
  clearSessionCookie,
  createSessionToken,
  getSessionToken,
  hashSessionToken,
  setSessionCookie,
} from '@/lib/session'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export const signUp = createServerFn({ method: 'POST' })
  .inputValidator((input: { email: string; password: string; emailRedirectTo?: string }) => input)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)

    const existingUser = await convexQuery<{ _id: string } | null>('auth:getUserByEmail', {
      email,
    })

    if (existingUser) {
      return { error: '该邮箱已注册', needsConfirmation: false }
    }

    const passwordHash = await hashPassword(data.password)
    const userId = await convexMutation<string>('auth:createUser', {
      email,
      passwordHash,
    })

    const token = createSessionToken()
    const tokenHash = await hashSessionToken(token)

    await convexMutation<void>('auth:createSession', {
      userId,
      tokenHash,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    })

    setSessionCookie(token)

    return { error: null, needsConfirmation: false }
  })

export const signIn = createServerFn({ method: 'POST' })
  .inputValidator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    const email = normalizeEmail(data.email)

    const user = await convexQuery<{ _id: string; password_hash: string } | null>(
      'auth:getUserByEmail',
      {
        email,
      },
    )

    if (!user) {
      return { error: '邮箱或密码错误' }
    }

    const passwordMatched = await verifyPassword(data.password, user.password_hash)
    if (!passwordMatched) {
      return { error: '邮箱或密码错误' }
    }

    const token = createSessionToken()
    const tokenHash = await hashSessionToken(token)

    await convexMutation<void>('auth:createSession', {
      userId: user._id,
      tokenHash,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    })

    setSessionCookie(token)

    return { error: null }
  })

export const signOut = createServerFn({ method: 'POST' })
  .inputValidator((_input?: unknown) => _input)
  .handler(async () => {
    const token = getSessionToken()

    if (token) {
      await convexMutation<void>('auth:deleteSessionByTokenHash', {
        tokenHash: await hashSessionToken(token),
      })
    }

    clearSessionCookie()
    return { success: true }
  })

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getCurrentSessionUser()
  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
  }
})

export const updatePassword = createServerFn({ method: 'POST' })
  .inputValidator((input: { currentPassword: string; newPassword: string }) => input)
  .handler(async ({ data }) => {
    const user = await getCurrentSessionUser()

    if (!user) {
      return { error: '用户未登录' }
    }

    if (data.currentPassword === data.newPassword) {
      return { error: '新密码不能与当前密码相同' }
    }

    const userRecord = await convexQuery<{ password_hash: string } | null>('auth:getUserById', {
      userId: user.id,
    })

    if (!userRecord) {
      return { error: '用户不存在' }
    }

    const matched = await verifyPassword(data.currentPassword, userRecord.password_hash)
    if (!matched) {
      return { error: '当前密码不正确' }
    }

    const newPasswordHash = await hashPassword(data.newPassword)
    await convexMutation<void>('auth:updatePassword', {
      userId: user.id,
      passwordHash: newPasswordHash,
    })
    await convexMutation<void>('auth:deleteSessionsByUserId', {
      userId: user.id,
    })

    const token = createSessionToken()
    const tokenHash = await hashSessionToken(token)
    await convexMutation<void>('auth:createSession', {
      userId: user.id,
      tokenHash,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    })
    setSessionCookie(token)

    return { error: null }
  })
