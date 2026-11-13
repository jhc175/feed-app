import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from '../time'

const NOW = new Date(2026, 10, 13, 10, 0, 0).getTime()
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('formatRelativeTime', () => {
  it('一分钟以内显示「刚刚」', () => {
    expect(formatRelativeTime(NOW - 30 * 1000, NOW)).toBe('刚刚')
    expect(formatRelativeTime(NOW, NOW)).toBe('刚刚')
  })

  it('按分钟 / 小时 / 天分级', () => {
    expect(formatRelativeTime(NOW - 5 * MINUTE, NOW)).toBe('5 分钟前')
    expect(formatRelativeTime(NOW - 3 * HOUR, NOW)).toBe('3 小时前')
    expect(formatRelativeTime(NOW - 2 * DAY, NOW)).toBe('2 天前')
  })

  it('临界值落在上一级', () => {
    expect(formatRelativeTime(NOW - 59 * MINUTE, NOW)).toBe('59 分钟前')
    expect(formatRelativeTime(NOW - 23 * HOUR, NOW)).toBe('23 小时前')
    expect(formatRelativeTime(NOW - 6 * DAY, NOW)).toBe('6 天前')
  })

  it('七天及以上显示 YYYY-MM-DD', () => {
    expect(formatRelativeTime(new Date(2026, 10, 1, 8, 30, 0).getTime(), NOW)).toBe('2026-11-01')
    expect(formatRelativeTime(new Date(2026, 0, 5, 23, 59, 0).getTime(), NOW)).toBe('2026-01-05')
  })

  it('未来时间按「刚刚」处理，非法时间不抛错', () => {
    expect(formatRelativeTime(NOW + 5 * MINUTE, NOW)).toBe('刚刚')
    expect(formatRelativeTime(Number.NaN, NOW)).toBe('刚刚')
  })
})
