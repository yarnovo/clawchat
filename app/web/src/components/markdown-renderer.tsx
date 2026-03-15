import { useCallback, useRef, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-muted/80 px-2 py-1 text-xs text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover/code:opacity-100 hover:text-foreground"
      aria-label="Copy code"
    >
      {copied ? (
        <>
          <Check className="size-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3" />
          Copy
        </>
      )}
    </button>
  )
}

const components: Components = {
  pre({ children, ...props }) {
    return (
      <pre
        className="group/code relative my-3 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-sm"
        {...props}
      >
        {children}
      </pre>
    )
  },
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? '')
    const isBlock = match !== null

    if (isBlock) {
      const codeText = String(children).replace(/\n$/, '')
      return (
        <>
          {match[1] && (
            <span className="absolute top-2 left-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {match[1]}
            </span>
          )}
          <CopyButton text={codeText} />
          <code className={cn('mt-4 block', className)} {...props}>
            {children}
          </code>
        </>
      )
    }

    return (
      <code
        className="rounded-md bg-muted px-1.5 py-0.5 text-[0.85em] font-mono"
        {...props}
      >
        {children}
      </code>
    )
  },
  a({ href, children, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80"
        {...props}
      >
        {children}
      </a>
    )
  },
  img({ src, alt, ...props }) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        className="my-2 max-w-full rounded-lg"
        loading="lazy"
        {...props}
      />
    )
  },
  table({ children, ...props }) {
    return (
      <div className="my-3 overflow-x-auto">
        <table
          className="w-full border-collapse text-sm"
          {...props}
        >
          {children}
        </table>
      </div>
    )
  },
  th({ children, ...props }) {
    return (
      <th
        className="border border-border bg-muted/50 px-3 py-2 text-left font-medium"
        {...props}
      >
        {children}
      </th>
    )
  },
  td({ children, ...props }) {
    return (
      <td className="border border-border px-3 py-2" {...props}>
        {children}
      </td>
    )
  },
  ul({ children, ...props }) {
    return (
      <ul className="my-2 ml-6 list-disc space-y-1" {...props}>
        {children}
      </ul>
    )
  },
  ol({ children, ...props }) {
    return (
      <ol className="my-2 ml-6 list-decimal space-y-1" {...props}>
        {children}
      </ol>
    )
  },
  blockquote({ children, ...props }) {
    return (
      <blockquote
        className="my-3 border-l-3 border-border pl-4 text-muted-foreground italic"
        {...props}
      >
        {children}
      </blockquote>
    )
  },
  hr(props) {
    return <hr className="my-4 border-border" {...props} />
  },
  p({ children, ...props }) {
    return (
      <p className="my-2 leading-relaxed [&:first-child]:mt-0 [&:last-child]:mb-0" {...props}>
        {children}
      </p>
    )
  },
  h1({ children, ...props }) {
    return <h1 className="my-3 text-xl font-bold [&:first-child]:mt-0" {...props}>{children}</h1>
  },
  h2({ children, ...props }) {
    return <h2 className="my-3 text-lg font-semibold [&:first-child]:mt-0" {...props}>{children}</h2>
  },
  h3({ children, ...props }) {
    return <h3 className="my-2 text-base font-semibold [&:first-child]:mt-0" {...props}>{children}</h3>
  },
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('text-sm leading-relaxed', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
