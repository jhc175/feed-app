import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppBackdrop from '../AppBackdrop.vue'

describe('AppBackdrop', () => {
  it('整体从无障碍树中隐藏', () => {
    const wrapper = mount(AppBackdrop)

    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })

  it('只承载装饰，不渲染任何可见文本', () => {
    const wrapper = mount(AppBackdrop)

    expect(wrapper.text()).toBe('')
  })

  it('包含光晕、网格、弧线与纸纹四类装饰层', () => {
    const wrapper = mount(AppBackdrop)

    expect(wrapper.findAll('.backdrop__glow')).toHaveLength(2)
    expect(wrapper.find('.backdrop__grid').exists()).toBe(true)
    expect(wrapper.find('.backdrop__arcs').exists()).toBe(true)
    expect(wrapper.find('.backdrop__grain').exists()).toBe(true)
  })

  it('不提供任何可聚焦元素', () => {
    const wrapper = mount(AppBackdrop)

    expect(wrapper.findAll('button, a, input, textarea, [tabindex]')).toHaveLength(0)
  })
})
