import type { Agent, Message } from '@/types'

const now = Date.now()
const HOUR = 3_600_000
const DAY = 86_400_000

export const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-coder',
    name: 'CodeBot',
    description: '全栈开发助手',
    status: 'running',
    currentSessionId: 1,
    resourceProfile: 'standard',
    skills: ['code-review', 'debugging', 'refactoring'],
    createdAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'agent-translator',
    name: 'TransBot',
    description: '多语言翻译助手',
    status: 'running',
    currentSessionId: 1,
    resourceProfile: 'standard',
    skills: ['translation', 'proofreading'],
    createdAt: '2026-03-08T00:00:00Z',
  },
  {
    id: 'agent-data',
    name: 'DataBot',
    description: '数据分析与可视化',
    status: 'running',
    currentSessionId: 1,
    resourceProfile: 'standard',
    skills: ['data-analysis', 'visualization'],
    createdAt: '2026-03-05T00:00:00Z',
  },
  {
    id: 'agent-writer',
    name: 'WriterBot',
    description: '内容创作与文案',
    status: 'stopped',
    currentSessionId: 1,
    resourceProfile: 'standard',
    skills: ['copywriting', 'blog'],
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'agent-design',
    name: 'DesignBot',
    description: 'UI/UX 设计顾问',
    status: 'running',
    currentSessionId: 1,
    resourceProfile: 'standard',
    skills: ['ui-review', 'accessibility'],
    createdAt: '2026-02-28T00:00:00Z',
  },
  {
    id: 'agent-devops',
    name: 'OpsBot',
    description: 'DevOps & 运维助手',
    status: 'running',
    currentSessionId: 1,
    resourceProfile: 'standard',
    skills: ['docker', 'ci-cd', 'monitoring'],
    createdAt: '2026-02-25T00:00:00Z',
  },
]

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'agent-coder': [
    {
      id: 'msg-c1',
      agentId: 'agent-coder',
      sessionId: 1,
      role: 'user',
      content: '帮我看看这个 React 组件有什么问题',
      status: 'sent',
      timestamp: now - 2 * HOUR,
    },
    {
      id: 'msg-c2',
      agentId: 'agent-coder',
      sessionId: 1,
      role: 'assistant',
      content:
        '我看了一下，主要有几个问题：\n\n1. **useEffect 依赖缺失** — `fetchData` 函数在 effect 内部使用但未加入依赖数组\n2. **状态更新竞态** — 连续快速切换时可能出现旧请求覆盖新数据\n3. **缺少清理函数** — 组件卸载后仍可能 setState\n\n建议用 `useCallback` 包裹 fetch 函数，并在 effect 中加入 abort controller。需要我写个修复示例吗？',
      status: 'complete',
      timestamp: now - 2 * HOUR + 30_000,
    },
    {
      id: 'msg-c3',
      agentId: 'agent-coder',
      sessionId: 1,
      role: 'user',
      content: '好的，帮我写一下修复后的代码',
      status: 'sent',
      timestamp: now - HOUR,
    },
    {
      id: 'msg-c4',
      agentId: 'agent-coder',
      sessionId: 1,
      role: 'assistant',
      content:
        '这是修复后的版本：\n\n```tsx\nfunction UserProfile({ userId }: { userId: string }) {\n  const [user, setUser] = useState<User | null>(null)\n  const [loading, setLoading] = useState(true)\n\n  useEffect(() => {\n    const controller = new AbortController()\n    setLoading(true)\n\n    fetchUser(userId, { signal: controller.signal })\n      .then(setUser)\n      .catch((err) => {\n        if (!controller.signal.aborted) console.error(err)\n      })\n      .finally(() => {\n        if (!controller.signal.aborted) setLoading(false)\n      })\n\n    return () => controller.abort()\n  }, [userId])\n\n  // ...\n}\n```\n\n关键改动：\n- 加了 AbortController 处理竞态\n- `userId` 作为依赖，切换时自动取消旧请求\n- finally 中也检查 abort 状态',
      status: 'complete',
      timestamp: now - HOUR + 45_000,
    },
  ],

  'agent-translator': [
    {
      id: 'msg-t1',
      agentId: 'agent-translator',
      sessionId: 1,
      role: 'user',
      content: '翻译成英文：我们的产品致力于让每个人都能拥有自己的 AI 助手',
      status: 'sent',
      timestamp: now - 30 * 60_000,
    },
    {
      id: 'msg-t2',
      agentId: 'agent-translator',
      sessionId: 1,
      role: 'assistant',
      content:
        'Our product is dedicated to making AI assistants accessible to everyone.\n\n---\n*备选翻译：*\n- "Our mission is to empower everyone with their own AI assistant."\n- "We\'re committed to putting a personal AI assistant in everyone\'s hands."',
      status: 'complete',
      timestamp: now - 30 * 60_000 + 5000,
    },
  ],

  'agent-data': [
    {
      id: 'msg-d1',
      agentId: 'agent-data',
      sessionId: 1,
      role: 'user',
      content: '分析一下上周的用户增长数据',
      status: 'sent',
      timestamp: now - DAY,
    },
    {
      id: 'msg-d2',
      agentId: 'agent-data',
      sessionId: 1,
      role: 'assistant',
      content:
        '上周用户增长分析报告：\n\n| 指标 | 本周 | 上周 | 环比 |\n|------|------|------|------|\n| 新注册 | 1,247 | 983 | +26.9% |\n| DAU | 4,521 | 4,102 | +10.2% |\n| 留存率 | 42.3% | 39.8% | +2.5pp |\n\n**亮点：**\n- 注册转化率提升明显，主要来自社交分享渠道\n- 7日留存首次突破 40%\n\n**关注点：**\n- 次日留存仍在 30% 以下，新用户引导流程需优化',
      status: 'complete',
      timestamp: now - DAY + 60_000,
    },
  ],

  'agent-writer': [
    {
      id: 'msg-w1',
      agentId: 'agent-writer',
      sessionId: 1,
      role: 'user',
      content: '帮我写一段产品介绍文案',
      status: 'sent',
      timestamp: now - 3 * DAY,
    },
    {
      id: 'msg-w2',
      agentId: 'agent-writer',
      sessionId: 1,
      role: 'assistant',
      content:
        '**ClawChat — 你的 AI 伙伴，触手可及**\n\n不只是聊天，是真正懂你的智能助手。ClawChat 让你轻松创建、训练和部署专属 AI Agent，无论是编程、写作、翻译还是数据分析，一个对话就能搞定。\n\n开源、可扩展、属于你。',
      status: 'complete',
      timestamp: now - 3 * DAY + 120_000,
    },
  ],

  'agent-design': [
    {
      id: 'msg-de1',
      agentId: 'agent-design',
      sessionId: 1,
      role: 'user',
      content: '帮我审查一下这个聊天界面的设计',
      status: 'sent',
      timestamp: now - 5 * HOUR,
    },
    {
      id: 'msg-de2',
      agentId: 'agent-design',
      sessionId: 1,
      role: 'assistant',
      content:
        '整体布局不错！几个建议：\n\n1. **对话列表** — 头像可以再大一点（40→48px），增加辨识度\n2. **消息气泡** — 用户消息的绿色可以稍微降低饱和度，长时间看不累眼\n3. **输入区域** — 建议加一个微妙的上阴影，和消息区域形成层次感\n4. **空状态** — 可以加个品牌 illustration，别只放图标\n\n整体走的是微信风格对吧？建议保持简洁，不要加太多装饰。',
      status: 'complete',
      timestamp: now - 5 * HOUR + 20_000,
    },
  ],

  'agent-devops': [
    {
      id: 'msg-o1',
      agentId: 'agent-devops',
      sessionId: 1,
      role: 'user',
      content: 'Docker 容器启动失败了，帮我看看日志',
      status: 'sent',
      timestamp: now - 2 * DAY,
    },
    {
      id: 'msg-o2',
      agentId: 'agent-devops',
      sessionId: 1,
      role: 'assistant',
      content:
        '从日志来看是端口冲突。3000 端口已被占用：\n\n```\nError: listen EADDRINUSE :::3000\n```\n\n解决方案：\n```bash\n# 查找占用进程\nlsof -i :3000\n# 杀掉进程后重启\nkill -9 <PID>\ndocker compose up -d\n```\n\n或者修改 docker-compose.yml 映射到其他端口。',
      status: 'complete',
      timestamp: now - 2 * DAY + 30_000,
    },
  ],
}

// Agent marketplace categories
export const AGENT_CATEGORIES: { name: string; agentIds: string[] }[] = [
  { name: '编程开发', agentIds: ['agent-coder', 'agent-devops'] },
  { name: '翻译写作', agentIds: ['agent-translator', 'agent-writer'] },
  { name: '数据分析', agentIds: ['agent-data'] },
  { name: '设计', agentIds: ['agent-design'] },
]

// Simulated replies for mock chat
export const MOCK_RESPONSES = [
  '收到，让我想想...',
  '好的，这个我可以帮你！给我几秒钟整理一下思路。',
  '这是个好问题。简单来说，你需要关注以下几点：\n\n1. 先明确目标和约束条件\n2. 拆解成可执行的小步骤\n3. 逐步验证每一步的结果\n\n需要我展开讲哪一部分？',
  '明白了，我马上处理。',
  '嗯，我理解你的需求了。让我给你一个方案：\n\n首先我们需要确认一下前提条件，然后我会给出具体的实现路径。你觉得这个方向对吗？',
  '这个方案可行。我建议分两步走：\n\n**第一步：** 先搭建基础框架\n**第二步：** 再逐步完善细节\n\n这样风险最小，也方便随时调整。',
]
