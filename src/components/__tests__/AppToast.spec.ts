import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppToast from '../AppToast.vue'

describe('AppToast', () => {
  it('可见时展示文案并标记为可见状态', () => {
    const wrapper = mount(AppToast, {
      props: { message: '已发布', tone: 'success', visible: true }
    })
    const toast = wrapper.find('[data-testid="toast"]')

    expect(toast.text()).toBe('已发布')
    expect(toast.classes()).toContain('is-visible')
    expect(toast.attributes('data-tone')).toBe('success')
    expect(toast.attributes('role')).toBe('status')
  })

  it('隐藏时移除可见状态', () => {
    const wrapper = mount(AppToast, {
      props: { message: '已发布', tone: 'success', visible: false }
    })

    expect(wrapper.find('[data-testid="toast"]').classes()).not.toContain('is-visible')
  })

  it('失败提示使用错误色调', () => {
    const wrapper = mount(AppToast, {
      props: { message: '本地存储已满', tone: 'error', visible: true }
    })

    expect(wrapper.find('[data-testid="toast"]').attributes('data-tone')).toBe('error')
  })
})
