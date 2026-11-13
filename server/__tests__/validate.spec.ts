import { describe, expect, it } from 'vitest'
import { validateContent, validatePostPatch, validateRepostContent } from '../validate'

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

describe('validatePostPatch', () => {
  it('只有 liked 时通过', () => {
    expect(validatePostPatch({ liked: true })).toEqual({ ok: true, patch: { liked: true } })
  })

  it('只有 bookmarked 时通过', () => {
    expect(validatePostPatch({ bookmarked: true })).toEqual({ ok: true, patch: { bookmarked: true } })
  })

  it('两者同时出现且都是布尔时通过', () => {
    expect(validatePostPatch({ liked: true, bookmarked: false })).toEqual({
      ok: true,
      patch: { liked: true, bookmarked: false }
    })
  })

  it('显式的 false 也通过', () => {
    expect(validatePostPatch({ liked: false, bookmarked: true })).toEqual({
      ok: true,
      patch: { liked: false, bookmarked: true }
    })
  })

  it('空对象是 invalid_body', () => {
    expect(validatePostPatch({})).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('只有无关字段是 invalid_body', () => {
    expect(validatePostPatch({ foo: 1 })).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('liked 是字符串时是 invalid_body', () => {
    expect(validatePostPatch({ liked: 'yes' })).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('bookmarked 是数字时是 invalid_body', () => {
    expect(validatePostPatch({ bookmarked: 1 })).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('其中一个字段类型不对时整体是 invalid_body', () => {
    expect(validatePostPatch({ liked: true, bookmarked: 'no' })).toEqual({
      ok: false,
      code: 'invalid_body'
    })
  })

  it('body 为 null 时是 invalid_body', () => {
    expect(validatePostPatch(null)).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('body 为数组时是 invalid_body', () => {
    expect(validatePostPatch([])).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('body 为 undefined 时是 invalid_body', () => {
    expect(validatePostPatch(undefined)).toEqual({ ok: false, code: 'invalid_body' })
  })
})

describe('validateRepostContent', () => {
  it('没有 body 时视为纯转发，内容为空字符串', () => {
    expect(validateRepostContent(undefined)).toEqual({ ok: true, content: '' })
  })

  it('body 为 null 时视为纯转发', () => {
    expect(validateRepostContent(null)).toEqual({ ok: true, content: '' })
  })

  it('空对象时视为纯转发', () => {
    expect(validateRepostContent({})).toEqual({ ok: true, content: '' })
  })

  it('转发语会被 trim', () => {
    expect(validateRepostContent({ content: '  转发语  ' })).toEqual({ ok: true, content: '转发语' })
  })

  it('纯空白的转发语视为纯转发而不是报错', () => {
    expect(validateRepostContent({ content: '   ' })).toEqual({ ok: true, content: '' })
  })

  it('content 不是字符串时是 invalid_body', () => {
    expect(validateRepostContent({ content: 123 })).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('body 不是对象时是 invalid_body', () => {
    expect(validateRepostContent('content=x')).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('body 为数组时是 invalid_body', () => {
    expect(validateRepostContent([{ content: 'x' }])).toEqual({ ok: false, code: 'invalid_body' })
  })

  it('恰好 280 码点通过', () => {
    expect(validateRepostContent({ content: 'a'.repeat(280) })).toEqual({
      ok: true,
      content: 'a'.repeat(280)
    })
  })

  it('281 码点是 too_long', () => {
    expect(validateRepostContent({ content: 'a'.repeat(281) })).toEqual({
      ok: false,
      code: 'too_long'
    })
  })

  it('280 个 emoji 通过', () => {
    expect(validateRepostContent({ content: '😀'.repeat(280) })).toEqual({
      ok: true,
      content: '😀'.repeat(280)
    })
  })

  it('281 个 emoji 是 too_long', () => {
    expect(validateRepostContent({ content: '😀'.repeat(281) })).toEqual({
      ok: false,
      code: 'too_long'
    })
  })
})
