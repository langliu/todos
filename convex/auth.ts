import { internalMutationGeneric, internalQueryGeneric } from 'convex/server'
import { v } from 'convex/values'

const internalQuery = internalQueryGeneric
const internalMutation = internalMutationGeneric

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique()
  },
})

export const getUserById = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})

export const createUser = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique()

    if (existingUser) {
      throw new Error('邮箱已注册')
    }

    return await ctx.db.insert('users', {
      email: args.email,
      password_hash: args.passwordHash,
      created_at: now,
      updated_at: now,
    })
  },
})

export const updatePassword = internalMutation({
  args: {
    userId: v.id('users'),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('用户不存在')
    }

    await ctx.db.patch(args.userId, {
      password_hash: args.passwordHash,
      updated_at: new Date().toISOString(),
    })
  },
})

export const createSession = internalMutation({
  args: {
    userId: v.id('users'),
    tokenHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('sessions', {
      user_id: args.userId,
      token_hash: args.tokenHash,
      expires_at: args.expiresAt,
      created_at: new Date().toISOString(),
    })
  },
})

export const getSessionByTokenHash = internalQuery({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token_hash', (q) => q.eq('token_hash', args.tokenHash))
      .unique()

    if (!session) {
      return null
    }

    const user = await ctx.db.get(session.user_id)
    if (!user) {
      return null
    }

    return {
      session: {
        id: session._id,
        expires_at: session.expires_at,
      },
      user: {
        id: user._id,
        email: user.email,
        password_hash: user.password_hash,
      },
    }
  },
})

export const deleteSessionByTokenHash = internalMutation({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token_hash', (q) => q.eq('token_hash', args.tokenHash))
      .unique()

    if (session) {
      await ctx.db.delete(session._id)
    }
  },
})

export const deleteSessionById = internalMutation({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (session) {
      await ctx.db.delete(args.sessionId)
    }
  },
})

export const deleteSessionsByUserId = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_id', (q) => q.eq('user_id', args.userId))
      .collect()

    await Promise.all(sessions.map((session) => ctx.db.delete(session._id)))
  },
})
