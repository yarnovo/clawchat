import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactRenderer } from '@storybook/react-vite'
import type { DecoratorFunction } from 'storybook/internal/types'
import { fn } from 'storybook/test'
import { Inbox, Search, Bot, PackageOpen } from 'lucide-react'
import { EmptyState } from './empty-state'

const container: DecoratorFunction<ReactRenderer> = (Story) => (
  <div className="flex h-[300px] w-[300px] border rounded-lg overflow-hidden">
    <Story />
  </div>
)

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  decorators: [container],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const TextOnly: Story = {
  args: {
    text: '暂无数据',
  },
}

export const WithIcon: Story = {
  args: {
    text: '暂无消息',
    icon: Inbox,
  },
}

export const WithAction: Story = {
  args: {
    text: '暂无 Agent',
    action: { label: '创建 Agent', onClick: fn() },
  },
}

export const WithIconAndAction: Story = {
  args: {
    text: '还没有创建 Agent',
    icon: Bot,
    action: { label: '去创建', onClick: fn() },
  },
}

export const SearchEmpty: Story = {
  args: {
    text: '没有匹配的结果',
    icon: Search,
  },
}

export const SkillsEmpty: Story = {
  args: {
    text: '暂无技能',
    icon: PackageOpen,
    action: { label: '浏览技能市场', onClick: fn() },
  },
}
