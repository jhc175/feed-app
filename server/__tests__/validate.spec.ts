import { describe, expect, it } from 'vitest'
import { validateContent, validateLiked } from '../validate'

describe('validateContent', () => {
  it('合法内容通过并原样返回', () => {
    expect(validateContent({ content: '你好 chirp' })).toEqual({ ok: true, content: '你好 chirp' })
  })

  it('前后空白会被 trim', () => {
    expect(validateContent({ content: '  你好  ' })).toEqual({ ok: true, content: '你好' })
  })

  it('body 为 null 时是 invalid_body', () => {
    expect(validateContent(null)).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('body 为数组时是 invalid_body', () => {
    expect(validateContent([{ content: 'x' }])).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('body 为字符串时是 invalid_body', () => {
    expect(validateContent('content=x')).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('缺少 content 字段时是 invalid_body', () => {
    expect(validateContent({})).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('content 不是字符串时是 invalid_body', () => {
    expect(validateContent({ content: 123 })).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('空字符串是 empty_content', () => {
    expect(validateContent({ content: '' })).toEqual({ ok: false, code: 'empty_content' })
  })

  it('纯空白是 empty_content', () => {
    expect(validateContent({ content: '   \n\t  ' })).toEqual({ ok: false, code: 'empty_content' })
  })

  it('恰好 280 码点通过', () => {
    expect(validateContent({ content: 'a'.repeat(280) })).toEqual({ ok: true, content: 'a'.repeat(280) })
  })

  it('281 码点是 too_long', () => {
    expect(validateContent({ content: 'a'.repeat(281) })).toEqual({ ok: false, code: 'too_long' })
  })

  it('emoji 按码点计数，280 个 emoji 通过', () => {
    expect(validateContent({ content: '😀'.repeat(280) })).toEqual({ ok: true, content: '😀'.repeat(280) })
  })

  it('281 个 emoji 是 too_long', () => {
    expect(validateContent({ content: '😀'.repeat(281) })).toEqual({ ok: false, code: 'too_long' })
  })
})

describe('validateLiked', () => {
  it('true 通过', () => {
    expect(validateLiked({ liked: true })).toEqual({ ok: true, liked: true })
  })

  it('false 通过', () => {
    expect(validateLiked({ liked: false })).toEqual({ ok: true, liked: false })
  })

  it('字符串是 invalid_body', () => {
    expect(validateLiked({ liked: 'yes' })).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('缺少字段是 invalid_body', () => {
    expect(validateLiked({})).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('body 为 null 是 invalid_body', () => {
    expect(validateLiked(null)).toEqual({ ok: false, code: 'invalid_body' })
  })
})
