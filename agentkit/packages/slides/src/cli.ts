#!/usr/bin/env node
/**
 * @agentkit/slides CLI
 *
 * Usage:
 *   slides dev <project-dir>       # 浏览器预览
 *   slides tts <project-dir>       # 生成语音 + 字幕
 *   slides render <project-dir>    # 渲染 MP4
 */
import fs from 'fs';
import path from 'path';
import type { VideoProject } from './types.js';

const [,, command, projectDir] = process.argv;

if (!command || !projectDir) {
  console.log(`
  @agentkit/slides — Minimal video generation CLI

  Usage:
    slides dev <project-dir>       Preview in browser
    slides tts <project-dir>       Generate TTS audio + subtitles
    slides render <project-dir>    Render MP4 video
  `);
  process.exit(0);
}

const absDir = path.resolve(projectDir);
if (!fs.existsSync(path.join(absDir, 'slides.json'))) {
  console.error(`Error: ${absDir}/slides.json not found`);
  process.exit(1);
}

async function main() {
  const project: VideoProject = JSON.parse(
    fs.readFileSync(path.join(absDir, 'slides.json'), 'utf-8'),
  );

  switch (command) {
    case 'dev': {
      const { startDevServer } = await import('./server.js');
      startDevServer(absDir);
      break;
    }
    case 'tts': {
      const { generateTTS } = await import('./tts.js');
      const outputDir = path.join(absDir, 'output');
      console.log(`Generating TTS for ${project.scenes.length} scenes...`);
      const timings = await generateTTS(project.scenes, outputDir);
      console.log(`Done. ${timings.length} scenes, output in ${outputDir}`);
      break;
    }
    case 'render': {
      const { renderVideo } = await import('./renderer.js');
      await renderVideo({ projectDir: absDir });
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
