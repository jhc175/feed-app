import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPostStore } from '../store'
import type { PostStore } from '../store'

let store: PostStore

beforeEach(() => {
  store = createPostStore()
})

describe('createPostStore.list', () => {
  it('空 store 返回空数组', () => {
    expect(store.list()).toEqual([])
  })

  it('按 createdAt 倒序返回', () => {
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(3_000)
      .mockReturnValueOnce(2_000)

    const first = store.create('第一条')
    const second = store.create('第二条')
    const third = store.create('第三条')

    expect(store.list().map((post) => post.id)).toEqual([second.id, third.id, first.id])
  })

  it('createdAt 相同时后插入的排在前面', () => {
    vi.spyOn(Date, 'now').mockReturnValue(5_000)

    const first = store.create('先插入')
    const second = store.create('后插入')

    expect(store.list().map((post) => post.id)).toEqual([second.id, first.id])
  })

  it('返回新数组与新对象，外部改动不影响内部数据', () => {
    store.create('原内容')

    const snapshot = store.list()
    snapshot.push({ id: 'hacked', content: '外部插入', createdAt: 0, liked: false })
    snapshot[0].content = '被篡改'
    snapshot[0].liked = true

    const fresh = store.list()
    expect(fresh).not.toBe(snapshot)
    expect(fresh).toHaveLength(1)
    expect(fresh[0].content).toBe('原内容')
    expect(fresh[0].liked).toBe(false)
    expect(fresh[0]).not.toBe(snapshot[0])
  })
})

describe('createPostStore.create', () => {
  it('生成 id、createdAt、初始未点赞，并保留传入内容', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_234)

    const post = store.create('你好 chirp')

    expect(typeof post.id).toBe('string')
    expect(post.id.length).toBeGreaterThan(0)
    expect(post.createdAt).toBe(1_234)
    expect(post.liked).toBe(false)
    expect(post.content).toBe('你好 chirp')
  })

  it('每条生成的 id 都不同', () => {
    const a = store.create('a')
    const b = store.create('b')

    expect(a.id).not.toBe(b.id)
  })
})

describe('createPostStore.find', () => {
  it('命中时返回对应的 post', () => {
    const created = store.create('可查到')

    expect(store.find(created.id)).toMatchObject({ id: created.id, content: '可查到' })
  })

  it('返回的是副本，改动它不会污染内部数据', () => {
    const created = store.create('不可篡改')
    const found = store.find(created.id)

    if (found) found.liked = true

    expect(store.find(created.id)?.liked).toBe(false)
  })

  it('未命中时返回 undefined', () => {
    expect(store.find('missing')).toBeUndefined()
  })
})

describe('createPostStore.setLiked', () => {
  it('命中时更新并返回新对象', () => {
    const created = store.create('要点赞')
    const snapshot = store.list()[0]

    const updated = store.setLiked(created.id, true)

    expect(updated).not.toBe(snapshot)
    expect(updated?.liked).toBe(true)
    expect(store.find(created.id)?.liked).toBe(true)
  })

  it('可以改回 false', () => {
    const created = store.create('取消点赞')
    store.setLiked(created.id, true)

    expect(store.setLiked(created.id, false)?.liked).toBe(false)
  })

  it('未命中时返回 undefined', () => {
    expect(store.setLiked('missing', true)).toBeUndefined()
  })
})

describe('createPostStore.remove', () => {
  it('命中时返回 true 并从列表中消失', () => {
    const created = store.create('待删除')

    expect(store.remove(created.id)).toBe(true)
    expect(store.list()).toEqual([])
  })

  it('未命中时返回 false', () => {
    expect(store.remove('missing')).toBe(false)
  })
})

describe('createPostStore.reset', () => {
  it('清空所有数据', () => {
    store.create('a')
    store.create('b')

    store.reset()

    expect(store.list()).toEqual([])
  })
})
