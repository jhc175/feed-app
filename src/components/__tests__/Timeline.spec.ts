import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePostsStore } from '../../stores/posts'
import type { Post } from '../../types/post'
import PostCard from '../PostCard.vue'
import Timeline from '../Timeline.vue'

function makePost(overrides: Partial<Post> = {}): Post {
  return { id: 'p1', content: '一条短文', createdAt: 1_000, liked: false, ...overrides }
}

function mountTimeline(posts: Post[] = []) {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false })
  const store = usePostsStore()
  store.posts = posts
  const wrapper = mount(Timeline, { global: { plugins: [pinia] } })
  return { wrapper, store }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Timeline', () => {
  it('没有内容时展示空状态', () => {
    const { wrapper } = mountTimeline()

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true)
    expect(wrapper.findAllComponents(PostCard)).toHaveLength(0)
  })

  it('按时间倒序渲染全部帖子', () => {
    const { wrapper } = mountTimeline([
      makePost({ id: 'older', content: '更早的', createdAt: 1_000 }),
      makePost({ id: 'newer', content: '更新的', createdAt: 2_000 })
    ])

    const contents = wrapper.findAll('[data-testid="post-content"]').map((node) => node.text())
    expect(contents).toEqual(['更新的', '更早的'])
    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(false)
  })

  it('删除卡片后从列表与存储中移除并提示成功', async () => {
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('delete', 'p1')
    await wrapper.vm.$nextTick()

    expect(store.posts).toHaveLength(0)
    expect(wrapper.emitted('notify')).toEqual([['已删除', 'success']])
  })

  it('删除失败时提示错误且保留卡片', async () => {
    const { wrapper, store } = mountTimeline([makePost()])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    wrapper.findComponent(PostCard).vm.$emit('delete', 'p1')
    await wrapper.vm.$nextTick()

    expect(store.posts).toHaveLength(1)
    expect(wrapper.emitted('notify')?.[0]?.[1]).toBe('error')
  })

  it('点赞事件会切换对应帖子的状态', async () => {
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('toggle-like', 'p1')
    await wrapper.vm.$nextTick()

    expect(store.posts[0].liked).toBe(true)
  })
})
