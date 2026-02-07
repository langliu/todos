import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X } from 'lucide-react'
import type { Tag } from '@/lib/supabase'

interface TagSelectorProps {
  tags: Tag[]
  selectedTagIds: string[]
  onToggleTag: (tagId: string) => void
  onCreateTag: (name: string, color: string) => void
}

const PRESET_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

export function TagSelector({ tags, selectedTagIds, onToggleTag, onCreateTag }: TagSelectorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])

  const handleCreateTag = () => {
    if (!newTagName.trim()) return
    onCreateTag(newTagName.trim(), selectedColor)
    setNewTagName('')
    setSelectedColor(PRESET_COLORS[0])
    setIsCreating(false)
  }

  const handleCancelCreate = () => {
    setNewTagName('')
    setSelectedColor(PRESET_COLORS[0])
    setIsCreating(false)
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">标签</Label>

      {isCreating && (
        <div className="p-4 rounded-2xl bg-muted/50 border border-border/60 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="标签名称"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateTag()
                } else if (e.key === 'Escape') {
                  handleCancelCreate()
                }
              }}
              className="flex-1 h-10 rounded-xl text-sm"
              autoFocus
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleCancelCreate}
              className="h-10 w-10 flex-shrink-0 rounded-xl"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">选择颜色</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-ring scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={handleCreateTag}
            disabled={!newTagName.trim()}
            className="w-full h-10 rounded-xl"
          >
            创建标签
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggleTag(tag.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105 ${
                isSelected
                  ? 'ring-2 ring-offset-1 ring-ring'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`,
              }}
            >
              <span className="max-w-[120px] truncate">{tag.name}</span>
              {isSelected && (
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {!isCreating && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsCreating(true)}
          className="w-full h-10 rounded-xl border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          创建新标签
        </Button>
      )}
    </div>
  )
}
