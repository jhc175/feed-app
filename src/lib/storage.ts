import type { Post } from '../types/post'

export const STORAGE_KEY = 'chirp.posts.v2'
export const LEGACY_STORAGE_KEY = 'chirp.posts.v1'

function toPost(value: unknown): Post | null {
  if (value === null || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) return null
  if (typeof candidate.content !== 'string') return null
  if (typeof candidate.createdAt !== 'number' || !Number.isFinite(candidate.createdAt)) return null

  return {
    id: candidate.id,
    content: candidate.content,
    createdAt: candidate.createdAt,
    liked: candidate.liked === true
  }
}

function parseList(raw: string | null): Post[] {
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed
    .map(toPost)
    .filter((post): post is Post => post !== null)
    .sort((a, b) => b.createdAt - a.createdAt)
}

function readRaw(key: string): string | null | undefined {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return undefined
  }
}

/**
 * 读取帖子。v2 存在时以其为准（即使内容损坏或为空），
 * 只有 v2 完全缺失时才回退到 v1 并顺手完成迁移。
 */
export function loadPosts(): Post[] {
  const rawV2 = readRaw(STORAGE_KEY)
  if (rawV2 === undefined) return []
  if (rawV2 !== null) return parseList(rawV2)

  const legacy = parseList(readRaw(LEGACY_STORAGE_KEY) ?? null)
  if (legacy.length > 0) savePosts(legacy)
  return legacy
}

/** 写入帖子；配额写满或存储被禁用时返回 false，不抛错。 */
export function savePosts(posts: Post[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
    return true
  } catch {
    return false
  }
}
