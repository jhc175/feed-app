const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/**
 * 相对时间：刚刚 / x 分钟前 / x 小时前 / x 天前 / YYYY-MM-DD。
 * 未来时间与非法时间都退化为「刚刚」，保证界面不出现奇怪文案。
 */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = now - timestamp
  if (!Number.isFinite(diff) || diff < 0) return '刚刚'
  if (diff < MINUTE) return '刚刚'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`
  if (diff < WEEK) return `${Math.floor(diff / DAY)} 天前`

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}
