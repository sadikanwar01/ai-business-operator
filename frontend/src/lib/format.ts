export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatTime(value?: string | null) {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${formatDate(value)} · ${formatTime(value)}`
}

export function relativeTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export function initials(name?: string | null) {
  if (!name) return '—'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function pluralise(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}

export function percent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`
}

export function scoreTone(score: number): 'critical' | 'caution' | 'accent' | 'indigo' {
  if (score >= 90) return 'accent'
  if (score >= 80) return 'indigo'
  if (score >= 70) return 'caution'
  return 'critical'
}

export function tierTone(tier?: string | null): 'accent' | 'indigo' | 'caution' | 'neutral' {
  switch (tier) {
    case 'Very High':
      return 'accent'
    case 'High':
      return 'indigo'
    case 'Medium':
      return 'caution'
    default:
      return 'neutral'
  }
}
