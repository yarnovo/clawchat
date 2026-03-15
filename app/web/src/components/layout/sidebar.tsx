import {
  MessageSquarePlus,
  Search,
  Store,
  Settings,
  Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Dummy conversation data — will be replaced by store data
const DUMMY_CONVERSATIONS = [
  {
    id: "1",
    title: "Code Assistant",
    lastMessage: "Sure, I can help you refactor that function...",
    timestamp: "2m ago",
    avatarUrl: "",
    isAgent: true,
    unread: 2,
  },
  {
    id: "2",
    title: "Alice",
    lastMessage: "See you tomorrow!",
    timestamp: "1h ago",
    avatarUrl: "",
    isAgent: false,
    unread: 0,
  },
  {
    id: "3",
    title: "Translation Bot",
    lastMessage: "The French translation is: Bonjour le monde",
    timestamp: "3h ago",
    avatarUrl: "",
    isAgent: true,
    unread: 0,
  },
  {
    id: "4",
    title: "Bob",
    lastMessage: "Did you check the deployment?",
    timestamp: "Yesterday",
    avatarUrl: "",
    isAgent: false,
    unread: 0,
  },
  {
    id: "5",
    title: "Writing Helper",
    lastMessage: "Here's a revised version of your paragraph...",
    timestamp: "Yesterday",
    avatarUrl: "",
    isAgent: true,
    unread: 1,
  },
]

interface SidebarProps {
  className?: string
  activeConversationId?: string
  onConversationSelect?: (id: string) => void
  onNavigate?: (page: "agents" | "settings") => void
}

export function Sidebar({
  className,
  activeConversationId = "1",
  onConversationSelect,
  onNavigate,
}: SidebarProps) {
  return (
    <div
      className={cn(
        "flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            C
          </div>
          <span className="text-base font-semibold">ClawChat</span>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-sm">
                <MessageSquarePlus className="size-4" />
              </Button>
            }
          />
          <TooltipContent side="bottom">New Chat</TooltipContent>
        </Tooltip>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <Separator />

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {DUMMY_CONVERSATIONS.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onConversationSelect?.(conv.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                activeConversationId === conv.id &&
                  "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              <Avatar size="default">
                {conv.avatarUrl && <AvatarImage src={conv.avatarUrl} />}
                <AvatarFallback>
                  {conv.isAgent ? (
                    <Bot className="size-4" />
                  ) : (
                    conv.title[0]
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium">
                    {conv.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {conv.timestamp}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground mt-0.5">
                  {conv.lastMessage}
                </p>
              </div>
              {conv.unread > 0 && (
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {conv.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onNavigate?.("agents")}
                >
                  <Store className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Agent Marketplace</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onNavigate?.("settings")}
                >
                  <Settings className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-sidebar-accent">
          <Avatar size="sm">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium">User</span>
        </button>
      </div>
    </div>
  )
}
