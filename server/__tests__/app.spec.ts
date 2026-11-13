import type { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import type { Post } from '../../src/types/post'
import { createApp } from '../app'

async function sendJson(app: Hono, method: string, path: string, payload: unknown): Promise<Response> {
  return app.request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

async function createOne(app: Hono, content: string): Promise<Post> {
  const res = await sendJson(app, 'POST', '/api/posts', { content })
  expect(res.status).toBe(201)
  const body = (await res.json()) as { post: Post }
  return body.post
}

async function readPost(res: Response): Promise<Post> {
  const body = (await res.json()) as { post: Post }
  return body.post
}

async function readPosts(res: Response): Promise<Post[]> {
  const body = (await res.json()) as { posts: Post[] }
  return body.posts
}

async function readError(res: Response): Promise<{ code: string; message: string }> {
  const body = (await res.json()) as { error: { code: string; message: string } }
  expect(typeof body.error.code).toBe('string')
  expect(typeof body.error.message).toBe('string')
  expect(body.error.message.length).toBeGreaterThan(0)
  return body.error
}

describe('GET /api/health', () => {
  it('返回 200 与 { status: "ok" }', async () => {
    const res = await createApp().request('/api/health')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})

describe('GET /api/posts', () => {
  it('初始状态返回空列表', async () => {
    const res = await createApp().request('/api/posts')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ posts: [] })
  })

  it('创建多条后按 createdAt 倒序返回', async () => {
    const app = createApp()
    const first = await createOne(app, '第一条')
    const second = await createOne(app, '第二条')

    const res = await app.request('/api/posts')
    const posts = await readPosts(res)

    expect(posts).toHaveLength(2)
    expect(posts.map((post) => post.id)).toEqual([second.id, first.id])
  })

  it('bookmarked=true 只返回已收藏的帖子', async () => {
    const app = createApp()
    const first = await createOne(app, '收藏一')
    const second = await createOne(app, '未收藏')
    const third = await createOne(app, '收藏二')

    await sendJson(app, 'PATCH', `/api/posts/${first.id}`, { bookmarked: true })
    await sendJson(app, 'PATCH', `/api/posts/${third.id}`, { bookmarked: true })

    const res = await app.request('/api/posts?bookmarked=true')
    const posts = await readPosts(res)

    expect(res.status).toBe(200)
    expect(posts.map((post) => post.id)).toEqual([third.id, first.id])
    expect(posts.some((post) => post.id === second.id)).toBe(false)
  })

  it('bookmarked=false 与无参数等价，返回全部', async () => {
    const app = createApp()
    const first = await createOne(app, '一')
    await createOne(app, '二')
    await sendJson(app, 'PATCH', `/api/posts/${first.id}`, { bookmarked: true })

    const filtered = await readPosts(await app.request('/api/posts?bookmarked=false'))
    const plain = await readPosts(await app.request('/api/posts'))

    expect(filtered).toHaveLength(2)
    expect(filtered.map((post) => post.id)).toEqual(plain.map((post) => post.id))
  })

  it('bookmarked 为其它值时返回全部', async () => {
    const app = createApp()
    await createOne(app, '一')
    await createOne(app, '二')

    const posts = await readPosts(await app.request('/api/posts?bookmarked=yes'))

    expect(posts).toHaveLength(2)
  })
})

describe('POST /api/posts', () => {
  it('创建成功返回 201、完整 post、Location 头与 JSON Content-Type', async () => {
    const app = createApp()
    const res = await sendJson(app, 'POST', '/api/posts', { content: '  你好 chirp  ' })

    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toContain('application/json')

    const post = await readPost(res)
    expect(typeof post.id).toBe('string')
    expect(post.id.length).toBeGreaterThan(0)
    expect(post.content).toBe('你好 chirp')
    expect(typeof post.createdAt).toBe('number')
    expect(post.liked).toBe(false)
    expect(post.bookmarked).toBe(false)
    expect(post.repostOf).toBeNull()
    expect(post.repostCount).toBe(0)
    expect(res.headers.get('Location')).toBe(`/api/posts/${post.id}`)
  })

  it('280 个 emoji 也能创建成功', async () => {
    const res = await sendJson(createApp(), 'POST', '/api/posts', { content: '😀'.repeat(280) })

    expect(res.status).toBe(201)
  })

  it('空内容返回 422 empty_content', async () => {
    const res = await sendJson(createApp(), 'POST', '/api/posts', { content: '   ' })

    expect(res.status).toBe(422)
    expect((await readError(res)).code).toBe('empty_content')
  })

  it('超长内容返回 422 too_long', async () => {
    const res = await sendJson(createApp(), 'POST', '/api/posts', { content: 'a'.repeat(281) })

    expect(res.status).toBe(422)
    expect((await readError(res)).code).toBe('too_long')
  })

  it('非法 JSON 返回 400 invalid_body', async () => {
    const res = await createApp().request('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{'
    })

    expect(res.status).toBe(400)
    expect((await readError(res)).code).toBe('invalid_body')
  })

  it('缺少 content 字段返回 400 invalid_body', async () => {
    const res = await sendJson(createApp(), 'POST', '/api/posts', {})

    expect(res.status).toBe(400)
    expect((await readError(res)).code).toBe('invalid_body')
  })

  it('校验失败时不会写入数据', async () => {
    const app = createApp()
    await sendJson(app, 'POST', '/api/posts', { content: '' })

    const res = await app.request('/api/posts')
    expect(await res.json()).toEqual({ posts: [] })
  })
})

describe('GET /api/posts/:id', () => {
  it('命中时返回 200 与该 post', async () => {
    const app = createApp()
    const created = await createOne(app, '单条详情')

    const res = await app.request(`/api/posts/${created.id}`)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ post: created })
  })

  it('不存在时返回 404 not_found', async () => {
    const res = await createApp().request('/api/posts/missing')

    expect(res.status).toBe(404)
    expect((await readError(res)).code).toBe('not_found')
  })
})

