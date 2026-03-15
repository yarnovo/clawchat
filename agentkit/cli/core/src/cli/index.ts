#!/usr/bin/env node
/**
 * agent-core CLI — Agent 运行时
 */
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Agent } from '../agent.js';
import { OpenAIProvider } from '../openai-provider.js';
import { SQLiteSession } from '../session.js';
import { loadPersonaFiles } from '../persona.js';

const program = new Command();

program
  .name('agent-core')
  .description('Model-agnostic Agent Runtime')
  .version('0.0.1');

function builtinTools() {
  return [
    {
      name: 'bash',
      description: 'Execute a shell command',
      parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
      execute: async (args: Record<string, unknown>) => {
        const { execSync } = await import('child_process');
        try {
          return { content: execSync(args.command as string, { encoding: 'utf-8', timeout: 30000 }).slice(0, 10000) };
        } catch (err: any) {
          return { content: `Error: ${err.stderr || err.message}`.slice(0, 5000), isError: true };
        }
      },
    },
    {
      name: 'read',
      description: 'Read a file',
      parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      execute: async (args: Record<string, unknown>) => {
        try { return { content: fs.readFileSync(args.path as string, 'utf-8').slice(0, 20000) }; }
        catch (e: any) { return { content: `Error: ${e.message}`, isError: true }; }
      },
    },
    {
      name: 'write',
      description: 'Write to a file',
      parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
      execute: async (args: Record<string, unknown>) => {
        try {
          fs.mkdirSync(path.dirname(args.path as string), { recursive: true });
          fs.writeFileSync(args.path as string, args.content as string);
          return { content: `Written: ${args.path}` };
        } catch (e: any) { return { content: `Error: ${e.message}`, isError: true }; }
      },
    },
    {
      name: 'web_search',
      description: 'Search the web',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      execute: async (args: Record<string, unknown>) => {
        const { execSync } = await import('child_process');
        try {
          return { content: execSync(`curl -s "https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query as string)}" | head -c 5000`, { encoding: 'utf-8', timeout: 10000 }) };
        } catch { return { content: 'Search failed', isError: true }; }
      },
    },
  ];
}

function createLLM() {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = process.env.LLM_MODEL || 'qwen-plus';
  if (!apiKey) { console.error('Error: set LLM_API_KEY'); process.exit(1); }
  return new OpenAIProvider({ apiKey, baseURL, model });
}

program
  .command('run <workspace>')
  .description('Start the agent')
  .option('-m, --message <msg>', 'Single message mode')
  .action(async (workspace, opts) => {
    const abs = path.resolve(workspace);
    if (!fs.existsSync(abs)) { console.error(`Not found: ${abs}`); process.exit(1); }

    const session = new SQLiteSession(path.join(abs, '.agent-session.db'));
    const agent = new Agent({
      llm: createLLM(), tools: builtinTools(), workDir: abs, session,
      onToolCall: (n, a) => console.log(`  🔧 ${n}(${JSON.stringify(a).slice(0, 80)})`),
      onToolResult: (n, r) => console.log(`  ✅ ${n} → ${r.content.slice(0, 80)}`),
    });

    if (opts.message) {
      console.log(await agent.run(opts.message));
      session.close();
      return;
    }

    const files = loadPersonaFiles(abs);
    console.log(`\n🤖 ${path.basename(abs)}  [${files.map(f => f.name).join(', ')}]`);
    console.log(`   exit to quit\n`);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = () => rl.question('👤 > ', async (input) => {
      if (!input.trim() || input.trim() === 'exit') { session.close(); rl.close(); return; }
      console.log(`\n🤖 ${await agent.run(input)}\n`);
      ask();
    });
    ask();
  });

program
  .command('info <workspace>')
  .description('Show agent info')
  .action((workspace) => {
    const abs = path.resolve(workspace);
    if (!fs.existsSync(abs)) { console.error(`Not found: ${abs}`); process.exit(1); }
    const files = loadPersonaFiles(abs);
    console.log(`\n📁 ${path.basename(abs)}`);
    for (const f of files) console.log(`  ${f.protected ? '🔒' : '📝'} ${f.name} — ${f.content.split('\n')[0].slice(0, 50)}`);
    console.log();
  });

program.parse();
