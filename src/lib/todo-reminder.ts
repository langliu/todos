export type TodoReminderOption = {
  value: number | null
  label: string
}

export const TODO_REMINDER_OPTIONS: TodoReminderOption[] = [
  { value: null, label: '不提醒' },
  { value: 0, label: '到期时' },
  { value: 10, label: '10 分钟前' },
  { value: 30, label: '30 分钟前' },
  { value: 60, label: '1 小时前' },
  { value: 120, label: '2 小时前' },
  { value: 1440, label: '1 天前' },
]

export function formatReminderLabel(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) {
    return '不提醒'
  }
  if (minutes === 0) {
    return '到期时'
  }
  if (minutes < 60) {
    return `${minutes} 分钟前`
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} 小时前`
  }
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  return `${hours} 小时 ${remainMinutes} 分钟前`
}

export function formatReminderDescription(
  dueDate: string,
  reminderMinutesBefore: number | null | undefined,
): string {
  const label = formatReminderLabel(reminderMinutesBefore)
  const dueTime = new Date(dueDate).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${label}提醒，截止时间 ${dueTime}`
}
