import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TopicPicker from './TopicPicker.vue'

describe('TopicPicker', () => {
  it('defaults to no topic and emits the chosen theme', async () => {
    const wrapper = mount(TopicPicker, { props: { modelValue: '' } })
    expect(wrapper.find('.trigger-copy strong').text()).toBe('不设置')
    await wrapper.find('.topic-trigger').trigger('click')
    expect(wrapper.findAll('[data-topic-option]')).toHaveLength(7)
    await wrapper.findAll('[data-topic-option]')[3]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['旅行见闻'])
    expect(wrapper.find('.topic-menu').exists()).toBe(false)
  })

  it('closes with Escape and keeps keyboard navigation available', async () => {
    const wrapper = mount(TopicPicker, { props: { modelValue: '' }, attachTo: document.body })
    await wrapper.find('.topic-trigger').trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.find('.topic-menu').exists()).toBe(true)
    await wrapper.find('.topic-menu').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.topic-menu').exists()).toBe(false)
    wrapper.unmount()
  })
})
