import {
  type ReactNode,
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react"
import type { MotionValue } from "framer-motion"
import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"

const EDGE_ZONE = 30
const COMPLETE_RATIO = 0.4
const VELOCITY_THRESHOLD = 300

/** cubic ease-out: 1 - (1-t)^3 */
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Android 系统返回键监听。在 AppShell 顶层调用一次。
 */
export function useBackNavigation() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (Capacitor.getPlatform() !== "android") return

    const listener = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        void App.exitApp()
      }
    })

    return () => {
      void listener.then((h) => h.remove())
    }
  }, [])
}

// ── Animated back context ──────────────────────────────────────────

const AnimatedBackContext = createContext<(() => void) | null>(null)

/**
 * 获取带动画的返回函数。
 * 在 SwipeBackView 内部使用时返回动画式返回，否则 fallback 到 history.back()。
 */
export function useAnimatedBack() {
  const animateBack = useContext(AnimatedBackContext)
  return useCallback(() => {
    if (animateBack) {
      animateBack()
    } else {
      window.history.back()
    }
  }, [animateBack])
}

// ── rAF animation helper ───────────────────────────────────────────

interface AnimationHandle {
  cancel: () => void
}

function animateTo(
  from: number,
  to: number,
  duration: number,
  onUpdate: (value: number) => void,
  onComplete?: () => void,
): AnimationHandle {
  const startTime = performance.now()
  let rafId = 0
  let cancelled = false

  const tick = () => {
    if (cancelled) return
    const elapsed = performance.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const value = from + (to - from) * easeOut(progress)
    onUpdate(value)
    if (progress < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      onComplete?.()
    }
  }

  rafId = requestAnimationFrame(tick)
  return {
    cancel: () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    },
  }
}

// ── SwipeBackView ──────────────────────────────────────────────────

interface SwipeBackViewProps {
  children: ReactNode
  /** 外部 MotionValue，用于联动遮罩透明度 */
  dragX?: MotionValue<number>
  className?: string
}

/**
 * 左边缘右滑返回视图
 *
 * 不依赖 framer-motion 做定位/动画，使用原生 inline style + rAF。
 * inline style 在 DOM 创建时就生效，彻底解决 WKWebView 首帧闪烁。
 *
 * - 挂载时 inline style 保证在屏外 → rAF 动画推入
 * - 左边缘 30px 起手 → 跟手右移 → 松手判定滑出/回弹
 * - 通过 AnimatedBackContext 暴露 animateBack 给子组件
 */
export function SwipeBackView({
  children,
  dragX,
  className,
}: SwipeBackViewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const posRef = useRef(window.innerWidth)
  const tracking = useRef(false)
  const startX = useRef(0)
  const startTime = useRef(0)
  const navigating = useRef(false)
  const animHandle = useRef<AnimationHandle | null>(null)

  const setPosition = useCallback(
    (val: number) => {
      posRef.current = val
      dragX?.set(val)
      const el = ref.current
      if (!el) return
      el.style.transform = `translateX(${val}px)`
      el.style.boxShadow =
        val > 5 ? "-10px 0 30px rgba(0,0,0,0.12)" : "none"
    },
    [dragX],
  )

  const stopAnimation = useCallback(() => {
    animHandle.current?.cancel()
    animHandle.current = null
  }, [])

  // Push-in animation
  useLayoutEffect(() => {
    // inline style 已经把元素放在屏外，同步设 dragX 让遮罩也正确
    dragX?.set(window.innerWidth)
    animHandle.current = animateTo(
      window.innerWidth,
      0,
      350,
      setPosition,
    )
    return stopAnimation
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 编程式滑出返回（返回按钮用）
  const animateBack = useCallback(() => {
    if (navigating.current) return
    navigating.current = true
    stopAnimation()
    animHandle.current = animateTo(
      posRef.current,
      window.innerWidth,
      300,
      setPosition,
      () => {
        animHandle.current = null
        navigating.current = false
        window.history.back()
      },
    )
  }, [setPosition, stopAnimation])

  // Touch event handlers
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!("ontouchstart" in window)) return

    const onTouchStart = (e: TouchEvent) => {
      if (navigating.current) return
      const touch = e.touches[0]
      if (touch.clientX <= EDGE_ZONE) {
        stopAnimation()
        tracking.current = true
        startX.current = touch.clientX
        startTime.current = Date.now()
        setPosition(0)
        e.stopPropagation()
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current) return
      const dx = Math.max(0, e.touches[0].clientX - startX.current)
      setPosition(dx)
      e.stopPropagation()
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking.current) return
      tracking.current = false
      e.stopPropagation()

      const dx = e.changedTouches[0].clientX - startX.current
      const dt = (Date.now() - startTime.current) / 1000
      const velocity = dx / dt
      const sw = window.innerWidth

      if (dx > sw * COMPLETE_RATIO || velocity > VELOCITY_THRESHOLD) {
        navigating.current = true
        animHandle.current = animateTo(
          posRef.current,
          sw,
          300,
          setPosition,
          () => {
            animHandle.current = null
            navigating.current = false
            window.history.back()
          },
        )
      } else {
        animHandle.current = animateTo(
          posRef.current,
          0,
          300,
          setPosition,
        )
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: true })
    el.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      stopAnimation()
    }
  }, [setPosition, stopAnimation])

  return (
    <AnimatedBackContext.Provider value={animateBack}>
      <div
        ref={ref}
        style={{
          transform: `translateX(${window.innerWidth}px)`,
          willChange: "transform",
        }}
        className={`relative z-10 bg-background ${className ?? ""}`}
      >
        {children}
      </div>
    </AnimatedBackContext.Provider>
  )
}
