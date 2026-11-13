import { describe, expect, it, vi } from 'vitest'
import type { Post } from '../../types/post'
import { LEGACY_STORAGE_KEY, STORAGE_KEY, loadPosts, savePosts } from '../storage'

function makePost(overrides: Partial<Post> = {}): Post {
  return { id: 'a', content: '第一条', createdAt: 1, liked: false, ...overrides }
}

describe('loadPosts', () => {
  it('没有任何数据时返回空数组', () => {
    expect(loadPosts()).toEqual([])
  })

  it('读取 v2 数据并按时间倒序', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([makePost({ id: 'old', createdAt: 1 }), makePost({ id: 'new', createdAt: 9 })])
    )

    expect(loadPosts().map((post) => post.id)).toEqual(['new', 'old'])
  })

  it('JSON 损坏时回退为空数组而不是抛错', () => {
    localStorage.setItem(STORAGE_KEY, '{oops')

    expect(loadPosts()).toEqual([])
  })

  it('丢弃结构不合法的条目', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([makePost(), { id: 1 }, null, { id: 'x', content: 'y', createdAt: 'z' }])
    )

    const posts = loadPosts()
    expect(posts).toHaveLength(1)
    expect(posts[0].id).toBe('a')
  })

  it('缺少 liked 字段时按未点赞补齐', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: 'no-like', content: '早期数据', createdAt: 3 }])
    )

    expect(loadPosts()).toEqual([{ id: 'no-like', content: '早期数据', createdAt: 3, liked: false }])
  })

  it('v1 旧数据会被迁移为 v2 并写回存储', () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify([{ id: 'legacy', content: '旧数据', createdAt: 5 }])
    )

    expect(loadPosts()).toEqual([{ id: 'legacy', content: '旧数据', createdAt: 5, liked: false }])

    const migrated = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Post[]
    expect(migrated).toHaveLength(1)
    expect(migrated[0].id).toBe('legacy')
  })

  it('v2 有数据时不再读取 v1', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makePost({ id: 'current' })]))
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([{ id: 'legacy', content: '旧', createdAt: 1 }]))

    expect(loadPosts().map((post) => post.id)).toEqual(['current'])
  })
})

describe('savePosts', () => {
  it('写入成功返回 true 且可以被读回', () => {
    expect(savePosts([makePost()])).toBe(true)
    expect(loadPosts()).toHaveLength(1)
  })

  it('写入异常（配额写满）返回 false 且不抛出', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(savePosts([makePost()])).toBe(false)
    expect(spy).toHaveBeenCalled()
  })
})
