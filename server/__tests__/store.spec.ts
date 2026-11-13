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
    snapshot[0].content = '被篡改'
    snapshot[0].liked = true
    snapshot[0].bookmarked = true
    snapshot[0].repostCount = 99

    const fresh = store.list()
    expect(fresh).not.toBe(snapshot)
    expect(fresh).toHaveLength(1)
    expect(fresh[0].content).toBe('原内容')
    expect(fresh[0].liked).toBe(false)
    expect(fresh[0].bookmarked).toBe(false)
    expect(fresh[0].repostCount).toBe(0)
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

  it('新帖的收藏、转发快照与转发计数都是初始值', () => {
    const post = store.create('原创')

    expect(post.bookmarked).toBe(false)
    expect(post.repostOf).toBeNull()
    expect(post.repostCount).toBe(0)
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

describe('createPostStore.setFlags', () => {
  it('只改 liked 时不影响 bookmarked', () => {
    const created = store.create('只点赞')

    const updated = store.setFlags(created.id, { liked: true })

    expect(updated?.liked).toBe(true)
    expect(updated?.bookmarked).toBe(false)
    expect(store.find(created.id)?.liked).toBe(true)
  })

  it('只改 bookmarked 时不影响 liked', () => {
    const created = store.create('只收藏')

    const updated = store.setFlags(created.id, { bookmarked: true })

    expect(updated?.bookmarked).toBe(true)
    expect(updated?.liked).toBe(false)
    expect(store.find(created.id)?.bookmarked).toBe(true)
  })

  it('同时改 liked 与 bookmarked', () => {
    const created = store.create('同时改')

    const updated = store.setFlags(created.id, { liked: true, bookmarked: true })

    expect(updated).toMatchObject({ liked: true, bookmarked: true })
    expect(store.find(created.id)).toMatchObject({ liked: true, bookmarked: true })
  })

  it('可以改回 false', () => {
    const created = store.create('取消')
    store.setFlags(created.id, { liked: true, bookmarked: true })

    const updated = store.setFlags(created.id, { liked: false, bookmarked: false })

    expect(updated).toMatchObject({ liked: false, bookmarked: false })
  })

  it('返回新对象，不影响已有副本', () => {
    const created = store.create('副本')
    const snapshot = store.list()[0]

    const updated = store.setFlags(created.id, { liked: true })

    expect(updated).not.toBe(snapshot)
    expect(snapshot.liked).toBe(false)
  })

  it('未命中时返回 undefined', () => {
    expect(store.setFlags('missing', { liked: true })).toBeUndefined()
  })
})

describe('createPostStore.listBookmarked', () => {
  it('只返回已收藏的帖子', () => {
    const first = store.create('收藏一')
    const second = store.create('未收藏')
    const third = store.create('收藏二')

    store.setFlags(first.id, { bookmarked: true })
    store.setFlags(third.id, { bookmarked: true })

    expect(store.listBookmarked().map((post) => post.id)).toEqual([third.id, first.id])
    expect(store.listBookmarked().some((post) => post.id === second.id)).toBe(false)
  })

  it('保持 createdAt 倒序', () => {
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(3_000)

    const first = store.create('一')
    const second = store.create('二')
    const third = store.create('三')

    store.setFlags(first.id, { bookmarked: true })
    store.setFlags(second.id, { bookmarked: true })
    store.setFlags(third.id, { bookmarked: true })

    expect(store.listBookmarked().map((post) => post.id)).toEqual([third.id, second.id, first.id])
  })

  it('没有收藏时返回空数组', () => {
    store.create('随便一条')

    expect(store.listBookmarked()).toEqual([])
  })

  it('返回的是副本，外部改动不影响内部数据', () => {
    const created = store.create('收藏副本')
    store.setFlags(created.id, { bookmarked: true })

    const snapshot = store.listBookmarked()
    snapshot[0].bookmarked = false

    expect(store.listBookmarked()[0].bookmarked).toBe(true)
  })
})

describe('createPostStore.createRepost', () => {
  it('生成转发帖并把源帖 repostCount 变为 1', () => {
    const source = store.create('原帖内容')

    const repost = store.createRepost(source.id, '')

    expect(repost).toBeDefined()
    expect(repost?.content).toBe('')
    expect(repost?.liked).toBe(false)
    expect(repost?.bookmarked).toBe(false)
    expect(repost?.repostCount).toBe(0)
    expect(repost?.repostOf).toEqual({
      id: source.id,
      content: '原帖内容',
      createdAt: source.createdAt
    })
    expect(store.find(source.id)?.repostCount).toBe(1)
  })

  it('保留转发语', () => {
    const source = store.create('原帖')

    const repost = store.createRepost(source.id, '值得一转')

    expect(repost?.content).toBe('值得一转')
  })

  it('转发转发帖时扁平化指向最初原帖，且只有最初原帖计数加一', () => {
    const source = store.create('最初原帖')
    const firstRepost = store.createRepost(source.id, '第一次转发')
    const secondRepost = store.createRepost(firstRepost!.id, '转发别人的转发')

    expect(secondRepost?.repostOf).toEqual({
      id: source.id,
      content: '最初原帖',
      createdAt: source.createdAt
    })
    expect(secondRepost?.repostOf?.id).not.toBe(firstRepost?.id)

    const all = store.list()
    const findCount = (id: string) => all.find((post) => post.id === id)?.repostCount
    expect(findCount(source.id)).toBe(2)
    expect(findCount(firstRepost!.id)).toBe(0)
  })

  it('源帖不存在时返回 undefined 且不写入任何数据', () => {
    store.create('已有内容')

    expect(store.createRepost('missing', '转发不存在的')).toBeUndefined()
    expect(store.list()).toHaveLength(1)
  })

  it('源帖已被删除时仍可基于快照继续转发，且不会报错', () => {
    const source = store.create('将被删除')
    const repost = store.createRepost(source.id, '快照')
    store.remove(source.id)

    const fromRepost = store.createRepost(repost!.id, '再转发')

    expect(fromRepost?.repostOf).toEqual({
      id: source.id,
      content: '将被删除',
      createdAt: source.createdAt
    })
    expect(fromRepost?.repostOf?.id).toBe(source.id)
  })
})

describe('createPostStore 副本隔离', () => {
  it('外部改写返回值的 repostOf.content 不影响内部快照', () => {
    const source = store.create('快照内容')
    const repost = store.createRepost(source.id, '转发语')

    repost!.repostOf!.content = '被篡改'
    const fresh = store.find(repost!.id)

    expect(fresh?.repostOf?.content).toBe('快照内容')
    expect(fresh?.repostOf?.id).toBe(source.id)
  })

  it('list 返回的 repostOf 也是新对象', () => {
    const source = store.create('快照内容')
    const repost = store.createRepost(source.id, '转发语')

    const snapshot = store.list().find((post) => post.id === repost?.id)
    snapshot!.repostOf!.content = '被篡改'

    const fresh = store.list().find((post) => post.id === repost?.id)
    expect(fresh?.repostOf?.content).toBe('快照内容')
  })
})

describe('createPostStore.remove', () => {
  it('命中时返回 true 并从列表中消失', () => {
    const created = store.create('待删除')

    expect(store.remove(created.id)).toBe(true)
    expect(store.list()).toEqual([])
  })

  it('删除已点赞的帖子', () => {
    const created = store.create('已点赞')
    store.setFlags(created.id, { liked: true })

    expect(store.remove(created.id)).toBe(true)
    expect(store.find(created.id)).toBeUndefined()
  })

  it('删除已收藏的帖子', () => {
    const created = store.create('已收藏')
    store.setFlags(created.id, { bookmarked: true })

    expect(store.remove(created.id)).toBe(true)
    expect(store.listBookmarked()).toEqual([])
  })

  it('删除转发帖后源帖 repostCount 回退到 0', () => {
    const source = store.create('原帖')
    const repost = store.createRepost(source.id, '转发')

    expect(store.find(source.id)?.repostCount).toBe(1)
    expect(store.remove(repost!.id)).toBe(true)
    expect(store.find(source.id)?.repostCount).toBe(0)
  })

  it('只回退自己被计的那一次', () => {
    const source = store.create('原帖')
    const first = store.createRepost(source.id, '一转')
    store.createRepost(source.id, '二转')

    expect(store.find(source.id)?.repostCount).toBe(2)
    store.remove(first!.id)
    expect(store.find(source.id)?.repostCount).toBe(1)
  })

  it('未命中时返回 false 且不改动任何数据', () => {
    const source = store.create('原帖')
    store.createRepost(source.id, '转发')

    expect(store.remove('missing')).toBe(false)
    expect(store.list()).toHaveLength(2)
    expect(store.find(source.id)?.repostCount).toBe(1)
  })

  it('重复删除返回 false', () => {
    const created = store.create('删两次')

    expect(store.remove(created.id)).toBe(true)
    expect(store.remove(created.id)).toBe(false)
  })

  it('删除源帖不级联删除转发帖，转发帖仍可读到且快照完好', () => {
    const source = store.create('原帖内容')
    const repost = store.createRepost(source.id, '转发语')

    expect(store.remove(source.id)).toBe(true)

    const still = store.find(repost!.id)
    expect(still).toBeDefined()
    expect(still?.content).toBe('转发语')
    expect(still?.repostOf).toEqual({
      id: source.id,
      content: '原帖内容',
      createdAt: source.createdAt
    })
    expect(store.list()).toHaveLength(1)
  })

  it('删除源帖后再删除转发帖不会抛错，且正常返回结果', () => {
    const source = store.create('原帖')
    const repost = store.createRepost(source.id, '转发')
    store.remove(source.id)

    expect(store.remove(repost!.id)).toBe(true)
    expect(store.remove(repost!.id)).toBe(false)
    expect(store.list()).toEqual([])
  })
})

describe('createPostStore.reset', () => {
  it('清空所有数据', () => {
    store.create('a')
    store.create('b')

    store.reset()

    expect(store.list()).toEqual([])
    expect(store.listBookmarked()).toEqual([])
  })
})
