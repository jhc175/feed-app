import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deletePost, repostPost, updatePost } from '../../lib/api'
import { usePostsStore } from '../../stores/posts'
import type { Post } from '../../types/post'
import PostCard from '../PostCard.vue'
import Timeline from '../Timeline.vue'

vi.mock('../../lib/api')

const deletePostMock = vi.mocked(deletePost)
const updatePostMock = vi.mocked(updatePost)
const repostPostMock = vi.mocked(repostPost)

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    content: '一条短文',
    createdAt: 1_000,
    liked: false,
    bookmarked: false,
    repostOf: null,
    repostCount: 0,
    ...overrides
  }
}

function mountTimeline(posts: Post[] = [], loading = false, bookmarkedOnly = false) {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false })
  const store = usePostsStore()
  store.posts = posts
  store.loading = loading
  store.bookmarkedOnly = bookmarkedOnly
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

  it('同一条连续两次删除只调用一次 deletePost 且只弹一次 toast', async () => {
    deletePostMock.mockResolvedValue(undefined)
    const { wrapper, store } = mountTimeline([makePost()])
    const card = wrapper.findComponent(PostCard)

    card.vm.$emit('delete', 'p1')
    card.vm.$emit('delete', 'p1')
    await flushPromises()

    expect(deletePostMock).toHaveBeenCalledTimes(1)
    expect(store.posts).toHaveLength(0)
    expect(wrapper.emitted('notify')).toEqual([['已删除', 'success']])
  })

  it('删除完成后守卫解除，可以继续删除其它帖子', async () => {
    deletePostMock.mockResolvedValue(undefined)
    const { wrapper, store } = mountTimeline([
      makePost({ id: 'p1' }),
      makePost({ id: 'p2', content: '另一条' })
    ])
    wrapper.findComponent(PostCard).vm.$emit('delete', 'p1')
    await flushPromises()
    wrapper.findComponent(PostCard).vm.$emit('delete', 'p2')
    await flushPromises()

    expect(deletePostMock).toHaveBeenCalledTimes(2)
    expect(store.posts).toHaveLength(0)
  })

  it('点赞事件会切换对应帖子的状态', async () => {
    updatePostMock.mockImplementation(async (id: string, patch) =>
      makePost({ id, liked: Boolean(patch.liked) })
    )
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('toggle-like', 'p1')
    await flushPromises()

    expect(updatePostMock).toHaveBeenCalledWith('p1', { liked: true })
    expect(store.posts[0].liked).toBe(true)
  })

  it('点赞失败时提示错误且状态不变', async () => {
    updatePostMock.mockRejectedValue(new Error('offline'))
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('toggle-like', 'p1')
    await flushPromises()

    expect(store.posts[0].liked).toBe(false)
    expect(wrapper.emitted('notify')).toEqual([['操作失败：服务端未响应', 'error']])
  })
})

describe('Timeline 收藏', () => {
  it('收藏成功后提示「已收藏」并切换状态', async () => {
    updatePostMock.mockImplementation(async (id: string, patch) =>
      makePost({ id, bookmarked: Boolean(patch.bookmarked) })
    )
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('toggle-bookmark', 'p1')
    await flushPromises()

    expect(updatePostMock).toHaveBeenCalledWith('p1', { bookmarked: true })
    expect(store.posts[0].bookmarked).toBe(true)
    expect(wrapper.emitted('notify')).toEqual([['已收藏', 'success']])
  })

  it('取消收藏后提示「已取消收藏」', async () => {
    updatePostMock.mockImplementation(async (id: string, patch) =>
      makePost({ id, bookmarked: Boolean(patch.bookmarked) })
    )
    const { wrapper } = mountTimeline([makePost({ bookmarked: true })])

    wrapper.findComponent(PostCard).vm.$emit('toggle-bookmark', 'p1')
    await flushPromises()

    expect(updatePostMock).toHaveBeenCalledWith('p1', { bookmarked: false })
    expect(wrapper.emitted('notify')).toEqual([['已取消收藏', 'success']])
  })

  it('收藏失败时提示错误且状态不变', async () => {
    updatePostMock.mockRejectedValue(new Error('offline'))
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('toggle-bookmark', 'p1')
    await flushPromises()

    expect(store.posts[0].bookmarked).toBe(false)
    expect(wrapper.emitted('notify')).toEqual([['操作失败：服务端未响应', 'error']])
  })

  it('点「收藏」筛选后只渲染已收藏的卡片，点「全部」恢复', async () => {
    const { wrapper } = mountTimeline([
      makePost({ id: 'plain', content: '未收藏', createdAt: 1_000 }),
      makePost({ id: 'kept', content: '已收藏', createdAt: 2_000, bookmarked: true })
    ])

    expect(wrapper.findAllComponents(PostCard)).toHaveLength(2)

    await wrapper.find('[data-testid="filter-bookmarked"]').trigger('click')

    const filtered = wrapper.findAllComponents(PostCard)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].props('post').id).toBe('kept')
    expect(wrapper.find('[data-testid="filter-bookmarked"]').classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="filter-bookmarked"]').attributes('aria-pressed')).toBe('true')

    await wrapper.find('[data-testid="filter-all"]').trigger('click')

    expect(wrapper.findAllComponents(PostCard)).toHaveLength(2)
    expect(wrapper.find('[data-testid="filter-all"]').classes()).toContain('is-active')
  })

  it('「收藏」筛选按钮显示收藏数量', () => {
    const { wrapper } = mountTimeline([
      makePost({ id: 'a', bookmarked: true }),
      makePost({ id: 'b', bookmarked: true }),
      makePost({ id: 'c' })
    ])

    expect(wrapper.find('[data-testid="filter-bookmarked"]').text()).toContain('2')
  })

  it('收藏筛选下没有收藏时显示专属空状态文案', () => {
    const { wrapper } = mountTimeline([makePost()], false, true)

    const empty = wrapper.find('[data-testid="empty-state"]')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('还没有收藏任何内容')
    expect(empty.text()).not.toContain('还没有任何短文')
  })

  it('全部视图下空状态保持原文案', () => {
    const { wrapper } = mountTimeline()

    const empty = wrapper.find('[data-testid="empty-state"]')
    expect(empty.text()).toContain('还没有任何短文')
  })
})

describe('Timeline 转发', () => {
  it('转发成功后提示「已转发」并把新帖放到首位', async () => {
    repostPostMock.mockResolvedValue(
      makePost({
        id: 'r1',
        content: '',
        createdAt: 5_000,
        repostOf: { id: 'p1', content: '一条短文', createdAt: 1_000 }
      })
    )
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('repost', 'p1')
    await flushPromises()

    expect(repostPostMock).toHaveBeenCalledWith('p1')
    expect(store.posts[0].id).toBe('r1')
    expect(store.posts[1].repostCount).toBe(1)
    expect(wrapper.emitted('notify')).toEqual([['已转发', 'success']])
  })

  it('转发失败时提示错误且列表不变', async () => {
    repostPostMock.mockRejectedValue(new Error('offline'))
    const { wrapper, store } = mountTimeline([makePost()])

    wrapper.findComponent(PostCard).vm.$emit('repost', 'p1')
    await flushPromises()

    expect(store.posts.map((post) => post.id)).toEqual(['p1'])
    expect(wrapper.emitted('notify')).toEqual([['转发失败：服务端未响应', 'error']])
  })
})
