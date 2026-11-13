import { MAX_LENGTH, countChars } from '../src/lib/text'

export type ValidationCode = 'invalid_body' | 'empty_content' | 'too_long'

export type ContentValidation =
  | { ok: true; content: string }
  | { ok: false; code: ValidationCode }

export type LikedValidation =
  | { ok: true; liked: boolean }
  | { ok: false; code: 'invalid_body' }

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

/** 校验 PATCH /api/posts/:id 的请求体。 */
export function validateLiked(input: unknown): LikedValidation {
  const body = asRecord(input)
  if (!body || typeof body.liked !== 'boolean') return { ok: false, code: 'invalid_body' }
  return { ok: true, liked: body.liked }
}
