import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  visible: boolean
}

export function TypingIndicator({ visible }: TypingIndicatorProps) {
  if (!visible) return null

  return (
    <div className="flex justify-start px-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl">
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-1">
            <span
              className={cn(
                'size-2 rounded-full bg-muted-foreground/40',
                'animate-[typing-bounce_1.4s_ease-in-out_infinite]',
              )}
            />
            <span
              className={cn(
                'size-2 rounded-full bg-muted-foreground/40',
                'animate-[typing-bounce_1.4s_ease-in-out_0.2s_infinite]',
              )}
            />
            <span
              className={cn(
                'size-2 rounded-full bg-muted-foreground/40',
                'animate-[typing-bounce_1.4s_ease-in-out_0.4s_infinite]',
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
