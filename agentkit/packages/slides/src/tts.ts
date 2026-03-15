/**
 * TTS — edge-tts 生成语音 + 字幕文件
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import type { Scene, SceneTiming, WordTimestamp } from './types.js';

export interface TTSOptions {
  voice?: string;
  rate?: string;
}

const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural';
const DEFAULT_RATE = '+10%';

export async function generateTTS(
  scenes: Scene[],
  outputDir: string,
  options: TTSOptions = {},
): Promise<SceneTiming[]> {
  const { EdgeTTS } = await import('node-edge-tts');
  const voice = options.voice || DEFAULT_VOICE;
  const rate = options.rate || DEFAULT_RATE;

  fs.mkdirSync(outputDir, { recursive: true });

  const timings: SceneTiming[] = [];
  let globalOffsetMs = 0;

  for (const scene of scenes) {
    const text = scene.narration || scene.title || '';
    if (!text.trim()) {
      timings.push({
        id: scene.id,
        startMs: globalOffsetMs,
        endMs: globalOffsetMs + 3000,
        words: [],
      });
      globalOffsetMs += 3500;
      continue;
    }

    const tts = new EdgeTTS({ voice, rate, saveSubtitles: true });
    const audioFile = path.join(outputDir, `${scene.id}.mp3`);
    await tts.ttsPromise(text, audioFile);

    // 读取字幕文件（edge-tts 生成 .vtt 同名文件）
    const vttFile = audioFile.replace('.mp3', '.vtt');
    const words = parseVTT(vttFile, globalOffsetMs);

    // 用 ffprobe 获取音频时长
    const durationMs = getAudioDuration(audioFile);
    const sceneEndMs = globalOffsetMs + durationMs;

    timings.push({
      id: scene.id,
      startMs: globalOffsetMs,
      endMs: sceneEndMs,
      words,
      audioFile,
    });

    globalOffsetMs = sceneEndMs + 500;
    console.log(`  ${scene.id}: ${(durationMs / 1000).toFixed(1)}s (${words.length} words)`);
  }

  // 写 timing 文件
  fs.writeFileSync(
    path.join(outputDir, 'timing.json'),
    JSON.stringify(timings, null, 2),
  );

  // 合并音频
  await mergeAudio(timings, outputDir);

  return timings;
}

function getAudioDuration(file: string): number {
  try {
    const out = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${file}"`,
    ).toString().trim();
    return Math.round(parseFloat(out) * 1000);
  } catch {
    return 5000;
  }
}

function parseVTT(vttFile: string, offsetMs: number): WordTimestamp[] {
  if (!fs.existsSync(vttFile)) return [];
  const content = fs.readFileSync(vttFile, 'utf-8');
  const words: WordTimestamp[] = [];

  // VTT 格式: 00:00:00.000 --> 00:00:01.000\ntext
  const blocks = content.split('\n\n');
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    for (const line of lines) {
      const match = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      if (match) {
        const start = (parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3])) * 1000 + parseInt(match[4]);
        const end = (parseInt(match[5]) * 3600 + parseInt(match[6]) * 60 + parseInt(match[7])) * 1000 + parseInt(match[8]);
        // 下一行是文本
        const textIdx = lines.indexOf(line) + 1;
        if (textIdx < lines.length) {
          const text = lines[textIdx].trim();
          if (text && !text.match(/^\d/)) {
            words.push({
              text,
              start: offsetMs + start,
              end: offsetMs + end,
            });
          }
        }
      }
    }
  }

  // 清理 vtt 文件
  try { fs.unlinkSync(vttFile); } catch {}
  return words;
}

async function mergeAudio(timings: SceneTiming[], outputDir: string): Promise<void> {
  const audioFiles = timings.filter(t => t.audioFile).map(t => t.audioFile!);
  if (audioFiles.length === 0) return;

  const listFile = path.join(outputDir, 'concat.txt');
  fs.writeFileSync(listFile, audioFiles.map(f => `file '${f}'`).join('\n'));

  const merged = path.join(outputDir, 'audio.mp3');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${merged}" 2>/dev/null`);
  fs.unlinkSync(listFile);
  console.log(`  Merged audio: ${merged}`);
}
