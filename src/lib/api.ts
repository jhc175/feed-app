import type { Post, RepostSource } from '../types/post'

export const API_BASE_URL = '/api'

const NETWORK_MESSAGE = '无法连接后端服务'
const INVALID_RESPONSE_MESSAGE = '服务端返回数据格式不正确'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
}

export type PostPatch = {
  liked?: boolean
  bookmarked?: boolean
}

export type ListPostsOptions = {
  bookmarkedOnly?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** 转发时对源帖做的快照：id / content / createdAt 三者齐备才算合法。 */
function isRepostSource(value: unknown): value is RepostSource {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt)
  )
}

function isPost(value: unknown): value is Post {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    typeof value.liked === 'boolean' &&
    typeof value.bookmarked === 'boolean' &&
    (value.repostOf === null || isRepostSource(value.repostOf)) &&
    typeof value.repostCount === 'number' &&
    Number.isFinite(value.repostCount) &&
    value.repostCount >= 0
  )
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return undefined
  }
}

/** 从错误响应体里取 code / message，解析不出来就用 HTTP 兜底文案。 */
function toErrorPayload(payload: unknown, status: number): { code: string; message: string } {
  if (isRecord(payload)) {
    const error = payload.error
    if (isRecord(error) && typeof error.code === 'string' && typeof error.message === 'string') {
      return { code: error.code, message: error.message }
    }
  }

  return { code: 'http_error', message: `请求失败（HTTP ${status}）` }
}

async function request(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', body } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  } catch {
    throw new ApiError(0, 'network', NETWORK_MESSAGE)
  }

  if (!res.ok) {
    const error = toErrorPayload(await readJson(res), res.status)
    throw new ApiError(res.status, error.code, error.message)
  }

  return res
}

function extractPost(payload: unknown): Post {
  if (!isRecord(payload)) throw new ApiError(0, 'invalid_response', INVALID_RESPONSE_MESSAGE)

  const post = payload.post
  if (!isPost(post)) throw new ApiError(0, 'invalid_response', INVALID_RESPONSE_MESSAGE)

  return post
}

export async function listPosts(options: ListPostsOptions = {}): Promise<Post[]> {
  const path = options.bookmarkedOnly ? '/posts?bookmarked=true' : '/posts'
  const res = await request(path)
  const payload = await readJson(res)

  if (!isRecord(payload) || !Array.isArray(payload.posts)) {
    throw new ApiError(0, 'invalid_response', INVALID_RESPONSE_MESSAGE)
  }

  const raw: unknown[] = payload.posts
  const posts: Post[] = []
  for (const item of raw) {
    if (!isPost(item)) throw new ApiError(0, 'invalid_response', INVALID_RESPONSE_MESSAGE)
    posts.push(item)
  }

  return posts
}

export async function createPost(content: string): Promise<Post> {
  const res = await request('/posts', { method: 'POST', body: { content } })
  return extractPost(await readJson(res))
}

/** 局部更新点赞 / 收藏状态。 */
export async function updatePost(id: string, patch: PostPatch): Promise<Post> {
  const res = await request(`/posts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch
  })
  return extractPost(await readJson(res))
}

/** 转发某条帖子；不传 content 时发送空对象，表示纯转发。 */
export async function repostPost(id: string, content?: string): Promise<Post> {
  const body = content === undefined ? {} : { content }
  const res = await request(`/posts/${encodeURIComponent(id)}/repost`, {
    method: 'POST',
    body
  })
  return extractPost(await readJson(res))
}

export async function deletePost(id: string): Promise<void> {
  await request(`/posts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
