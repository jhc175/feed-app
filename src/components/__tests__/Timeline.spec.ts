import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deletePost, setPostLiked } from '../../lib/api'
import { usePostsStore } from '../../stores/posts'
import type { Post } from '../../types/post'
import PostCard from '../PostCard.vue'
import Timeline from '../Timeline.vue'

vi.mock('../../lib/api')

const deletePostMock = vi.mocked(deletePost)
const setPostLikedMock = vi.mocked(setPostLiked)

function makePost(overrides: Partial<Post> = {}): Post {
  return { id: 'p1', content: '一条短文', createdAt: 1_000, liked: false, ...overrides }
}

function mountTimeline(posts: Post[] = [], loading = false) {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false })
  const store = usePostsStore()
  store.posts = posts
  store.loading = loading
  const wrapper = mount(Timeline, { global: { plugins: [pinia] } })
  return { wrapper, store }
}

beforeEach(() => {
  // 只伪造 interval，避免影响 flushPromises 依赖的 setImmediate
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
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

  it('加载中且没有内容时展示加载占位', () => {
    const { wrapper } = mountTimeline([], true)

    expect(wrapper.find('[data-testid="loading-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(false)
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

  it('删除卡片后从列表移除并提示成功', async () => {
    deletePostMock.mockResolvedValue(undefined)
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('delete', 'p1')
    await flushPromises()

    expect(deletePostMock).toHaveBeenCalledWith('p1')
    expect(store.posts).toHaveLength(0)
    expect(wrapper.emitted('notify')).toEqual([['已删除', 'success']])
  })

  it('删除失败时提示错误且保留卡片', async () => {
    deletePostMock.mockRejectedValue(new Error('offline'))
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('delete', 'p1')
    await flushPromises()

    expect(store.posts).toHaveLength(1)
    expect(wrapper.emitted('notify')).toEqual([['删除失败：服务端未响应', 'error']])
  })

  it('点赞事件会切换对应帖子的状态', async () => {
    setPostLikedMock.mockImplementation(async (id: string, liked: boolean) =>
      makePost({ id, liked })
    )
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('toggle-like', 'p1')
    await flushPromises()

    expect(setPostLikedMock).toHaveBeenCalledWith('p1', true)
    expect(store.posts[0].liked).toBe(true)
  })

  it('点赞失败时提示错误且状态不变', async () => {
    setPostLikedMock.mockRejectedValue(new Error('offline'))
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('toggle-like', 'p1')
    await flushPromises()

    expect(store.posts[0].liked).toBe(false)
    expect(wrapper.emitted('notify')).toEqual([['操作失败：服务端未响应', 'error']])
  })
})
