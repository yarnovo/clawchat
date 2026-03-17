import { cleanup, render, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createRef } from 'react'
import { ScrollArea, ScrollBar } from '../scroll-area'

// 默认 mock 为桌面（非触屏）
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
})

describe('ScrollArea', () => {
  // ── 定制点 1: Root 结构 ──

  it('root 包含 overflow-hidden 和 group/scroll-area', () => {
    const { container } = render(
      <ScrollArea style={{ height: 100 }}>
        <div style={{ height: 300 }}>content</div>
      </ScrollArea>,
    )
    const root = container.querySelector('[data-slot="scroll-area"]')!
    expect(root.className).toContain('overflow-hidden')
    expect(root.className).toContain('group/scroll-area')
  })

  // ── 定制点 2 & 3: ScrollBar 样式（源码级检查） ──

  it('ScrollBar 源码包含 hover 和 scrolling 显示逻辑', async () => {
    const source = await import('../scroll-area?raw')
    const code = (source as { default: string }).default
    expect(code).toContain('opacity-0')
    expect(code).toContain('group-hover/scroll-area:opacity-100')
    expect(code).toContain('group-data-scrolling/scroll-area:opacity-100')
  })

  // ── 定制点 4: viewportRef ──

  it('viewportRef 指向 viewport 元素', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <ScrollArea viewportRef={ref} style={{ height: 100 }}>
        <div style={{ height: 300 }}>content</div>
      </ScrollArea>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current?.getAttribute('data-slot')).toBe('scroll-area-viewport')
  })

  // ── 触屏滚动监听 ──

  describe('触屏滚动监听', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(pointer: coarse)',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      })
    })

    it('触屏设备滚动时添加 data-scrolling，停止后移除', () => {
      vi.useFakeTimers()

      const { container } = render(
        <ScrollArea style={{ height: 100 }}>
          <div style={{ height: 300 }}>content</div>
        </ScrollArea>,
      )

      const root = container.querySelector('[data-slot="scroll-area"]')!
      const viewport = container.querySelector('[data-slot="scroll-area-viewport"]')!

      fireEvent.scroll(viewport)
      expect(root.hasAttribute('data-scrolling')).toBe(true)

      act(() => { vi.advanceTimersByTime(800) })
      expect(root.hasAttribute('data-scrolling')).toBe(false)

      vi.useRealTimers()
    })

    it('桌面设备不注册滚动监听', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      })

      const { container } = render(
        <ScrollArea style={{ height: 100 }}>
          <div style={{ height: 300 }}>content</div>
        </ScrollArea>,
      )

      const root = container.querySelector('[data-slot="scroll-area"]')!
      const viewport = container.querySelector('[data-slot="scroll-area-viewport"]')!

      fireEvent.scroll(viewport)
      expect(root.hasAttribute('data-scrolling')).toBe(false)
    })
  })
})
