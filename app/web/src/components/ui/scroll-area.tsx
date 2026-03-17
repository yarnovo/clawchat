/**
 * ScrollArea — 基于 shadcn/base-ui，有以下定制（shadcn add --overwrite 后需重新加回）：
 *
 * 1. Root 加 `overflow-hidden` — flex 布局下约束高度让内容可滚动
 * 2. Root 加 `group/scroll-area` + Scrollbar `opacity-0 group-hover:opacity-100` — 桌面 hover 显示
 * 3. Scrollbar `group-data-scrolling:opacity-100` + scroll 监听 — 触屏滚动时显示，800ms 后渐隐
 * 4. `viewportRef` prop — 暴露内部 Viewport ref，供 useScrolled 等外部监听
 */
import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

interface ScrollAreaProps extends ScrollAreaPrimitive.Root.Props {
  viewportRef?: React.Ref<HTMLDivElement>
}

function ScrollArea({
  className,
  children,
  viewportRef,
  ...props
}: ScrollAreaProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(null)

  React.useEffect(() => {
    // 只在触屏设备上监听滚动显示滚动条，桌面用 hover
    if (!window.matchMedia("(pointer: coarse)").matches) return

    const root = rootRef.current
    const viewport = root?.querySelector("[data-slot='scroll-area-viewport']")
    if (!viewport) return

    const onScroll = () => {
      root!.setAttribute("data-scrolling", "")
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        root!.removeAttribute("data-scrolling")
      }, 800)
    }

    viewport.addEventListener("scroll", onScroll, { passive: true })
    return () => viewport.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <ScrollAreaPrimitive.Root
      ref={rootRef}
      data-slot="scroll-area"
      className={cn("group/scroll-area relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px select-none transition-opacity duration-300 data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        "opacity-0 group-hover/scroll-area:opacity-100 group-data-scrolling/scroll-area:opacity-100",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