describe('PATCH /api/posts/:id', () => {
  it('只改 liked 时 bookmarked 保持不变', async () => {
    const app = createApp()
    const created = await createOne(app, '点赞对象')

    const res = await sendJson(app, 'PATCH', `/api/posts/${created.id}`, { liked: true })
    expect(res.status).toBe(200)

    const post = await readPost(res)
    expect(post.liked).toBe(true)
    expect(post.bookmarked).toBe(false)
  })

  it('只改 bookmarked 时 liked 保持不变', async () => {
    const app = createApp()
    const created = await createOne(app, '收藏对象')

    const res = await sendJson(app, 'PATCH', `/api/posts/${created.id}`, { bookmarked: true })
    expect(res.status).toBe(200)

    const post = await readPost(res)
    expect(post.bookmarked).toBe(true)
    expect(post.liked).toBe(false)
  })

  it('同时改 liked 与 bookmarked', async () => {
    const app = createApp()
    const created = await createOne(app, '同时改')

    const res = await sendJson(app, 'PATCH', `/api/posts/${created.id}`, {
      liked: true,
      bookmarked: true
    })
    expect(res.status).toBe(200)

    const post = await readPost(res)
    expect(post).toMatchObject({ liked: true, bookmarked: true })
  })

  it('可以改回 false', async () => {
    const app = createApp()
    const created = await createOne(app, '取消')
    await sendJson(app, 'PATCH', `/api/posts/${created.id}`, { liked: true, bookmarked: true })

    const res = await sendJson(app, 'PATCH', `/api/posts/${created.id}`, {
      liked: false,
      bookmarked: false
    })

    expect((await readPost(res))).toMatchObject({ liked: false, bookmarked: false })
  })

  it('空 body 返回 400 invalid_body', async () => {
    const app = createApp()
    const created = await createOne(app, '空 patch')

    const res = await sendJson(app, 'PATCH', `/api/posts/${created.id}`, {})

    expect(res.status).toBe(400)
    expect((await readError(res)).code).toBe('invalid_body')
  })

  it('liked 非法返回 400 invalid_body', async () => {
    const app = createApp()
    const created = await createOne(app, '非法点赞')

    const res = await sendJson(app, 'PATCH', `/api/posts/${created.id}`, { liked: 'yes' })

    expect(res.status).toBe(400)
    expect((await readError(res)).code).toBe('invalid_body')
  })

  it('id 不存在返回 404 not_found', async () => {
    const res = await sendJson(createApp(), 'PATCH', '/api/posts/missing', { liked: true })

    expect(res.status).toBe(404)
    expect((await readError(res)).code).toBe('not_found')
  })
})

