import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Square, Maximize2, Minimize2 } from 'lucide-react'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [expanded, setExpanded] = useState(false)
  const canSend = value.trim().length > 0 && !loading && !disabled

  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus()
    }
  }, [disabled])

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
    <div className="border-t border-border bg-background px-4 py-3">
      {/* Input wrapper */}
      <div className="relative">
        <TextareaAutosize
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Agent 未运行" : "输入消息..."}
          minRows={expanded ? 8 : 2}
          maxRows={expanded ? 16 : 6}
          disabled={disabled}
          className={cn(
            'w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 pr-9 text-sm leading-relaxed text-foreground',
            'placeholder:text-muted-foreground',
            'focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
          )}
        />

        {/* Expand/collapse toggle — top right corner */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="absolute right-2 top-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          {loading && onStop && (
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              className="h-7 px-2"
            >
              <Square className="size-3.5 mr-1" />
              停止
            </Button>
          )}
        </div>

        <Button
          size="sm"
          onClick={onSend}
          disabled={!canSend}
          className="h-7 px-3"
        >
          发送
        </Button>
      </div>
    </div>
  )
}
