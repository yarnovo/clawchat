/**
 * 用 edge-tts 批量生成旁白音频 + 逐词时间戳
 *
 * 用法: npx tsx scripts/generate-tts.ts
 */

import { EdgeTTS } from "node-edge-tts";
import * as fs from "fs";
import * as path from "path";
import { narrations } from "./narration";

const VOICE = "zh-CN-YunxiNeural"; // 清朗男声
const RATE = "-5%"; // 略慢，更沉稳
const OUTPUT_DIR = path.resolve(__dirname, "../public/audio");

async function generateOne(id: string, text: string) {
  const audioPath = path.join(OUTPUT_DIR, `${id}.mp3`);
  const subPath = `${audioPath}.json`; // edge-tts 生成的字幕文件后缀是 .mp3.json

  // 如果已存在则跳过
  if (fs.existsSync(audioPath) && fs.existsSync(subPath)) {
    const subs = JSON.parse(fs.readFileSync(subPath, "utf-8"));
    console.log(`  ⏭️  ${id}: 已存在 (${subs.length} words)，跳过`);
    return;
  }

  const tts = new EdgeTTS({
    voice: VOICE,
    rate: RATE,
    saveSubtitles: true,
    timeout: 30000, // 30s timeout
  });

  await tts.ttsPromise(text, audioPath);

  if (fs.existsSync(subPath)) {
    const subs = JSON.parse(fs.readFileSync(subPath, "utf-8"));
    console.log(`  ✅ ${id}: ${audioPath} (${subs.length} words)`);
  } else {
    console.log(`  ✅ ${id}: ${audioPath} (无字幕文件)`);
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`🎙️  生成旁白音频 → ${OUTPUT_DIR}\n`);
  console.log(`🔊 语音: ${VOICE}, 语速: ${RATE}\n`);

  for (const n of narrations) {
    console.log(`📝 ${n.id}: "${n.text}"`);
    await generateOne(n.id, n.text);
  }

  // 生成汇总 manifest（用实际的 .mp3.json 后缀）
  const manifest = narrations.map((n) => ({
    id: n.id,
    startFrame: n.startFrame,
    delayFrames: n.delayFrames,
    audioFile: `audio/${n.id}.mp3`,
    metaFile: `audio/${n.id}.mp3.json`,
  }));
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`\n✨ 完成！manifest → ${path.join(OUTPUT_DIR, "manifest.json")}`);
}

main().catch((e) => {
  console.error("❌ 生成失败:", e);
  process.exit(1);
});
