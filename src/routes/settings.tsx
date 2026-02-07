import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { updatePassword, getCurrentUser } from '@/data/auth.server'
import { ArrowLeft, CheckCircle2, Loader2, Settings, Shield, User, Check, X } from 'lucide-react'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
  loader: async () => await getCurrentUser(),
})

function SettingsPage() {
  const user = Route.useLoaderData()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const updatePasswordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: (result) => {
      if (result.error) {
        setError(result.error)
        setSuccess(false)
      } else {
        setSuccess(true)
        setError(null)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setSuccess(false), 3000)
      }
    },
  })

  const isLoading = updatePasswordMutation.isPending

  const getPasswordStrength = (password: string) => {
    if (!password) return 0
    if (password.length < 6) return 1
    if (password.length < 10) return 2
    if (password.length < 12) return 3
    return 4
  }

  const passwordStrength = getPasswordStrength(newPassword)
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600']
  const strengthLabels = ['弱', '较弱', '中等', '强', '很强']

  const isLengthValid = newPassword.length >= 6
  const isDifferent = newPassword !== currentPassword && currentPassword !== ''
  const isMatch = newPassword === confirmPassword && newPassword !== ''

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段')
      return
    }

    if (newPassword.length < 6) {
      setError('新密码至少需要6个字符')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (currentPassword === newPassword) {
      setError('新密码不能与当前密码相同')
      return
    }

    updatePasswordMutation.mutate({
      data: {
        currentPassword,
        newPassword,
      },
    })
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-background to-muted/30 p-4 md:p-8'>
      <div className='max-w-2xl mx-auto pt-4 md:pt-8'>
        <div className='flex items-center gap-4 mb-8'>
          <Link to='/'>
            <Button variant='ghost' size='icon' className='h-10 w-10 rounded-xl hover:bg-accent/50 transition-colors'>
              <ArrowLeft className='h-5 w-5' />
            </Button>
          </Link>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-elevation-2'>
              <Settings className='h-6 w-6 text-white' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-foreground tracking-tight'>设置</h1>
              <p className='text-sm text-muted-foreground'>管理您的账户设置</p>
            </div>
          </div>
        </div>

        {user && (
          <Card className='mb-6 border-2 border-border/60 shadow-elevation-2'>
            <CardContent className='p-6'>
              <div className='flex items-center gap-4'>
                <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-elevation-1'>
                  {user.email?.charAt(0).toUpperCase() || <User className='h-8 w-8' />}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm text-muted-foreground mb-1'>当前账户</p>
                  <p className='text-lg font-semibold text-foreground truncate'>{user.email}</p>
                </div>
                <div className='w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center'>
                  <Shield className='h-6 w-6 text-primary' />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className='border-2 border-border/60 shadow-elevation-2 overflow-hidden'>
          <CardHeader className='bg-gradient-to-r from-muted/50 to-transparent border-b'>
            <CardTitle className='text-xl'>修改密码</CardTitle>
            <CardDescription>为了账户安全，请定期更新您的密码</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className='p-6 space-y-6'>
              {error && (
                <div className='p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2'>
                  <X className='h-5 w-5 flex-shrink-0 mt-0.5' />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className='p-4 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2'>
                  <CheckCircle2 className='h-5 w-5 flex-shrink-0' />
                  <span>密码修改成功</span>
                </div>
              )}

              <div className='space-y-2'>
                <Label htmlFor='currentPassword' className='text-sm font-medium'>
                  当前密码
                </Label>
                <Input
                  id='currentPassword'
                  type='password'
                  placeholder='输入您的当前密码'
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete='current-password'
                  className='h-11 rounded-xl border-2 border-border bg-background focus:border-primary/50 focus:bg-background/80 transition-all'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='newPassword' className='text-sm font-medium'>
                  新密码
                </Label>
                <Input
                  id='newPassword'
                  type='password'
                  placeholder='输入新密码'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete='new-password'
                  className='h-11 rounded-xl border-2 border-border bg-background focus:border-primary/50 focus:bg-background/80 transition-all'
                />
                {newPassword && (
                  <div className='mt-3 space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs text-muted-foreground'>密码强度</span>
                      <span className={`text-xs font-medium ${passwordStrength >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {strengthLabels[passwordStrength]}
                      </span>
                    </div>
                    <div className='flex gap-1'>
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            i < passwordStrength ? strengthColors[passwordStrength] : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='confirmPassword' className='text-sm font-medium'>
                  确认新密码
                </Label>
                <Input
                  id='confirmPassword'
                  type='password'
                  placeholder='再次输入新密码'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete='new-password'
                  className='h-11 rounded-xl border-2 border-border bg-background focus:border-primary/50 focus:bg-background/80 transition-all'
                />
                {confirmPassword && (
                  <div className={`flex items-center gap-2 mt-2 text-xs ${isMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    {isMatch ? <Check className='h-3.5 w-3.5' /> : <X className='h-3.5 w-3.5' />}
                    <span>{isMatch ? '密码匹配' : '密码不匹配'}</span>
                  </div>
                )}
              </div>

              <div className='bg-muted/50 rounded-xl p-4 space-y-3 border border-border/40'>
                <p className='text-sm font-semibold text-foreground'>密码要求</p>
                <ul className='space-y-2'>
                  <li className={`flex items-center gap-2 text-xs ${isLengthValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    {isLengthValid ? <Check className='h-3.5 w-3.5 flex-shrink-0' /> : <X className='h-3.5 w-3.5 flex-shrink-0' />}
                    <span>至少 6 个字符</span>
                  </li>
                  <li className={`flex items-center gap-2 text-xs ${isDifferent ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    {isDifferent ? <Check className='h-3.5 w-3.5 flex-shrink-0' /> : <X className='h-3.5 w-3.5 flex-shrink-0' />}
                    <span>不能与当前密码相同</span>
                  </li>
                  <li className={`flex items-center gap-2 text-xs ${isMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    {isMatch ? <Check className='h-3.5 w-3.5 flex-shrink-0' /> : <X className='h-3.5 w-3.5 flex-shrink-0' />}
                    <span>两次输入的密码一致</span>
                  </li>
                </ul>
              </div>
            </CardContent>

            <CardFooter className='p-6 pt-0'>
              <Button
                type='submit'
                className='w-full h-12 rounded-xl text-base font-medium shadow-elevation-1 hover:shadow-elevation-2 transition-all'
                disabled={isLoading || !isLengthValid || !isDifferent || !isMatch}
              >
                {isLoading && <Loader2 className='mr-2 h-5 w-5 animate-spin' />}
                {isLoading ? '更新中...' : '更新密码'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
