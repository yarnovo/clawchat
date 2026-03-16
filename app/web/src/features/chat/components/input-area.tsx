import { useCallback, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Smile, Paperclip, Send, Square } from 'lucide-react'
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
    <div className="border-t border-border bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 pt-2">
        <Button variant="ghost" size="icon-sm" disabled={disabled} className="text-muted-foreground">
          <Smile className="size-5" />
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={disabled} className="text-muted-foreground">
          <Paperclip className="size-5" />
        </Button>
      </div>

      {/* Input + Send */}
      <div className="flex items-end gap-2 px-4 pb-3 pt-1">
        <TextareaAutosize
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Agent is not running" : "Type a message..."}
          minRows={1}
          maxRows={6}
          disabled={disabled}
          className={cn(
            'w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground',
            'placeholder:text-muted-foreground',
            'focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
          )}
        />

        {loading && onStop ? (
          <Button
            variant="outline"
            size="icon"
            onClick={onStop}
            className="shrink-0 rounded-md"
            aria-label="Stop"
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={onSend}
            disabled={!canSend}
            className="shrink-0 rounded-md"
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
