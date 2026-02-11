import { createServerFn } from '@tanstack/react-start'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase.server'

export const signUp = createServerFn({ method: 'POST' })
  .inputValidator((input: { email: string; password: string; emailRedirectTo?: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createServerSupabaseClient()

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: data.emailRedirectTo,
      },
    })

    if (error) {
      return { error: error.message }
    }

    if (authData.user && !authData.session) {
      return { error: null, needsConfirmation: true }
    }

    return { error: null, needsConfirmation: false }
  })

export const signIn = createServerFn({ method: 'POST' })
  .inputValidator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  })

export const signOut = createServerFn({ method: 'POST' })
  .inputValidator((_input?: unknown) => _input)
  .handler(async () => {
    const supabase = createServerSupabaseClient()
    await supabase.auth.signOut()
    return { success: true }
  })

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await getServerUser()
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
    const supabase = createServerSupabaseClient()
    const user = await getServerUser()

    if (!user || !user.email) {
      return { error: '用户未登录' }
    }

    if (data.currentPassword === data.newPassword) {
      return { error: '新密码不能与当前密码相同' }
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: data.currentPassword,
    })

    if (verifyError) {
      return { error: '当前密码不正确' }
    }

    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  })
