/**
 * Dev Server — 浏览器预览幻灯片
 */
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import type { VideoProject, SceneTiming } from './types.js';
import { buildHTML } from './html.js';

export function startDevServer(
  projectDir: string,
  port = 3300,
): void {
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    // 静态文件（音频）
    if (url.pathname.startsWith('/output/')) {
      const filePath = path.join(projectDir, url.pathname.slice(1));
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const mime = ext === '.mp3' ? 'audio/mpeg' : ext === '.json' ? 'application/json' : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    // 主页面
    if (url.pathname === '/') {
      const project = loadProject(projectDir);
      const timings = loadTimings(projectDir);
      const html = buildHTML(project, timings, true);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(port, () => {
    console.log(`\n  Slides preview: http://localhost:${port}\n`);
  });
}

function loadProject(dir: string): VideoProject {
  const file = path.join(dir, 'slides.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function loadTimings(dir: string): SceneTiming[] | null {
  const file = path.join(dir, 'output', 'timing.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
