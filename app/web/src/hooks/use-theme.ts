import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useMediaQuery } from './use-media-query'

export function useTheme() {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  const resolvedTheme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  return { theme, setTheme, resolvedTheme }
}
