import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { de, enUS } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDateLocale(lang: string) {
  return lang === 'de' ? de : enUS
}

export function formatDate(date: string | Date, lang = 'en', formatStr = 'dd.MM.yyyy') {
  return format(new Date(date), formatStr, { locale: getDateLocale(lang) })
}

export function formatDateTime(date: string | Date, lang = 'en') {
  return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: getDateLocale(lang) })
}

export function formatTimeAgo(date: string | Date, lang = 'en') {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: getDateLocale(lang),
  })
}

export function generateClientId(): string {
  const stored = localStorage.getItem('konta_client_id')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('konta_client_id', id)
  return id
}

export function getClientId(): string | null {
  return localStorage.getItem('konta_client_id')
}

export function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text)
}

export function truncate(str: string, len = 40) {
  return str.length > len ? str.slice(0, len) + '…' : str
}

// Levenshtein distance for collision detection
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}

export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen
}
