import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Square, Camera, Mic } from 'lucide-react'
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
  const canSend = value.trim().length > 0 && !disabled

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
    <div className="px-4 py-3">
      <div className="rounded-xl border border-border shadow-sm">
        {/* Textarea */}
        <TextareaAutosize
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Agent 未运行，正在启动..." : "输入消息..."}
          minRows={3}
          maxRows={10}
          disabled={disabled}
          className={cn(
            'w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm leading-relaxed text-foreground',
            'placeholder:text-muted-foreground',
            'focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-2.5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Camera className="size-[18px]" />
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mic className="size-[18px]" />
            </button>
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

        </div>
      </div>
    </div>
  )
}
