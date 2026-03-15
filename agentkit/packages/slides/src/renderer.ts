/**
 * Renderer — Playwright 逐帧截图 + FFmpeg 合成 MP4
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import type { VideoProject, SceneTiming } from './types.js';
import { buildHTML } from './html.js';

export interface RenderOptions {
  projectDir: string;
  outputFile?: string;
}

export async function renderVideo(options: RenderOptions): Promise<string> {
  const { projectDir, outputFile = 'output/video.mp4' } = options;

  // 加载项目
  const project: VideoProject = JSON.parse(
    fs.readFileSync(path.join(projectDir, 'slides.json'), 'utf-8'),
  );
  const timings: SceneTiming[] = JSON.parse(
    fs.readFileSync(path.join(projectDir, 'output', 'timing.json'), 'utf-8'),
  );

  const { width = 1920, height = 1080, fps = 30 } = project;

  // 计算总帧数
  const lastTiming = timings[timings.length - 1];
  const totalDurationMs = lastTiming.endMs + 1000; // 加 1s 结尾
  const totalFrames = Math.ceil((totalDurationMs / 1000) * fps);

  console.log(`Rendering ${totalFrames} frames (${(totalDurationMs / 1000).toFixed(1)}s) at ${fps}fps...`);

  // 生成 HTML（非 dev 模式）
  const html = buildHTML(project, timings, false);
  const htmlFile = path.join(projectDir, 'output', '_render.html');
  fs.writeFileSync(htmlFile, html);

  // 帧输出目录
  const framesDir = path.join(projectDir, 'output', 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  // 启动 Playwright
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`file://${path.resolve(htmlFile)}`);
  await page.waitForFunction(() => (window as any).slidesReady === true);

  // 逐帧截图
  for (let f = 0; f < totalFrames; f++) {
    const timeMs = (f / fps) * 1000;

    // 设置时间，触发场景切换和字幕更新
    await page.evaluate((ms) => (window as any).slidesSetTime(ms), timeMs);
    await page.waitForFunction(() => (window as any).slidesReady === true);

    const framePath = path.join(framesDir, `${String(f).padStart(6, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });

    if (f % fps === 0) {
      process.stdout.write(`\r  Frame ${f}/${totalFrames} (${Math.round(f / totalFrames * 100)}%)`);
    }
  }
  console.log(`\r  Frame ${totalFrames}/${totalFrames} (100%)`);

  await browser.close();

  // FFmpeg 合成：帧序列 + 音频 → MP4
  const output = path.join(projectDir, outputFile);
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const audioFile = path.join(projectDir, 'output', 'audio.mp3');
  const hasAudio = fs.existsSync(audioFile);

  const ffmpegCmd = [
    'ffmpeg -y',
    `-framerate ${fps}`,
    `-i "${framesDir}/%06d.png"`,
    hasAudio ? `-i "${audioFile}" -c:a aac -shortest` : '',
    '-c:v libx264 -pix_fmt yuv420p',
    `"${output}"`,
  ].filter(Boolean).join(' ');

  console.log('  Encoding video...');
  execSync(ffmpegCmd + ' 2>/dev/null');

  // 清理帧文件
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.unlinkSync(htmlFile);

  console.log(`  Done: ${output}`);
  return output;
}
