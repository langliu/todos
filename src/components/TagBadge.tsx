import type { Tag } from '@/lib/supabase'

interface TagBadgeProps {
  tag: Tag
  onRemove?: () => void
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <div
      className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105'
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      <span className='max-w-[120px] truncate'>{tag.name}</span>
      {onRemove && (
        <button
          type='button'
          onClick={onRemove}
          className='hover:bg-black/10 rounded p-0.5 transition-colors'
        >
          <svg
            className='w-3 h-3'
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
