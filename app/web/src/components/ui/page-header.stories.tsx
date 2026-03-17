import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactRenderer } from '@storybook/react-vite'
import type { DecoratorFunction } from 'storybook/internal/types'
import { fn } from 'storybook/test'
import { Plus, Settings } from 'lucide-react'
import { PageHeader } from './page-header'

const desktop: DecoratorFunction<ReactRenderer> = (Story) => (
  <div className="w-[600px] border rounded-lg overflow-hidden">
    <Story />
  </div>
)

const mobile: DecoratorFunction<ReactRenderer> = (Story) => (
  <div className="w-[375px] border rounded-lg overflow-hidden">
    <Story />
  </div>
)

const meta = {
  title: 'UI/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const WithBack: Story = {
  decorators: [desktop],
  args: {
    title: '写一个深拷贝函数，要支持循环引用',
    onBack: fn(),
  },
}

export const TitleOnly: Story = {
  decorators: [desktop],
  args: {
    title: '对话列表',
  },
}

export const WithActions: Story = {
  decorators: [desktop],
  args: {
    title: '聊天记录',
    onBack: fn(),
    actions: (
      <button className="p-1.5 text-muted-foreground hover:text-foreground">
        <Settings className="size-4" />
      </button>
    ),
  },
}

export const WithMultipleActions: Story = {
  decorators: [desktop],
  args: {
    title: 'Agent 详情',
    onBack: fn(),
    actions: (
      <div className="flex items-center gap-2">
        <button className="p-1.5 text-muted-foreground hover:text-foreground">
          <Plus className="size-4" />
        </button>
        <button className="p-1.5 text-muted-foreground hover:text-foreground">
          <Settings className="size-4" />
        </button>
      </div>
    ),
  },
}

export const WithStatus: Story = {
  decorators: [desktop],
  args: {
    title: '阿萨德公司的风格',
    onBack: fn(),
    status: '正在创建...',
  },
}

export const LongTitle: Story = {
  decorators: [desktop],
  args: {
    title: '这是一个非常非常长的标题用来测试标题在页面头部的显示效果会不会溢出或者截断',
    onBack: fn(),
  },
}

export const LongTitleWithStatus: Story = {
  decorators: [desktop],
  args: {
    title: '这个 SQL 查询为什么很慢？ ```sql SELECT * FROM users WHERE email LIKE "%@gmail.com"```',
    onBack: fn(),
    status: '正在输入...',
  },
}

export const LongTitleWithActions: Story = {
  decorators: [desktop],
  args: {
    title: '这个 SQL 查询为什么很慢？ ```sql SELECT * FROM users WHERE email LIKE "%@gmail.com"```',
    onBack: fn(),
    status: '运行中',
    actions: (
      <button className="p-1.5 text-muted-foreground hover:text-foreground">
        <Settings className="size-4" />
      </button>
    ),
  },
}

export const MobileWidth: Story = {
  decorators: [mobile],
  args: {
    title: '这个 SQL 查询为什么很慢？',
    onBack: fn(),
    status: '正在输入...',
  },
}

export const MobileWidthLongTitle: Story = {
  decorators: [mobile],
  args: {
    title: '这个 SQL 查询为什么很慢？ ```sql SELECT * FROM users WHERE email LIKE "%@gmail.com"```',
    onBack: fn(),
    status: '运行中',
    actions: (
      <button className="p-1.5 text-muted-foreground hover:text-foreground">
        <Settings className="size-4" />
      </button>
    ),
  },
}
