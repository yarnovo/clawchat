/**
 * 最简示例：用百炼 qwen-plus 跑一个 Agent
 *
 * 运行: npx tsx examples/hello.ts
 */
import { Agent, OpenAIProvider } from '../src/index.js';

const llm = new OpenAIProvider({
  apiKey: 'sk-7c6c85be82ac437b839872e349e0776c',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen-plus',
});

// 定义一个简单工具
const tools = [
  {
    name: 'get_time',
    description: '获取当前时间',
    parameters: { type: 'object', properties: {} },
    execute: async () => ({
      content: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    }),
  },
  {
    name: 'calculate',
    description: '计算数学表达式',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: '数学表达式' },
      },
      required: ['expression'],
    },
    execute: async (args: Record<string, unknown>) => {
      try {
        const result = eval(args.expression as string);
        return { content: String(result) };
      } catch {
        return { content: '计算出错', isError: true };
      }
    },
  },
];

const agent = new Agent({
  llm,
  tools,
  systemPrompt: '你是一个helpful assistant，请用中文回复。',
  onToolCall: (name, args) => console.log(`  🔧 调用工具: ${name}`, args),
  onToolResult: (name, result) => console.log(`  ✅ 工具结果: ${name} →`, result.content),
  onText: (text) => console.log(`\n🤖 Agent: ${text}\n`),
});

// 运行
const question = process.argv[2] || '现在几点了？然后帮我算一下 123 * 456';
console.log(`\n👤 User: ${question}\n`);
agent.run(question);
