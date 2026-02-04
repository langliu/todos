import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Home, AlertTriangle, Sparkles, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 relative overflow-hidden'>
      {/* 装饰性背景元素 */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        {/* 大圆形渐变 */}
        <div className='absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/10 to-secondary/5 rounded-full blur-3xl' />
        <div className='absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-secondary/10 to-primary/5 rounded-full blur-3xl' />
        
        {/* 小装饰点 */}
        <div className='absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-pulse' />
        <div className='absolute top-1/3 right-1/3 w-3 h-3 bg-secondary/20 rounded-full animate-pulse delay-300' />
        <div className='absolute bottom-1/4 left-1/3 w-2 h-2 bg-primary/25 rounded-full animate-pulse delay-500' />
      </div>

      {/* 主要内容 */}
      <div className='relative z-10 text-center space-y-8 px-4 max-w-lg mx-auto'>
        {/* 404 图标区域 */}
        <div className='flex justify-center'>
          <div className='relative'>
            {/* 外圈光晕 */}
            <div className='absolute inset-0 bg-gradient-to-br from-destructive/20 to-warning/20 rounded-full blur-2xl scale-150' />
            
            {/* 主图标容器 */}
            <div className='relative w-32 h-32 rounded-full bg-gradient-to-br from-destructive/10 via-warning/10 to-destructive/10 flex items-center justify-center border border-destructive/20 shadow-2xl'>
              <div className='text-6xl font-black bg-gradient-to-br from-destructive to-warning bg-clip-text text-transparent'>
                404
              </div>
            </div>
            
            {/* 警告图标徽章 */}
            <div className='absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-destructive flex items-center justify-center shadow-lg border-2 border-background'>
              <AlertTriangle className='w-5 h-5 text-destructive-foreground' />
            </div>
          </div>
        </div>

        {/* 文字内容 */}
        <div className='space-y-4'>
          <h1 className='text-3xl font-bold text-foreground tracking-tight'>
            页面未找到
          </h1>
          <p className='text-lg text-muted-foreground leading-relaxed max-w-md mx-auto'>
            抱歉，您访问的页面似乎不存在或已被移除。
            <br />
            <span className='text-sm text-muted-foreground/80'>
              请检查链接是否正确，或返回首页继续浏览。
            </span>
          </p>
        </div>

        {/* 操作按钮 */}
        <div className='flex flex-col sm:flex-row items-center justify-center gap-4 pt-4'>
          <Link to='/'>
            <Button 
              size='lg' 
              className='gap-2 px-8 h-12 rounded-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all shadow-lg hover:shadow-xl text-base font-semibold'
            >
              <Home className='w-5 h-5' />
              返回首页
            </Button>
          </Link>
          
          <Button 
            variant='outline' 
            size='lg'
            className='gap-2 px-6 h-12 rounded-full border-2 hover:bg-muted transition-all text-base font-medium'
            onClick={() => window.history.back()}
          >
            <ArrowLeft className='w-5 h-5' />
            返回上一页
          </Button>
        </div>

        {/* 装饰性提示 */}
        <div className='pt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground/60'>
          <Sparkles className='w-4 h-4' />
          <span>如果问题持续存在，请联系管理员</span>
        </div>
      </div>
    </div>
  )
}
