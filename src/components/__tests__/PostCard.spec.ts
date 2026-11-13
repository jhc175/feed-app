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
    ...overrides
  }
}

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

  it('确认后抛出删除事件', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(PostCard, { props: { post: makePost(), now: NOW } })

    await wrapper.find('[data-testid="post-delete"]').trigger('click')

    expect(wrapper.emitted('delete')).toEqual([['p1']])
  })

  it('取消确认时不抛出删除事件', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(PostCard, { props: { post: makePost(), now: NOW } })

    await wrapper.find('[data-testid="post-delete"]').trigger('click')

    expect(wrapper.emitted('delete')).toBeUndefined()
  })
})
