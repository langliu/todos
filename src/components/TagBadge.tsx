import type { Tag } from '@/lib/supabase'

interface TagBadgeProps {
  tag: Tag
  onRemove?: () => void
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <div
      className='inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5'
      style={{
        backgroundColor: `${tag.color}18`,
        color: tag.color,
        borderColor: `${tag.color}4d`,
      }}
    >
      <span className='max-w-[120px] truncate'>{tag.name}</span>
      {onRemove && (
        <button
          type='button'
          onClick={onRemove}
          className='rounded p-0.5 transition-colors hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none'
        >
          <svg
            className='h-3 w-3'
            fill='none'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path d='M6 18L18 6M6 6l12 12' />
          </svg>
        </button>
      )}
    </div>
  )
}
