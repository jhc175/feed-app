import { describe, expect, it, vi } from 'vitest'
import type { Post } from '../../types/post'
import {
  ApiError,
  createPost,
  deletePost,
  listPosts,
  repostPost,
  updatePost
} from '../api'

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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    return error as ApiError
  }

  throw new Error('期望抛出 ApiError，但请求正常返回了')
}

describe('listPosts', () => {
  it('请求 /api/posts 并解析 posts 数组', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse({ posts: [makePost({ id: 'a' }), makePost({ id: 'b', liked: true })] })
      )

    const posts = await listPosts()

    expect(posts.map((post) => post.id)).toEqual(['a', 'b'])
    expect(posts[1].liked).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/posts')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET')
  })

  it('bookmarkedOnly 时带上 query 参数', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ posts: [makePost({ bookmarked: true })] }))

    const posts = await listPosts({ bookmarkedOnly: true })

    expect(posts).toHaveLength(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/posts?bookmarked=true')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET')
  })

  it('响应体缺少 posts 时抛 invalid_response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ items: [] }))

    const error = await captureError(listPosts())

    expect(error.status).toBe(0)
    expect(error.code).toBe('invalid_response')
    expect(error.message).toBe('服务端返回数据格式不正确')
  })

  it('帖子缺少 bookmarked 字段时抛 invalid_response', async () => {
    const { bookmarked: _bookmarked, ...broken } = makePost()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ posts: [broken] }))

    const error = await captureError(listPosts())

    expect(error.code).toBe('invalid_response')
  })

  it('帖子缺少 repostCount 字段时抛 invalid_response', async () => {
    const { repostCount: _repostCount, ...broken } = makePost()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ posts: [broken] }))

    const error = await captureError(listPosts())

    expect(error.code).toBe('invalid_response')
  })

  it('帖子缺少 repostOf 字段时抛 invalid_response', async () => {
    const { repostOf: _repostOf, ...broken } = makePost()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ posts: [broken] }))

    const error = await captureError(listPosts())

    expect(error.code).toBe('invalid_response')
  })

  it('repostOf 形状不合法时抛 invalid_response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ posts: [makePost({ repostOf: { id: 'src', content: '源帖' } as never })] })
    )

    const error = await captureError(listPosts())

    expect(error.code).toBe('invalid_response')
  })

  it('repostOf 为合法快照时可以解析', async () => {
    const repost = makePost({
      id: 'r1',
      content: '',
      repostOf: { id: 'src', content: '源帖内容', createdAt: 500 }
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ posts: [repost] }))

    await expect(listPosts()).resolves.toEqual([repost])
  })
})

describe('createPost', () => {
  it('以 JSON 提交 content 并解析新建的帖子', async () => {
    const created = makePost({ id: 'server-1', content: '你好', createdAt: 5_000 })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ post: created }, 201))

    await expect(createPost('你好')).resolves.toEqual(created)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/posts')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init?.body).toBe(JSON.stringify({ content: '你好' }))
  })
})

describe('updatePost', () => {
  it('用 PATCH 提交点赞状态并解析返回的帖子', async () => {
    const updated = makePost({ liked: true })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ post: updated }))

    await expect(updatePost('p1', { liked: true })).resolves.toEqual(updated)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/posts/p1')
    expect(init?.method).toBe('PATCH')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init?.body).toBe(JSON.stringify({ liked: true }))
  })

  it('用 PATCH 提交收藏状态', async () => {
    const updated = makePost({ bookmarked: true })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ post: updated }))

    await expect(updatePost('p1', { bookmarked: true })).resolves.toEqual(updated)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/posts/p1')
    expect(init?.method).toBe('PATCH')
    expect(init?.body).toBe(JSON.stringify({ bookmarked: true }))
  })

  it('对 id 做 URL 编码', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ post: makePost() }))

    await updatePost('a b/c', { liked: true })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/posts/a%20b%2Fc')
  })

  it('响应缺少新字段时抛 invalid_response', async () => {
    const broken = { id: 'p1', content: 'x', createdAt: 1, liked: false }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ post: broken }))

    const error = await captureError(updatePost('p1', { liked: true }))

    expect(error.code).toBe('invalid_response')
  })
})

describe('repostPost', () => {
  it('不带转发语时发送空对象 body', async () => {
    const created = makePost({
      id: 'r1',
      content: '',
      repostOf: { id: 'p1', content: '一条短文', createdAt: 1_000 },
      repostCount: 0
    })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ post: created }, 201))

    await expect(repostPost('p1')).resolves.toEqual(created)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/posts/p1/repost')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{}')
  })

  it('带转发语时把 content 放进 body', async () => {
    const created = makePost({
      id: 'r2',
      content: '转发语',
      repostOf: { id: 'p1', content: '一条短文', createdAt: 1_000 }
    })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ post: created }, 201))

    await repostPost('p1', '转发语')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/posts/p1/repost')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ content: '转发语' }))
  })

  it('响应缺少 repostOf 时抛 invalid_response', async () => {
    const { repostOf: _repostOf, ...broken } = makePost({ id: 'r1' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ post: broken }, 201))

    const error = await captureError(repostPost('p1'))

    expect(error.code).toBe('invalid_response')
  })
})

describe('deletePost', () => {
  it('204 空响应不解析 body 且不抛错', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))

    await expect(deletePost('p1')).resolves.toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/posts/p1')
    expect(init?.method).toBe('DELETE')
  })
})

describe('错误处理', () => {
  it('非 2xx 时用错误体的 code 与 message 构造 ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'too_long', message: '内容长度超出上限' } }, 422)
    )

    const error = await captureError(createPost('太长'))

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(422)
    expect(error.code).toBe('too_long')
    expect(error.message).toBe('内容长度超出上限')
  })

  it('错误体无法解析时回退到 HTTP 文案', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>oops</html>', {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      })
    )

    const error = await captureError(listPosts())

    expect(error.status).toBe(500)
    expect(error.code).toBe('http_error')
    expect(error.message).toBe('请求失败（HTTP 500）')
  })

  it('fetch 拒绝时抛 status 为 0 的 network 错误', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await captureError(listPosts())

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.code).toBe('network')
    expect(error.message).toBe('无法连接后端服务')
  })
})
