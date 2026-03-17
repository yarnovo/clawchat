import type { Meta, StoryObj } from '@storybook/react-vite'
import { MessageBubble } from './message-bubble'
import type { Message } from '@/types'

const baseMessage: Message = {
  id: '1',
  agentId: 'agent-1',
  sessionId: 1,
  role: 'user',
  content: '写一个深拷贝函数，要支持循环引用',
  status: 'sent',
  timestamp: Date.now(),
}

const meta = {
  title: 'Chat/MessageBubble',
  component: MessageBubble,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl mx-auto p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MessageBubble>

export default meta
type Story = StoryObj<typeof meta>

export const UserMessage: Story = {
  args: {
    message: baseMessage,
  },
}

export const AssistantMessage: Story = {
  args: {
    message: {
      ...baseMessage,
      id: '2',
      role: 'assistant',
      content:
        '下面是一个支持循环引用的深拷贝函数实现：\n\n```javascript\nfunction deepClone(obj, map = new WeakMap()) {\n  if (obj === null || typeof obj !== "object") return obj;\n  if (map.has(obj)) return map.get(obj);\n\n  const clone = Array.isArray(obj) ? [] : {};\n  map.set(obj, clone);\n\n  for (const key of Object.keys(obj)) {\n    clone[key] = deepClone(obj[key], map);\n  }\n  return clone;\n}\n```\n\n使用 `WeakMap` 记录已克隆的对象，遇到循环引用时直接返回缓存的副本。',
      status: 'complete',
    },
  },
}

export const Sending: Story = {
  args: {
    message: {
      ...baseMessage,
      status: 'sending',
    },
  },
}

export const Error: Story = {
  args: {
    message: {
      ...baseMessage,
      status: 'error',
    },
  },
}

export const LongUserMessage: Story = {
  args: {
    message: {
      ...baseMessage,
      content:
        '我有一个非常复杂的嵌套对象，里面包含了各种类型的数据：数组、Map、Set、Date、正则表达式、还有循环引用。请帮我写一个深拷贝函数，要求能完整复制所有这些类型，同时正确处理循环引用避免无限递归。最好能用 TypeScript 写，并且提供对应的单元测试。',
    },
  },
}

export const WithCustomAvatar: Story = {
  args: {
    message: {
      ...baseMessage,
      id: '3',
      role: 'assistant',
      content: '你好！有什么我可以帮你的吗？',
      status: 'complete',
    },
    agentAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=claude',
  },
}

export const Conversation: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <MessageBubble
        message={baseMessage}
      />
      <MessageBubble
        message={{
          ...baseMessage,
          id: '2',
          role: 'assistant',
          content: '好的，我来帮你实现一个支持循环引用的深拷贝函数。',
          status: 'complete',
        }}
        agentAvatar="https://api.dicebear.com/9.x/notionists/svg?seed=claude"
      />
      <MessageBubble
        message={{
          ...baseMessage,
          id: '3',
          content: '能用 TypeScript 吗？',
        }}
      />
    </div>
  ),
}
