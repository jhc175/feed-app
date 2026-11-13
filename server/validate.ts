import { MAX_LENGTH, countChars } from '../src/lib/text'

export type ValidationCode = 'invalid_body' | 'empty_content' | 'too_long'

export type ContentValidation =
  | { ok: true; content: string }
  | { ok: false; code: ValidationCode }

/** PATCH 允许的标记位，未出现的字段表示不改动。 */
export type PostPatch = { liked?: boolean; bookmarked?: boolean }

export type PatchValidation =
  | { ok: true; patch: PostPatch }
  | { ok: false; code: 'invalid_body' }

export type RepostValidation =
  | { ok: true; content: string }
  | { ok: false; code: 'invalid_body' | 'too_long' }

function asRecord(input: unknown): Record<string, unknown> | null {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null
  return input as Record<string, unknown>
}

/** 校验 POST /api/posts 的请求体，返回 trim 后的内容。 */
export function validateContent(input: unknown): ContentValidation {
  const body = asRecord(input)
  if (!body || typeof body.content !== 'string') return { ok: false, code: 'invalid_body' }

  const content = body.content.trim()
  if (content.length === 0) return { ok: false, code: 'empty_content' }
  if (countChars(content) > MAX_LENGTH) return { ok: false, code: 'too_long' }

  return { ok: true, content }
}

/**
 * 校验 PATCH /api/posts/:id 的请求体。
 * `liked` / `bookmarked` 出现就必须是布尔值，且至少要出现一个。
 */
export function validatePostPatch(input: unknown): PatchValidation {
  const body = asRecord(input)
  if (!body) return { ok: false, code: 'invalid_body' }

  const patch: PostPatch = {}
  let touched = false

  for (const key of ['liked', 'bookmarked'] as const) {
    if (!(key in body)) continue
    const value = body[key]
    if (typeof value !== 'boolean') return { ok: false, code: 'invalid_body' }
    patch[key] = value
    touched = true
  }

  if (!touched) return { ok: false, code: 'invalid_body' }
  return { ok: true, patch }
}

/**
 * 校验 POST /api/posts/:id/repost 的请求体。
 * 纯转发允许没有 body、没有 content 或 content 全为空白，此时返回空字符串。
 */
export function validateRepostContent(input: unknown): RepostValidation {
  if (input === undefined || input === null) return { ok: true, content: '' }

  const body = asRecord(input)
  if (!body) return { ok: false, code: 'invalid_body' }

  const raw = body.content
  if (raw === undefined) return { ok: true, content: '' }
  if (typeof raw !== 'string') return { ok: false, code: 'invalid_body' }

  const content = raw.trim()
  if (countChars(content) > MAX_LENGTH) return { ok: false, code: 'too_long' }

  return { ok: true, content }
}
