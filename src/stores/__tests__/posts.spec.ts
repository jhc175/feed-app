import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPost, deletePost, listPosts, repostPost, updatePost } from '../../lib/api'
import type { Post } from '../../types/post'
import { usePostsStore } from '../posts'

vi.mock('../../lib/api')

const listPostsMock = vi.mocked(listPosts)
const createPostMock = vi.mocked(createPost)
const deletePostMock = vi.mocked(deletePost)
const updatePostMock = vi.mocked(updatePost)
const repostPostMock = vi.mocked(repostPost)

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    content: '一条短文',
    createdAt: 1_000,
    liked: false,
    bookmarked: false,
    repostOf: null,
    repostCount: 0,
    ...overrides
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('load', () => {
  it('成功后填充帖子并按创建时间倒序暴露', async () => {
    listPostsMock.mockResolvedValue([
      makePost({ id: 'older', content: '更早的', createdAt: 1_000 }),
      makePost({ id: 'newer', content: '更新的', createdAt: 2_000 })
    ])
    const store = usePostsStore()

    await expect(store.load()).resolves.toBe(true)

    expect(store.total).toBe(2)
    expect(store.sortedPosts.map((post) => post.id)).toEqual(['newer', 'older'])
    expect(store.lastAddedId).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('服务端返回空列表时是干净的空状态', async () => {
    listPostsMock.mockResolvedValue([])
    const store = usePostsStore()

    await expect(store.load()).resolves.toBe(true)

    expect(store.posts).toEqual([])
    expect(store.total).toBe(0)
  })

  it('失败时返回 false 且不动已有数据', async () => {
    listPostsMock.mockRejectedValue(new Error('offline'))
    const store = usePostsStore()
    store.posts = [makePost({ id: 'keep' })]
    store.lastAddedId = 'keep'

    await expect(store.load()).resolves.toBe(false)

    expect(store.posts.map((post) => post.id)).toEqual(['keep'])
    expect(store.lastAddedId).toBe('keep')
    expect(store.loading).toBe(false)
  })

  it('load 进行中 loading 为 true，结束后复位', async () => {
    let resolveList: (posts: Post[]) => void = () => {}
    listPostsMock.mockImplementation(
      () =>
        new Promise<Post[]>((resolve) => {
          resolveList = resolve
        })
    )
    const store = usePostsStore()

    const pending = store.load()
    expect(store.loading).toBe(true)

    resolveList([makePost()])
    await expect(pending).resolves.toBe(true)

    expect(store.loading).toBe(false)
    expect(store.total).toBe(1)
  })
})

describe('add', () => {
  it('成功后插到列表首位并记录 lastAddedId', async () => {
    const created = makePost({ id: 'server-1', content: '新的', createdAt: 9_000 })
    createPostMock.mockResolvedValue(created)
    const store = usePostsStore()
    store.posts = [makePost({ id: 'old', content: '旧的', createdAt: 1 })]

    await expect(store.add('  新的  ')).resolves.toEqual({ ok: true, post: created })

    expect(createPostMock).toHaveBeenCalledWith('新的')
    expect(store.posts.map((post) => post.id)).toEqual(['server-1', 'old'])
    expect(store.lastAddedId).toBe('server-1')
  })

  it('空内容与纯空白返回 empty 且不请求服务端', async () => {
    const store = usePostsStore()

    await expect(store.add('')).resolves.toEqual({ ok: false, reason: 'empty' })
    await expect(store.add('   \n  ')).resolves.toEqual({ ok: false, reason: 'empty' })

    expect(createPostMock).not.toHaveBeenCalled()
    expect(store.posts).toEqual([])
  })

  it('超过 280 字返回 too-long 且不请求服务端', async () => {
    const store = usePostsStore()

    await expect(store.add('字'.repeat(281))).resolves.toEqual({ ok: false, reason: 'too-long' })

    expect(createPostMock).not.toHaveBeenCalled()
    expect(store.posts).toEqual([])
  })

  it('正好 280 字可以发布', async () => {
    createPostMock.mockImplementation(async (content: string) =>
      makePost({ id: 'server-280', content })
    )
    const store = usePostsStore()

    await expect(store.add('字'.repeat(280))).resolves.toMatchObject({ ok: true })

    expect(store.posts).toHaveLength(1)
  })

  it('服务端失败时返回 network 且内存不变', async () => {
    createPostMock.mockRejectedValue(new Error('offline'))
    const store = usePostsStore()
    store.posts = [makePost({ id: 'keep' })]

    await expect(store.add('发不出去')).resolves.toEqual({ ok: false, reason: 'network' })

    expect(store.posts.map((post) => post.id)).toEqual(['keep'])
    expect(store.lastAddedId).toBeNull()
  })
})

describe('remove', () => {
  it('成功后从列表移除', async () => {
    deletePostMock.mockResolvedValue(undefined)
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1' }), makePost({ id: 'p2', content: '另一条' })]

    await expect(store.remove('p1')).resolves.toBe(true)

    expect(deletePostMock).toHaveBeenCalledWith('p1')
    expect(store.posts.map((post) => post.id)).toEqual(['p2'])
  })

  it('服务端失败时保留数据并返回 false', async () => {
    deletePostMock.mockRejectedValue(new Error('offline'))
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1' })]

    await expect(store.remove('p1')).resolves.toBe(false)

    expect(store.posts.map((post) => post.id)).toEqual(['p1'])
  })

  it('未知 id 返回 false 且列表不变', async () => {
    deletePostMock.mockRejectedValue(new Error('not_found'))
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1' })]

    await expect(store.remove('not-exist')).resolves.toBe(false)

    expect(store.posts.map((post) => post.id)).toEqual(['p1'])
  })

  it('删除转发帖后源帖的 repostCount 本地回退', async () => {
    deletePostMock.mockResolvedValue(undefined)
    const store = usePostsStore()
    store.posts = [
      makePost({
        id: 'r1',
        content: '',
        repostOf: { id: 'p1', content: '一条短文', createdAt: 1_000 }
      }),
      makePost({ id: 'p1', repostCount: 2 })
    ]

    await expect(store.remove('r1')).resolves.toBe(true)

    expect(store.posts.map((post) => post.id)).toEqual(['p1'])
    expect(store.posts[0].repostCount).toBe(1)
  })

  it('删除转发帖时源帖 repostCount 不会降到负数', async () => {
    deletePostMock.mockResolvedValue(undefined)
    const store = usePostsStore()
    store.posts = [
      makePost({
        id: 'r1',
        content: '',
        repostOf: { id: 'p1', content: '一条短文', createdAt: 1_000 }
      }),
      makePost({ id: 'p1', repostCount: 0 })
    ]

    await store.remove('r1')

    expect(store.posts[0].repostCount).toBe(0)
  })
})

describe('toggleLike', () => {
  it('先切换成点赞再切回未点赞', async () => {
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1', liked: false })]
    updatePostMock.mockImplementation(async (id: string, patch) =>
      makePost({ id, liked: Boolean(patch.liked) })
    )

    await expect(store.toggleLike('p1')).resolves.toBe(true)
    expect(updatePostMock).toHaveBeenLastCalledWith('p1', { liked: true })
    expect(store.posts[0].liked).toBe(true)
    expect(store.likedTotal).toBe(1)

    await expect(store.toggleLike('p1')).resolves.toBe(true)
    expect(updatePostMock).toHaveBeenLastCalledWith('p1', { liked: false })
    expect(store.posts[0].liked).toBe(false)
    expect(store.likedTotal).toBe(0)
  })

  it('未知 id 返回 false 且不请求服务端', async () => {
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1' })]

    await expect(store.toggleLike('not-exist')).resolves.toBe(false)

    expect(updatePostMock).not.toHaveBeenCalled()
  })

  it('服务端失败时状态不变', async () => {
    updatePostMock.mockRejectedValue(new Error('offline'))
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1', liked: false })]

    await expect(store.toggleLike('p1')).resolves.toBe(false)

    expect(store.posts[0].liked).toBe(false)
  })
})

describe('toggleBookmark', () => {
  it('把未收藏切换成已收藏并用返回值替换', async () => {
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1', bookmarked: false, content: '旧内容' })]
    updatePostMock.mockImplementation(async (id: string, patch) =>
      makePost({ id, content: '服务端内容', bookmarked: Boolean(patch.bookmarked) })
    )

    await expect(store.toggleBookmark('p1')).resolves.toBe(true)

    expect(updatePostMock).toHaveBeenLastCalledWith('p1', { bookmarked: true })
    expect(store.posts[0].bookmarked).toBe(true)
    expect(store.posts[0].content).toBe('服务端内容')
    expect(store.bookmarkedTotal).toBe(1)
  })

  it('再点一次取消收藏', async () => {
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1', bookmarked: true })]
    updatePostMock.mockImplementation(async (id: string, patch) =>
      makePost({ id, bookmarked: Boolean(patch.bookmarked) })
    )

    await expect(store.toggleBookmark('p1')).resolves.toBe(true)

    expect(updatePostMock).toHaveBeenLastCalledWith('p1', { bookmarked: false })
    expect(store.posts[0].bookmarked).toBe(false)
    expect(store.bookmarkedTotal).toBe(0)
  })

  it('未知 id 返回 false 且不请求服务端', async () => {
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1' })]

    await expect(store.toggleBookmark('not-exist')).resolves.toBe(false)

    expect(updatePostMock).not.toHaveBeenCalled()
  })

  it('服务端失败时状态不变', async () => {
    updatePostMock.mockRejectedValue(new Error('offline'))
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1', bookmarked: false })]

    await expect(store.toggleBookmark('p1')).resolves.toBe(false)

    expect(store.posts[0].bookmarked).toBe(false)
  })
})

describe('repost', () => {
  it('成功后新帖插到首位、记录 lastAddedId 并让源帖计数 +1', async () => {
    const reposted = makePost({
      id: 'r1',
      content: '',
      createdAt: 5_000,
      repostOf: { id: 'p1', content: '一条短文', createdAt: 1_000 }
    })
    repostPostMock.mockResolvedValue(reposted)
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1', repostCount: 0 }), makePost({ id: 'p2' })]

    await expect(store.repost('p1')).resolves.toBe(true)

    expect(repostPostMock).toHaveBeenCalledWith('p1')
    expect(store.posts.map((post) => post.id)).toEqual(['r1', 'p1', 'p2'])
    expect(store.lastAddedId).toBe('r1')
    expect(store.posts[1].repostCount).toBe(1)
  })

  it('未知 id 返回 false 且不请求服务端', async () => {
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1' })]

    await expect(store.repost('not-exist')).resolves.toBe(false)

    expect(repostPostMock).not.toHaveBeenCalled()
    expect(store.posts.map((post) => post.id)).toEqual(['p1'])
  })

  it('服务端失败时内存不变', async () => {
    repostPostMock.mockRejectedValue(new Error('offline'))
    const store = usePostsStore()
    store.posts = [makePost({ id: 'p1', repostCount: 3 })]

    await expect(store.repost('p1')).resolves.toBe(false)

    expect(store.posts.map((post) => post.id)).toEqual(['p1'])
    expect(store.posts[0].repostCount).toBe(3)
    expect(store.lastAddedId).toBeNull()
  })
})

describe('bookmarkedOnly 与派生数据', () => {
  it('visiblePosts 只保留已收藏，total 仍是全部数量', () => {
    const store = usePostsStore()
    store.posts = [
      makePost({ id: 'a', createdAt: 1_000, bookmarked: false }),
      makePost({ id: 'b', createdAt: 2_000, bookmarked: true }),
      makePost({ id: 'c', createdAt: 3_000, bookmarked: true })
    ]

    expect(store.visiblePosts.map((post) => post.id)).toEqual(['c', 'b', 'a'])
    expect(store.total).toBe(3)
    expect(store.bookmarkedTotal).toBe(2)

    store.bookmarkedOnly = true

    expect(store.visiblePosts.map((post) => post.id)).toEqual(['c', 'b'])
    expect(store.total).toBe(3)
    expect(store.bookmarkedTotal).toBe(2)
  })

  it('默认 bookmarkedOnly 为 false', () => {
    const store = usePostsStore()

    expect(store.bookmarkedOnly).toBe(false)
  })

  it('没有收藏时 visiblePosts 为空', () => {
    const store = usePostsStore()
    store.posts = [makePost({ id: 'a' })]
    store.bookmarkedOnly = true

    expect(store.visiblePosts).toEqual([])
    expect(store.bookmarkedTotal).toBe(0)
    expect(store.total).toBe(1)
  })
})
