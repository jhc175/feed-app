import { Hono } from 'hono'
import type { Context } from 'hono'
import { MAX_LENGTH } from '../src/lib/text'
import { createPostStore } from './store'
import type { PostStore } from './store'
import { validateContent, validateLiked } from './validate'
import type { ValidationCode } from './validate'

type ErrorCode = ValidationCode | 'not_found'

const MESSAGES = {
  invalid_body: '请求体不是合法 JSON 或字段类型不正确',
  empty_content: '内容不能为空',
  too_long: `内容长度超出上限（最多 ${MAX_LENGTH} 个字符）`,
  not_found: '未找到对应的内容'
} satisfies Record<ErrorCode, string>

const STATUS = {
  invalid_body: 400,
  empty_content: 422,
  too_long: 422,
  not_found: 404
} satisfies Record<ErrorCode, 400 | 404 | 422>

function failure(c: Context, code: ErrorCode, message: string = MESSAGES[code]) {
  return c.json({ error: { code, message } }, STATUS[code])
}

type JsonBody = { ok: true; value: unknown } | { ok: false }

async function readJsonBody(c: Context): Promise<JsonBody> {
  try {
    return { ok: true, value: await c.req.json() }
  } catch {
    return { ok: false }
  }
}

/**
 * 构造 Hono 应用。默认参数保证每次调用都有独立的 store，
 * 测试之间不会互相污染。
 */
export function createApp(store: PostStore = createPostStore()): Hono {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ status: 'ok' }))

  app.get('/api/posts', (c) => c.json({ posts: store.list() }))

  app.get('/api/posts/:id', (c) => {
    const post = store.find(c.req.param('id'))
    if (!post) return failure(c, 'not_found')
    return c.json({ post })
  })

  app.post('/api/posts', async (c) => {
    const body = await readJsonBody(c)
    if (!body.ok) return failure(c, 'invalid_body')

    const parsed = validateContent(body.value)
    if (!parsed.ok) return failure(c, parsed.code)

    const post = store.create(parsed.content)
    c.header('Location', `/api/posts/${post.id}`)
    return c.json({ post }, 201)
  })

  app.patch('/api/posts/:id', async (c) => {
    const body = await readJsonBody(c)
    if (!body.ok) return failure(c, 'invalid_body')

    const parsed = validateLiked(body.value)
    if (!parsed.ok) return failure(c, parsed.code)

    const post = store.setLiked(c.req.param('id'), parsed.liked)
    if (!post) return failure(c, 'not_found')
    return c.json({ post })
  })

  app.delete('/api/posts/:id', (c) => {
    if (!store.remove(c.req.param('id'))) return failure(c, 'not_found')
    return c.body(null, 204)
  })

  app.notFound((c) => failure(c, 'not_found', '接口不存在'))

  return app
}
