import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createPost } from '../../lib/api'
import { usePostsStore } from '../../stores/posts'
import type { Post } from '../../types/post'
import Composer from '../Composer.vue'

vi.mock('../../lib/api')

const createPostMock = vi.mocked(createPost)

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'server-1',
    content: '一条短文',
    createdAt: 2_000,
    liked: false,
    bookmarked: false,
    repostOf: null,
    repostCount: 0,
    ...overrides
  }
}

function mountComposer() {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false })
  const wrapper = mount(Composer, { global: { plugins: [pinia] } })
  return { wrapper, store: usePostsStore() }
}

type Wrapper = ReturnType<typeof mountComposer>['wrapper']

function input(wrapper: Wrapper) {
  return wrapper.find('[data-testid="composer-input"]')
}

function draftValue(wrapper: Wrapper): string {
  return (input(wrapper).element as HTMLTextAreaElement).value
}

describe('Composer', () => {
  it('初始状态计数归零且发布按钮禁用', () => {
    const { wrapper } = mountComposer()

    expect(wrapper.find('[data-testid="composer-counter"]').text()).toBe('0 / 280')
    expect(wrapper.find('[data-testid="composer-submit"]').attributes('disabled')).toBeDefined()
  })

  it('输入内容后计数更新且按钮可用', async () => {
    const { wrapper } = mountComposer()

    await input(wrapper).setValue('你好 Chirp')

    expect(wrapper.find('[data-testid="composer-counter"]').text()).toBe('8 / 280')
    expect(wrapper.find('[data-testid="composer-submit"]').attributes('disabled')).toBeUndefined()
  })

  it('超过 240 字进入提醒态，超过 280 字进入超限态并禁用发布', async () => {
    const { wrapper } = mountComposer()

    await input(wrapper).setValue('字'.repeat(250))
    expect(wrapper.find('[data-testid="composer-counter"]').classes()).toContain('is-warn')

    await input(wrapper).setValue('字'.repeat(300))
    expect(wrapper.find('[data-testid="composer-counter"]').classes()).toContain('is-over')
    expect(wrapper.find('[data-testid="composer-submit"]').attributes('disabled')).toBeDefined()
  })

  it('纯空格不算有效内容', async () => {
    const { wrapper } = mountComposer()

    await input(wrapper).setValue('    ')

    expect(wrapper.find('[data-testid="composer-submit"]').attributes('disabled')).toBeDefined()
  })

  it('点击发布后清空输入、写入 store 并提示成功', async () => {
    createPostMock.mockImplementation(async (content: string) =>
      makePost({ id: 'server-1', content })
    )
    const { wrapper, store } = mountComposer()

    await input(wrapper).setValue('  第一条短文  ')
    await wrapper.find('[data-testid="composer-submit"]').trigger('click')
    await flushPromises()

    expect(createPostMock).toHaveBeenCalledWith('第一条短文')
    expect(store.posts).toHaveLength(1)
    expect(store.posts[0].content).toBe('第一条短文')
    expect(draftValue(wrapper)).toBe('')
    expect(wrapper.emitted('notify')).toEqual([['已发布', 'success']])
  })

  it('Ctrl + Enter 可以快捷发布', async () => {
    createPostMock.mockImplementation(async (content: string) => makePost({ content }))
    const { wrapper, store } = mountComposer()

    await input(wrapper).setValue('快捷发布')
    await input(wrapper).trigger('keydown', { key: 'Enter', ctrlKey: true })
    await flushPromises()

    expect(createPostMock).toHaveBeenCalledTimes(1)
    expect(store.posts).toHaveLength(1)
  })

  it('单独按 Enter 不会发布', async () => {
    const { wrapper, store } = mountComposer()

    await input(wrapper).setValue('换行用的')
    await input(wrapper).trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(createPostMock).not.toHaveBeenCalled()
    expect(store.posts).toHaveLength(0)
  })

  it('接口失败时保留草稿并提示失败', async () => {
    createPostMock.mockRejectedValue(new Error('offline'))
    const { wrapper, store } = mountComposer()

    await input(wrapper).setValue('发不出去')
    await wrapper.find('[data-testid="composer-submit"]').trigger('click')
    await flushPromises()

    expect(store.posts).toHaveLength(0)
    expect(draftValue(wrapper)).toBe('发不出去')
    expect(wrapper.emitted('notify')).toEqual([['发布失败：无法连接后端服务', 'error']])
  })

  it('提交过程中按钮禁用并显示发布中', async () => {
    let resolveCreate: (post: Post) => void = () => {}
    createPostMock.mockImplementation(
      () =>
        new Promise<Post>((resolve) => {
          resolveCreate = resolve
        })
    )
    const { wrapper } = mountComposer()

    await input(wrapper).setValue('慢一点')
    await wrapper.find('[data-testid="composer-submit"]').trigger('click')

    const button = wrapper.find('[data-testid="composer-submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toBe('发布中…')

    resolveCreate(makePost({ id: 'server-1', content: '慢一点' }))
    await flushPromises()

    expect(wrapper.find('[data-testid="composer-submit"]').text()).toBe('发布')
    expect(draftValue(wrapper)).toBe('')
  })
})
