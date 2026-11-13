import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from '../../lib/storage'
import { usePostsStore } from '../posts'

function readStorage() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('add', () => {
  it('发布成功后进入列表首位并写入存储', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const store = usePostsStore()

    const result = store.add('  第一条短文  ')

    expect(result.ok).toBe(true)
    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]).toMatchObject({ content: '第一条短文', createdAt: 1_000, liked: false })
    expect(store.lastAddedId).toBe(store.posts[0].id)
    expect(readStorage()).toHaveLength(1)
  })

  it('后发布的内容排在前面', () => {
    const store = usePostsStore()
    vi.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(2_000)

    store.add('先发的')
    store.add('后发的')

    expect(store.posts.map((post) => post.content)).toEqual(['后发的', '先发的'])
    expect(store.sortedPosts[0].content).toBe('后发的')
  })

  it('空内容与纯空格被拒绝，且不写入存储', () => {
    const store = usePostsStore()

    expect(store.add('')).toEqual({ ok: false, reason: 'empty' })
    expect(store.add('   \n  ')).toEqual({ ok: false, reason: 'empty' })
    expect(store.posts).toHaveLength(0)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('超过 280 字被拒绝', () => {
    const store = usePostsStore()

    expect(store.add('字'.repeat(281))).toEqual({ ok: false, reason: 'too-long' })
    expect(store.add('字'.repeat(280)).ok).toBe(true)
    expect(store.posts).toHaveLength(1)
  })

  it('存储写入失败时回滚内存状态', () => {
    const store = usePostsStore()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(store.add('写不进去的内容')).toEqual({ ok: false, reason: 'storage' })
    expect(store.posts).toHaveLength(0)
    expect(store.lastAddedId).toBeNull()
  })
})

describe('remove', () => {
  it('删除存在的帖子并同步存储', () => {
    const store = usePostsStore()
    store.add('待删除')
    const id = store.posts[0].id

    expect(store.remove(id)).toBe(true)
    expect(store.posts).toHaveLength(0)
    expect(readStorage()).toEqual([])
  })

  it('删除不存在的 id 返回 false', () => {
    const store = usePostsStore()
    store.add('保留')

    expect(store.remove('not-exist')).toBe(false)
    expect(store.posts).toHaveLength(1)
  })

  it('存储写入失败时保留原数据', () => {
    const store = usePostsStore()
    store.add('保留')
    const id = store.posts[0].id
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(store.remove(id)).toBe(false)
    expect(store.posts).toHaveLength(1)
  })
})

describe('toggleLike', () => {
  it('切换点赞状态并持久化', () => {
    const store = usePostsStore()
    store.add('值得点赞')
    const id = store.posts[0].id

    expect(store.toggleLike(id)).toBe(true)
    expect(store.posts[0].liked).toBe(true)
    expect(readStorage()[0].liked).toBe(true)

    expect(store.toggleLike(id)).toBe(true)
    expect(store.posts[0].liked).toBe(false)
  })

  it('点赞状态可以重新加载回来', () => {
    const store = usePostsStore()
    store.add('值得点赞')
    store.toggleLike(store.posts[0].id)

    setActivePinia(createPinia())
    const reloaded = usePostsStore()
    reloaded.load()

    expect(reloaded.posts[0].liked).toBe(true)
  })

  it('未知 id 返回 false 且不改动存储', () => {
    const store = usePostsStore()
    store.add('保留')

    expect(store.toggleLike('not-exist')).toBe(false)
    expect(readStorage()[0].liked).toBe(false)
  })

  it('存储写入失败时不改变界面状态', () => {
    const store = usePostsStore()
    store.add('保留')
    const id = store.posts[0].id
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(store.toggleLike(id)).toBe(false)
    expect(store.posts[0].liked).toBe(false)
  })
})

describe('load', () => {
  it('读取并按时间倒序暴露', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'a', content: '旧', createdAt: 1, liked: false },
        { id: 'b', content: '新', createdAt: 5, liked: true }
      ])
    )
    const store = usePostsStore()

    store.load()

    expect(store.total).toBe(2)
    expect(store.sortedPosts.map((post) => post.id)).toEqual(['b', 'a'])
  })

  it('迁移 v1 旧数据并补齐点赞字段', () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify([{ id: 'legacy', content: '上一版本的内容', createdAt: 3 }])
    )
    const store = usePostsStore()

    store.load()

    expect(store.posts).toEqual([
      { id: 'legacy', content: '上一版本的内容', createdAt: 3, liked: false }
    ])
    expect(readStorage()[0].id).toBe('legacy')
  })

  it('没有数据时是干净的空状态', () => {
    const store = usePostsStore()

    store.load()

    expect(store.posts).toEqual([])
    expect(store.total).toBe(0)
    expect(store.lastAddedId).toBeNull()
  })
})
