import { useEffect, useRef, useState, type RefObject } from "react"

/** Returns [ref, scrolled] — attach ref to the scroll container. */
export function useScrolled<T extends HTMLElement = HTMLDivElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 0)
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  return [ref, scrolled]
}
