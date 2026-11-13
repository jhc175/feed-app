import { describe, expect, it } from 'vitest'
import { MAX_LENGTH, WARN_LENGTH, countChars } from '../text'

describe('countChars', () => {
  it('按 Unicode 码点计数，emoji 只算一个字符', () => {
    expect(countChars('hello')).toBe(5)
    expect(countChars('🐣')).toBe(1)
    expect(countChars('a🐣b')).toBe(3)
  })

  it('换行与空格同样计入长度', () => {
    expect(countChars('a\nb')).toBe(3)
    expect(countChars('   ')).toBe(3)
    expect(countChars('')).toBe(0)
  })

  it('暴露与界面一致的长度阈值', () => {
    expect(MAX_LENGTH).toBe(280)
    expect(WARN_LENGTH).toBe(240)
  })
})
