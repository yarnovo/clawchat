import { cleanup, render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from '../responsive-dialog'

let mediaQueryMatches = true

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => mediaQueryMatches,
}))

afterEach(() => {
  cleanup()
})

function TestDialog({ open }: { open: boolean }) {
  return (
    <ResponsiveDialog open={open} onOpenChange={() => {}}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Test Title</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <p>Dialog body content</p>
        <ResponsiveDialogFooter>
          <button>OK</button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

describe('ResponsiveDialog', () => {
  it('renders as Dialog on desktop', () => {
    mediaQueryMatches = true
    render(<TestDialog open={true} />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Title').closest('[data-slot="dialog-title"]')).toBeInTheDocument()
  })

  it('renders as Drawer on mobile', () => {
    mediaQueryMatches = false
    render(<TestDialog open={true} />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Title').closest('[data-slot="drawer-title"]')).toBeInTheDocument()
  })

  it('does not crash when switching from desktop to mobile while open', () => {
    mediaQueryMatches = true
    const { rerender } = render(<TestDialog open={true} />)
    expect(screen.getByText('Test Title').closest('[data-slot="dialog-title"]')).toBeInTheDocument()

    // Switch to mobile — previously crashed with
    // "DialogPortal must be used within Dialog"
    mediaQueryMatches = false
    rerender(<TestDialog open={true} />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('does not crash when switching from mobile to desktop while open', () => {
    mediaQueryMatches = false
    const { rerender } = render(<TestDialog open={true} />)
    expect(screen.getByText('Test Title').closest('[data-slot="drawer-title"]')).toBeInTheDocument()

    mediaQueryMatches = true
    rerender(<TestDialog open={true} />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })
})