describe('POST /api/posts/:id/repost', () => {
  it('完全无 body 时按纯转发处理，返回 201 与新帖', async () => {
    const app = createApp()
    const source = await createOne(app, '原帖内容')

    const res = await app.request(`/api/posts/${source.id}/repost`, { method: 'POST' })

    expect(res.status).toBe(201)

    const post = await readPost(res)
    expect(post.content).toBe('')
    expect(post.repostOf).toEqual({
      id: source.id,
      content: '原帖内容',
      createdAt: source.createdAt
    })
    expect(post.liked).toBe(false)
    expect(post.bookmarked).toBe(false)
    expect(post.repostCount).toBe(0)
    expect(res.headers.get('Location')).toBe(`/api/posts/${post.id}`)

    const sourceAfter = await readPost(await app.request(`/api/posts/${source.id}`))
    expect(sourceAfter.repostCount).toBe(1)
  })

  it('空 JSON 对象也按纯转发处理', async () => {
    const app = createApp()
    const source = await createOne(app, '原帖')

    const res = await sendJson(app, 'POST', `/api/posts/${source.id}/repost`, {})

    expect(res.status).toBe(201)
    expect((await readPost(res)).content).toBe('')
  })

  it('带转发语时返回 201 且 content 已 trim', async () => {
    const app = createApp()
    const source = await createOne(app, '原帖')

    const res = await sendJson(app, 'POST', `/api/posts/${source.id}/repost`, {
      content: '  值得一转  '
    })

    expect(res.status).toBe(201)
    expect((await readPost(res)).content).toBe('值得一转')
  })

  it('纯空白的转发语按纯转发处理，不报 empty_content', async () => {
    const app = createApp()
    const source = await createOne(app, '原帖')

    const res = await sendJson(app, 'POST', `/api/posts/${source.id}/repost`, { content: '   ' })

    expect(res.status).toBe(201)
    expect((await readPost(res)).content).toBe('')
  })

  it('转发转发帖时扁平化指向最初原帖', async () => {
    const app = createApp()
    const source = await createOne(app, '最初原帖')
    const firstRes = await app.request(`/api/posts/${source.id}/repost`, { method: 'POST' })
    const firstRepost = await readPost(firstRes)

    const secondRes = await sendJson(app, 'POST', `/api/posts/${firstRepost.id}/repost`, {
      content: '转发的转发'
    })
    const secondRepost = await readPost(secondRes)

    expect(secondRepost.repostOf?.id).toBe(source.id)
    expect(secondRepost.repostOf?.content).toBe('最初原帖')

    const sourceAfter = await readPost(await app.request(`/api/posts/${source.id}`))
    const firstAfter = await readPost(await app.request(`/api/posts/${firstRepost.id}`))
    expect(sourceAfter.repostCount).toBe(2)
    expect(firstAfter.repostCount).toBe(0)
  })

  it('转发语超过 280 码点返回 422 too_long', async () => {
    const app = createApp()
    const source = await createOne(app, '原帖')

    const res = await sendJson(app, 'POST', `/api/posts/${source.id}/repost`, {
      content: 'a'.repeat(281)
    })

    expect(res.status).toBe(422)
    expect((await readError(res)).code).toBe('too_long')
  })

  it('源帖不存在返回 404 not_found 且不写入', async () => {
    const app = createApp()

    const res = await sendJson(app, 'POST', '/api/posts/missing/repost', { content: '转发' })

    expect(res.status).toBe(404)
    expect((await readError(res)).code).toBe('not_found')
    expect(await readPosts(await app.request('/api/posts'))).toEqual([])
  })

  it('非法 JSON body 返回 400 invalid_body', async () => {
    const app = createApp()
    const source = await createOne(app, '原帖')

    const res = await app.request(`/api/posts/${source.id}/repost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{'
    })

    expect(res.status).toBe(400)
    expect((await readError(res)).code).toBe('invalid_body')
  })

  it('content 不是字符串返回 400 invalid_body', async () => {
    const app = createApp()
    const source = await createOne(app, '原帖')

    const res = await sendJson(app, 'POST', `/api/posts/${source.id}/repost`, { content: 123 })

    expect(res.status).toBe(400)
    expect((await readError(res)).code).toBe('invalid_body')
  })
})

describe('DELETE /api/posts/:id', () => {
  it('删除成功返回 204 且响应体为空，随后 GET 返回 404', async () => {
    const app = createApp()
    const created = await createOne(app, '待删除')

    const res = await app.request(`/api/posts/${created.id}`, { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
    expect((await app.request(`/api/posts/${created.id}`)).status).toBe(404)
  })

  it('删除后列表不再包含该帖', async () => {
    const app = createApp()
    const kept = await createOne(app, '保留')
    const removed = await createOne(app, '删除')

    await app.request(`/api/posts/${removed.id}`, { method: 'DELETE' })

    const posts = await readPosts(await app.request('/api/posts'))
    expect(posts.map((post) => post.id)).toEqual([kept.id])
  })

  it('删除已点赞、已收藏的帖子', async () => {
    const app = createApp()
    const created = await createOne(app, '带状态')
    await sendJson(app, 'PATCH', `/api/posts/${created.id}`, { liked: true, bookmarked: true })

    const res = await app.request(`/api/posts/${created.id}`, { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(await readPosts(await app.request('/api/posts'))).toEqual([])
    expect(await readPosts(await app.request('/api/posts?bookmarked=true'))).toEqual([])
  })

  it('重复删除返回 404', async () => {
    const app = createApp()
    const created = await createOne(app, '删两次')

    await app.request(`/api/posts/${created.id}`, { method: 'DELETE' })
    const res = await app.request(`/api/posts/${created.id}`, { method: 'DELETE' })

    expect(res.status).toBe(404)
    expect((await readError(res)).code).toBe('not_found')
  })

  it('删除转发帖后源帖 repostCount 回退', async () => {
    const app = createApp()
    const source = await createOne(app, '原帖')
    const repost = await readPost(
      await app.request(`/api/posts/${source.id}/repost`, { method: 'POST' })
    )

    await app.request(`/api/posts/${repost.id}`, { method: 'DELETE' })

    const sourceAfter = await readPost(await app.request(`/api/posts/${source.id}`))
    expect(sourceAfter.repostCount).toBe(0)
  })

  it('删除源帖后转发帖仍可读取，快照完好且列表保留它', async () => {
    const app = createApp()
    const source = await createOne(app, '将被删的原帖')
    const repost = await readPost(
      await app.request(`/api/posts/${source.id}/repost`, { method: 'POST' })
    )

    await app.request(`/api/posts/${source.id}`, { method: 'DELETE' })

    const res = await app.request(`/api/posts/${repost.id}`)
    expect(res.status).toBe(200)

    const still = await readPost(res)
    expect(still.repostOf).toEqual({
      id: source.id,
      content: '将被删的原帖',
      createdAt: source.createdAt
    })

    const posts = await readPosts(await app.request('/api/posts'))
    expect(posts.map((post) => post.id)).toEqual([repost.id])

    const deleteAgain = await app.request(`/api/posts/${repost.id}`, { method: 'DELETE' })
    expect(deleteAgain.status).toBe(204)
  })
})

describe('未知路径', () => {
  it('返回 404 not_found', async () => {
    const res = await createApp().request('/api/unknown')

    expect(res.status).toBe(404)
    expect((await readError(res)).code).toBe('not_found')
  })
})
