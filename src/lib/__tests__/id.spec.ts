import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from '../id'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createId', () => {
  it('优先使用 crypto.randomUUID', () => {
    const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111')
    vi.stubGlobal('crypto', { randomUUID })

    expect(createId()).toBe('11111111-1111-4111-8111-111111111111')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('缺少 randomUUID 时降级为可读前缀的随机串', () => {
    vi.stubGlobal('crypto', {})

    expect(createId()).toMatch(/^p-[0-9a-z]+-[0-9a-z]+$/)
  })

  it('连续调用不会重复', () => {
    vi.stubGlobal('crypto', {})

    const ids = new Set(Array.from({ length: 50 }, () => createId()))
    expect(ids.size).toBe(50)
  })
})
