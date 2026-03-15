import { useCallback, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { ArrowUp, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop?: () => void
  loading?: boolean
  disabled?: boolean
}

export function InputArea({
  value,
  onChange,
  onSend,
  onStop,
  loading = false,
  disabled = false,
}: InputAreaProps) {
  const canSend = value.trim().length > 0 && !loading && !disabled

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (canSend) {
          onSend()
        }
      }
    },
    [canSend, onSend],
  )

  return (
    <div className="border-t border-border bg-background px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="relative flex-1">
          <TextareaAutosize
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            minRows={1}
            maxRows={6}
            disabled={disabled}
            className={cn(
              'w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm leading-relaxed text-foreground',
              'placeholder:text-muted-foreground',
              'focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-colors',
            )}
          />
        </div>

        {loading && onStop ? (
          <Button
            variant="outline"
            size="icon"
            onClick={onStop}
            className="mb-0.5 shrink-0 rounded-xl"
            aria-label="Stop generating"
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={onSend}
            disabled={!canSend}
            className="mb-0.5 shrink-0 rounded-xl"
            aria-label="Send message"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
