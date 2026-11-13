import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { Post } from '../../types/post'
import PostCard from '../PostCard.vue'

const NOW = new Date(2026, 10, 13, 10, 0, 0).getTime()

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    content: '第一行\n第二行 🐣',
    createdAt: NOW - 5 * 60 * 1000,
    liked: false,
    bookmarked: false,
    repostOf: null,
    repostCount: 0,
    ...overrides
  }
}

const SOURCE = { id: 'src', content: '原帖的一句话', createdAt: NOW - 60 * 60 * 1000 }

describe('PostCard', () => {
  it('完整渲染正文，保留换行', () => {
    const wrapper = mount(PostCard, { props: { post: makePost(), now: NOW } })

    expect(wrapper.find('[data-testid="post-content"]').element.textContent).toBe('第一行\n第二行 🐣')
  })

  it('按传入的当前时间显示相对时间', () => {
    const wrapper = mount(PostCard, { props: { post: makePost(), now: NOW } })

    expect(wrapper.find('[data-testid="post-time"]').text()).toBe('5 分钟前')
  })

  it('未点赞时显示空心状态，点击后向父级抛出事件', async () => {
    const wrapper = mount(PostCard, { props: { post: makePost(), now: NOW } })
    const likeButton = wrapper.find('[data-testid="post-like"]')

    expect(likeButton.attributes('aria-pressed')).toBe('false')
    expect(wrapper.find('[data-testid="post-like-count"]').text()).toBe('0')

    await likeButton.trigger('click')

    expect(wrapper.emitted('toggle-like')).toEqual([['p1']])
  })

  it('已点赞时按钮呈按下状态并显示计数 1', () => {
    const wrapper = mount(PostCard, { props: { post: makePost({ liked: true }), now: NOW } })

    expect(wrapper.find('[data-testid="post-like"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-testid="post-like-count"]').text()).toBe('1')
  })

  it('点击收藏按钮抛出 toggle-bookmark 事件', async () => {
    const wrapper = mount(PostCard, { props: { post: makePost(), now: NOW } })
    const bookmark = wrapper.find('[data-testid="post-bookmark"]')

    expect(bookmark.attributes('aria-pressed')).toBe('false')
    expect(bookmark.attributes('aria-label')).toBe('收藏')
    expect(bookmark.classes()).not.toContain('is-bookmarked')

    await bookmark.trigger('click')

    expect(wrapper.emitted('toggle-bookmark')).toEqual([['p1']])
  })

  it('已收藏时按钮呈选中态', () => {
    const wrapper = mount(PostCard, {
      props: { post: makePost({ bookmarked: true }), now: NOW }
    })
    const bookmark = wrapper.find('[data-testid="post-bookmark"]')

    expect(bookmark.attributes('aria-pressed')).toBe('true')
    expect(bookmark.attributes('aria-label')).toBe('取消收藏')
    expect(bookmark.classes()).toContain('is-bookmarked')
  })

  it('点击转发按钮抛出 repost 事件并显示转发计数', async () => {
    const wrapper = mount(PostCard, {
      props: { post: makePost({ repostCount: 3 }), now: NOW }
    })
    const repost = wrapper.find('[data-testid="post-repost"]')

    expect(repost.attributes('aria-label')).toBe('转发')
    expect(repost.attributes('title')).toBe('转发')
    expect(wrapper.find('[data-testid="post-repost-count"]').text()).toBe('3')

    await repost.trigger('click')

    expect(wrapper.emitted('repost')).toEqual([['p1']])
  })

  it('带 repostOf 的帖子渲染引用块', () => {
    const wrapper = mount(PostCard, {
      props: { post: makePost({ content: '我的转发语', repostOf: SOURCE }), now: NOW }
    })

    expect(wrapper.find('[data-testid="post-quote"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="post-quote-content"]').text()).toBe('原帖的一句话')
    expect(wrapper.find('[data-testid="post-content"]').text()).toBe('我的转发语')
  })

  it('原创帖子不渲染引用块', () => {
    const wrapper = mount(PostCard, { props: { post: makePost(), now: NOW } })

    expect(wrapper.find('[data-testid="post-quote"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="post-quote-content"]').exists()).toBe(false)
  })

  it('纯转发不渲染空的正文段落', () => {
    const wrapper = mount(PostCard, {
      props: { post: makePost({ content: '', repostOf: SOURCE }), now: NOW }
    })

    expect(wrapper.find('[data-testid="post-content"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="post-quote"]').exists()).toBe(true)
  })

  it('动作按钮顺序为转发、点赞、收藏、删除', () => {
    const wrapper = mount(PostCard, { props: { post: makePost(), now: NOW } })

    const order = wrapper
      .findAll('.post__actions button')
      .map((button) => button.attributes('data-testid'))

    expect(order).toEqual(['post-repost', 'post-like', 'post-bookmark', 'post-delete'])
  })

  it('删除确认文案包含正文预览', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(PostCard, { props: { post: makePost({ content: '要被删掉' }), now: NOW } })

    await wrapper.find('[data-testid="post-delete"]').trigger('click')

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(String(confirmSpy.mock.calls[0][0])).toContain('要被删掉')
    expect(wrapper.emitted('delete')).toEqual([['p1']])
  })

  it('纯转发时删除确认文案回退到原帖内容', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(PostCard, {
      props: { post: makePost({ content: '', repostOf: SOURCE }), now: NOW }
    })

    await wrapper.find('[data-testid="post-delete"]').trigger('click')

    const message = String(confirmSpy.mock.calls[0][0])
    expect(message).toContain('原帖的一句话')
    expect(message.trim().endsWith('原帖的一句话')).toBe(true)
  })

  it('取消确认时不抛出删除事件', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(PostCard, { props: { post: makePost(), now: NOW } })

    await wrapper.find('[data-testid="post-delete"]').trigger('click')

    expect(wrapper.emitted('delete')).toBeUndefined()
  })
})
