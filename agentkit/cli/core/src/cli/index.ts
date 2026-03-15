#!/usr/bin/env node
/**
 * agent-core CLI
 *
 * Usage:
 *   agent-core run <workspace>           启动 Agent，进入交互式对话
 *   agent-core run <workspace> -m "msg"  单次对话，返回结果后退出
 *   agent-core info <workspace>          查看 Agent 信息（人格、技能、工具）
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Agent } from '../agent.js';
import { OpenAIProvider } from '../openai-provider.js';
import { SQLiteSession } from '../session.js';
import { loadPersonaFiles, buildPersonaPrompt } from '../persona.js';

const [,, command, workDir, ...rest] = process.argv;

if (!command) {
  console.log(`
  agent-core — Model-agnostic Agent Runtime

  Usage:
    agent-core run <workspace>             Interactive chat
    agent-core run <workspace> -m "msg"    Single message
    agent-core info <workspace>            Show agent info
  `);
  process.exit(0);
}

function resolveWorkDir(dir: string): string {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) {
    console.error(`Error: workspace not found: ${abs}`);
    process.exit(1);
  }
  return abs;
}

function createLLM(): OpenAIProvider {
  const apiKey = process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'qwen-plus';

  if (!apiKey) {
    console.error('Error: set LLM_API_KEY environment variable');
    process.exit(1);
  }

  return new OpenAIProvider({ apiKey, baseURL, model });
}

// --- 内置工具 ---
function builtinTools() {
  return [
    {
      name: 'bash',
      description: 'Execute a shell command and return stdout/stderr',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Shell command to execute' } },
        required: ['command'],
      },
      execute: async (args: Record<string, unknown>) => {
        const { execSync } = await import('child_process');
        try {
          const output = execSync(args.command as string, { encoding: 'utf-8', timeout: 30000 });
          return { content: output.slice(0, 10000) };
        } catch (err: any) {
          return { content: `Error: ${err.stderr || err.message}`.slice(0, 5000), isError: true };
        }
      },
    },
    {
      name: 'read',
      description: 'Read a file and return its content',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'File path to read' } },
        required: ['path'],
      },
      execute: async (args: Record<string, unknown>) => {
        try {
          const content = fs.readFileSync(args.path as string, 'utf-8');
          return { content: content.slice(0, 20000) };
        } catch (err: any) {
          return { content: `Error: ${err.message}`, isError: true };
        }
      },
    },
    {
      name: 'write',
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to write' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
      execute: async (args: Record<string, unknown>) => {
        try {
          const dir = path.dirname(args.path as string);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(args.path as string, args.content as string, 'utf-8');
          return { content: `Written to ${args.path}` };
        } catch (err: any) {
          return { content: `Error: ${err.message}`, isError: true };
        }
      },
    },
    {
      name: 'web_search',
      description: 'Search the web and return results',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query' } },
        required: ['query'],
      },
      execute: async (args: Record<string, unknown>) => {
        const { execSync } = await import('child_process');
        try {
          const output = execSync(`curl -s "https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query as string)}" | head -c 5000`, { encoding: 'utf-8', timeout: 10000 });
          return { content: output };
        } catch {
          return { content: 'Web search failed', isError: true };
        }
      },
    },
  ];
}

async function runCommand() {
  const abs = resolveWorkDir(workDir!);
  const llm = createLLM();
  const dbPath = path.join(abs, '.agent-session.db');
  const session = new SQLiteSession(dbPath);
  const tools = builtinTools();

  const agent = new Agent({
    llm,
    tools,
    workDir: abs,
    session,
    onToolCall: (name, args) => console.log(`  🔧 ${name}(${JSON.stringify(args).slice(0, 100)})`),
    onToolResult: (name, result) => console.log(`  ✅ ${name} → ${result.content.slice(0, 100)}`),
  });

  // 单次消息模式
  const msgIdx = rest.indexOf('-m');
  if (msgIdx !== -1 && rest[msgIdx + 1]) {
    const msg = rest[msgIdx + 1];
    const reply = await agent.run(msg);
    console.log(reply);
    (session as SQLiteSession).close();
    return;
  }

  // 交互模式
  console.log(`\n🤖 Agent loaded from ${abs}`);
  const files = loadPersonaFiles(abs);
  console.log(`   Files: ${files.map(f => f.name).join(', ')}`);
  console.log(`   Type "exit" to quit\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = () => {
    rl.question('👤 > ', async (input) => {
      if (!input.trim() || input.trim() === 'exit') {
        (session as SQLiteSession).close();
        rl.close();
        return;
      }
      const reply = await agent.run(input);
      console.log(`\n🤖 ${reply}\n`);
      ask();
    });
  };

  ask();
}

function infoCommand() {
  const abs = resolveWorkDir(workDir!);
  const files = loadPersonaFiles(abs);

  console.log(`\n📁 Workspace: ${abs}\n`);
  for (const f of files) {
    const preview = f.content.split('\n')[0].slice(0, 60);
    const badge = f.protected ? '🔒' : '📝';
    console.log(`  ${badge} ${f.name} — ${preview}`);
  }
  console.log();
}

async function main() {
  switch (command) {
    case 'run':
      if (!workDir) { console.error('Usage: agent-core run <workspace>'); process.exit(1); }
      await runCommand();
      break;
    case 'info':
      if (!workDir) { console.error('Usage: agent-core info <workspace>'); process.exit(1); }
      infoCommand();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
