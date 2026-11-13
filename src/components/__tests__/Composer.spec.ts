import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { usePostsStore } from '../../stores/posts'
import Composer from '../Composer.vue'

function mountComposer() {
  const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false })
  const wrapper = mount(Composer, { global: { plugins: [pinia] } })
  return { wrapper, store: usePostsStore() }
}

function input(wrapper: ReturnType<typeof mountComposer>['wrapper']) {
  return wrapper.find('[data-testid="composer-input"]')
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

  it('点击发布后写入 store、清空输入并提示成功', async () => {
    const { wrapper, store } = mountComposer()

    await input(wrapper).setValue('  第一条短文  ')
    await wrapper.find('[data-testid="composer-submit"]').trigger('click')

    expect(store.posts).toHaveLength(1)
    expect(store.posts[0].content).toBe('第一条短文')
    expect((input(wrapper).element as HTMLTextAreaElement).value).toBe('')
    expect(wrapper.emitted('notify')).toEqual([['已发布', 'success']])
  })

  it('Ctrl + Enter 可以快捷发布', async () => {
    const { wrapper, store } = mountComposer()

    await input(wrapper).setValue('快捷发布')
    await input(wrapper).trigger('keydown', { key: 'Enter', ctrlKey: true })

    expect(store.posts).toHaveLength(1)
  })

  it('单独按 Enter 不会发布', async () => {
    const { wrapper, store } = mountComposer()

    await input(wrapper).setValue('换行用的')
    await input(wrapper).trigger('keydown', { key: 'Enter' })

    expect(store.posts).toHaveLength(0)
  })

  it('本地存储写入失败时保留草稿并提示失败', async () => {
    const { wrapper, store } = mountComposer()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    await input(wrapper).setValue('写不进去')
    await wrapper.find('[data-testid="composer-submit"]').trigger('click')

    expect(store.posts).toHaveLength(0)
    expect((input(wrapper).element as HTMLTextAreaElement).value).toBe('写不进去')
    expect(wrapper.emitted('notify')?.[0]?.[1]).toBe('error')
  })
})
