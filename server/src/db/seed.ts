/**
 * Seed script — 插入开发用初始数据
 * Usage: npx tsx src/db/seed.ts
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { hash } from 'bcryptjs';
import { db } from './index.js';
import { accounts, agents, skills } from './schema.js';

const BUILTINS_DIR = join(process.cwd(), '..', 'agentkit', 'extension-skills', 'builtins');

/** 把一个文件夹打成 zip Buffer */
async function zipDir(dirPath: string): Promise<Buffer> {
  const zip = new AdmZip();
  await addDirToZip(zip, dirPath, '');
  return zip.toBuffer();
}

async function addDirToZip(zip: AdmZip, basePath: string, relativePath: string) {
  const entries = await readdir(join(basePath, relativePath), { withFileTypes: true });
  for (const entry of entries) {
    const rel = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await addDirToZip(zip, basePath, rel);
    } else {
      const content = await readFile(join(basePath, rel));
      zip.addFile(rel, content);
    }
  }
}

/** 从 SKILL.md 提取 description（第一个非空非标题行） */
function extractDescription(content: string): string {
  const lines = content.replace(/^---[\s\S]*?---\n?/, '').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) return trimmed;
  }
  return '';
}

// 额外的示例技能（纯 SKILL.md，不需要真实脚本）
const extraSkills = [
  {
    name: 'code-review',
    displayName: '代码审查',
    description: '审查代码质量、安全漏洞和最佳实践',
    skillMd: `# Code Review — 代码审查

你可以帮助用户审查代码，关注以下方面：

- **安全性**：SQL 注入、XSS、敏感信息泄露
- **性能**：N+1 查询、不必要的循环、内存泄漏
- **可维护性**：命名规范、函数长度、重复代码
- **最佳实践**：错误处理、日志记录、类型安全

## 使用方式

用户会发送代码片段，你需要逐行审查并给出改进建议。
`,
  },
  {
    name: 'translator',
    displayName: '多语言翻译',
    description: '支持中英日韩等多语言互译，保持语境和语气',
    skillMd: `# Translator — 多语言翻译

你是一个专业翻译助手，支持以下语言互译：

- 中文（简体/繁体）
- English
- 日本語
- 한국어

## 翻译原则

1. 保持原文的语气和风格
2. 技术术语保留原文，首次出现时附中文注释
3. 句子结构根据目标语言习惯调整，不要逐字翻译
4. 如果原文有歧义，列出多种可能的翻译
`,
  },
  {
    name: 'data-analysis',
    displayName: '数据分析',
    description: '分析 CSV/JSON 数据，生成统计摘要和可视化建议',
    skillMd: `# Data Analysis — 数据分析

你可以帮助用户分析结构化数据。

## 能力

- 解析 CSV、JSON、TSV 格式数据
- 计算统计指标（均值、中位数、标准差、分位数）
- 识别异常值和趋势
- 生成数据可视化建议（推荐图表类型和配置）

## 使用方式

用户会提供数据文件或粘贴数据，你需要：
1. 先总结数据结构（行数、列名、数据类型）
2. 给出关键统计指标
3. 发现有趣的模式或异常
4. 建议下一步分析方向
`,
  },
  {
    name: 'writing-assistant',
    displayName: '写作助手',
    description: '润色文章、改写段落、调整语气风格',
    skillMd: `# Writing Assistant — 写作助手

你是一个专业的写作助手，帮助用户改善文字质量。

## 能力

- **润色**：修正语法错误，改善句子流畅度
- **改写**：用不同风格重写段落（正式/口语/学术/营销）
- **缩写**：保留核心信息，压缩篇幅
- **扩写**：补充细节和论据，丰富内容

## 原则

- 保持作者原有的观点和立场
- 改动时说明原因
- 提供多个改写方案供选择
`,
  },
  {
    name: 'sql-helper',
    displayName: 'SQL 助手',
    description: '生成、优化和解释 SQL 查询语句',
    skillMd: `# SQL Helper — SQL 助手

你是一个 SQL 专家，帮助用户编写和优化数据库查询。

## 能力

- 根据自然语言描述生成 SQL 查询
- 解释复杂 SQL 的执行逻辑
- 优化慢查询（索引建议、查询重写）
- 支持 PostgreSQL、MySQL、SQLite 方言

## 使用方式

用户描述需求或提供 SQL，你需要：
1. 确认数据库类型和表结构
2. 生成/优化 SQL
3. 解释查询逻辑
4. 提示潜在的性能问题
`,
  },
];

async function seed() {
  console.log('Seeding database...');

  // 创建默认用户
  const passwordHash = await hash('123456', 10);

  const [user] = await db
    .insert(accounts)
    .values({
      username: 'admin',
      passwordHash,
      name: 'Admin',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=admin',
    })
    .returning();

  console.log(`  Created user: ${user.username} (password: 123456)`);

  // 创建示例 Agent
  const [agent] = await db
    .insert(agents)
    .values({
      ownerId: user.id,
      name: 'Assistant',
      description: '通用 AI 助手',
      category: 'general',
    })
    .returning();

  console.log(`  Created agent: ${agent.name}`);

  // 导入内置技能
  const builtinNames = ['web', 'tasks', 'credentials', 'skill-manager'];
  for (const name of builtinNames) {
    const dirPath = join(BUILTINS_DIR, name);
    const zipData = await zipDir(dirPath);
    const skillMd = await readFile(join(dirPath, 'SKILL.md'), 'utf-8');
    const description = extractDescription(skillMd);

    const displayNames: Record<string, string> = {
      web: '网络搜索',
      tasks: '任务管理',
      credentials: '凭证获取',
      'skill-manager': '技能管理',
    };

    await db.insert(skills).values({
      name,
      displayName: displayNames[name] || name,
      description,
      authorId: user.id,
      zipData: zipData,
    });

    console.log(`  Created skill: ${displayNames[name] || name}`);
  }

  // 导入额外示例技能
  for (const extra of extraSkills) {
    const zip = new AdmZip();
    zip.addFile('SKILL.md', Buffer.from(extra.skillMd, 'utf-8'));

    await db.insert(skills).values({
      name: extra.name,
      displayName: extra.displayName,
      description: extra.description,
      authorId: user.id,
      zipData: zip.toBuffer(),
    });

    console.log(`  Created skill: ${extra.displayName}`);
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
