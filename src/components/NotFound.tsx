import { Link } from '@tanstack/react-router'
import { Home, AlertTriangle, Sparkles, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div
      className='from-background via-background to-muted/30 relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br'
      suppressHydrationWarning
    >
      {/* 装饰性背景元素 */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        {/* 大圆形渐变 */}
        <div className='from-primary/10 to-secondary/5 absolute -top-40 -right-40 h-96 w-96 rounded-full bg-linear-to-br blur-3xl' />
        <div className='from-secondary/10 to-primary/5 absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-linear-to-tr blur-3xl' />

        {/* 小装饰点 */}
        <div className='bg-primary/30 absolute top-1/4 left-1/4 h-2 w-2 animate-pulse rounded-full' />
        <div className='bg-secondary/20 absolute top-1/3 right-1/3 h-3 w-3 animate-pulse rounded-full delay-300' />
        <div className='bg-primary/25 absolute bottom-1/4 left-1/3 h-2 w-2 animate-pulse rounded-full delay-500' />
      </div>

      {/* 主要内容 */}
      <div className='relative z-10 mx-auto max-w-lg space-y-8 px-4 text-center'>
        {/* 404 图标区域 */}
        <div className='flex justify-center'>
          <div className='relative'>
            {/* 外圈光晕 */}
            <div className='from-destructive/20 to-warning/20 absolute inset-0 scale-150 rounded-full bg-linear-to-br blur-2xl' />

            {/* 主图标容器 */}
            <div className='from-destructive/10 via-warning/10 to-destructive/10 border-destructive/20 relative flex h-32 w-32 items-center justify-center rounded-full border bg-linear-to-br shadow-2xl'>
              <div className='from-destructive to-warning bg-linear-to-br bg-clip-text text-6xl font-black text-transparent'>
                404
              </div>
            </div>

            {/* 警告图标徽章 */}
            <div className='bg-destructive border-background absolute -right-2 -bottom-2 flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-lg'>
              <AlertTriangle className='text-destructive-foreground h-5 w-5' />
            </div>
          </div>
        </div>

        {/* 文字内容 */}
        <div className='space-y-4'>
          <h1 className='text-foreground text-3xl font-bold tracking-tight'>页面未找到</h1>
          <p className='text-muted-foreground mx-auto max-w-md text-lg leading-relaxed'>
            抱歉，您访问的页面似乎不存在或已被移除。
            <br />
            <span className='text-muted-foreground/80 text-sm'>
              请检查链接是否正确，或返回首页继续浏览。
            </span>
          </p>
        </div>

        {/* 操作按钮 */}
        <div className='flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row'>
          <Link
            to='/'
            className='from-primary to-secondary text-primary-foreground inline-flex h-12 items-center justify-center gap-2 rounded-full bg-linear-to-r px-8 text-base font-semibold shadow-lg transition-all hover:opacity-90 hover:shadow-xl'
          >
            <Home className='h-5 w-5' />
            返回首页
          </Link>

          <Button
            variant='outline'
            size='lg'
            className='hover:bg-muted h-12 gap-2 rounded-full border-2 px-6 text-base font-medium transition-all'
            onClick={() => typeof window !== 'undefined' && window.history.back()}
          >
            <ArrowLeft className='h-5 w-5' />
            返回上一页
          </Button>
        </div>

        {/* 装饰性提示 */}
        <div className='text-muted-foreground/60 flex items-center justify-center gap-2 pt-8 text-sm'>
          <Sparkles className='h-4 w-4' />
          <span>如果问题持续存在，请联系管理员</span>
        </div>
      </div>
    </div>
  )
}
