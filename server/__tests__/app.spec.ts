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
    const body = (await res.json()) as { posts: Post[] }

    expect(body.posts).toHaveLength(2)
    expect(body.posts.map((post) => post.id)).toEqual([second.id, first.id])
  })
})

describe('POST /api/posts', () => {
  it('创建成功返回 201、完整 post、Location 头与 JSON Content-Type', async () => {
    const app = createApp()
    const res = await sendJson(app, 'POST', '/api/posts', { content: '  你好 chirp  ' })

    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toContain('application/json')

    const body = (await res.json()) as { post: Post }
    expect(typeof body.post.id).toBe('string')
    expect(body.post.id.length).toBeGreaterThan(0)
    expect(body.post.content).toBe('你好 chirp')
    expect(typeof body.post.createdAt).toBe('number')
    expect(body.post.liked).toBe(false)
    expect(res.headers.get('Location')).toBe(`/api/posts/${body.post.id}`)
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
  it('设 liked 为 true 返回 200 且 post.liked 为 true，再设回 false', async () => {
    const app = createApp()
    const created = await createOne(app, '点赞对象')

    const likedRes = await sendJson(app, 'PATCH', `/api/posts/${created.id}`, { liked: true })
    expect(likedRes.status).toBe(200)
    const likedBody = (await likedRes.json()) as { post: Post }
    expect(likedBody.post.liked).toBe(true)

    const unlikedRes = await sendJson(app, 'PATCH', `/api/posts/${created.id}`, { liked: false })
    expect(unlikedRes.status).toBe(200)
    const unlikedBody = (await unlikedRes.json()) as { post: Post }
    expect(unlikedBody.post.liked).toBe(false)
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

describe('DELETE /api/posts/:id', () => {
  it('删除成功返回 204 且响应体为空，随后 GET 返回 404', async () => {
    const app = createApp()
    const created = await createOne(app, '待删除')

    const res = await app.request(`/api/posts/${created.id}`, { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
    expect((await app.request(`/api/posts/${created.id}`)).status).toBe(404)
  })

  it('删除后列表为空', async () => {
    const app = createApp()
    const created = await createOne(app, '唯一的条目')

    await app.request(`/api/posts/${created.id}`, { method: 'DELETE' })

    const res = await app.request('/api/posts')
    expect(await res.json()).toEqual({ posts: [] })
  })

  it('重复删除返回 404', async () => {
    const app = createApp()
    const created = await createOne(app, '删两次')

    await app.request(`/api/posts/${created.id}`, { method: 'DELETE' })
    const res = await app.request(`/api/posts/${created.id}`, { method: 'DELETE' })

    expect(res.status).toBe(404)
    expect((await readError(res)).code).toBe('not_found')
  })
})

describe('未知路径', () => {
  it('返回 404 not_found', async () => {
    const res = await createApp().request('/api/unknown')

    expect(res.status).toBe(404)
    expect((await readError(res)).code).toBe('not_found')
  })
})
