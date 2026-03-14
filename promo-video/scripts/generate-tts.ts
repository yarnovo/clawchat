// edge-tts single-track TTS generator
// Each video -> one continuous MP3 + per-scene words JSON

import { EdgeTTS } from "node-edge-tts";
import * as fs from "fs";
import * as path from "path";

const VOICE = "zh-CN-XiaoxiaoNeural";
const RATE = "+10%";

const PROJECT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(PROJECT_DIR, "src", "videos");
const AUDIO_BASE = path.join(PROJECT_DIR, "public", "audio");

interface Narration {
  id: string;
  text: string;
}

interface WordBoundary {
  part: string;
  start: number;
  end: number;
}

function listVideos(): string[] {
  return fs
    .readdirSync(SRC_DIR)
    .filter((name) =>
      fs.existsSync(path.join(SRC_DIR, name, "narration.json"))
    )
    .sort();
}

function loadNarrations(videoId: string): Narration[] {
  const file = path.join(SRC_DIR, videoId, "narration.json");
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function stripPunct(s: string): string {
  return s.replace(/[，。：？、！""''（）— …\s]/g, "");
}

function splitWordsByNarration(
  allWords: WordBoundary[],
  narrations: Narration[]
): Map<string, WordBoundary[]> {
  // Build full text and compute character boundaries for each narration
  const fullText = narrations.map((n) => n.text).join("");
  const fullClean = stripPunct(fullText);

  const boundaries: Array<{ id: string; start: number; end: number }> = [];
  let pos = 0;
  for (const n of narrations) {
    const cleanN = stripPunct(n.text);
    const idx = fullClean.indexOf(cleanN, pos);
    const start = idx >= 0 ? idx : pos;
    boundaries.push({ id: n.id, start, end: start + cleanN.length });
    pos = start + cleanN.length;
  }

  // Assign each word to its narration based on character position
  const result = new Map<string, WordBoundary[]>();
  for (const n of narrations) result.set(n.id, []);

  let charPos = 0;
  for (const word of allWords) {
    const cleanWord = stripPunct(word.part);
    const wordStart = charPos;
    charPos += cleanWord.length;

    for (const b of boundaries) {
      if (wordStart < b.end) {
        result.get(b.id)!.push(word);
        break;
      }
    }
  }

  // Keep absolute timestamps (not normalized) for single-track sync
  return result;
}

async function processVideo(videoId: string, force: boolean) {
  const narrations = loadNarrations(videoId);
  const audioDir = path.join(AUDIO_BASE, videoId);
  const wordsDir = path.join(SRC_DIR, videoId, "words");
  fs.mkdirSync(audioDir, { recursive: true });
  fs.mkdirSync(wordsDir, { recursive: true });

  const mp3Path = path.join(audioDir, `${videoId}.mp3`);
  const metaPath = `${mp3Path}.json`;

  // Check if all outputs exist
  const allExist =
    !force &&
    fs.existsSync(mp3Path) &&
    narrations.every((n) =>
      fs.existsSync(path.join(wordsDir, `${n.id}-words.json`))
    );
  if (allExist) {
    console.log(`  ⏭️  ${videoId}: all files exist, skipping`);
    return;
  }

  // Concatenate all narration texts
  const fullText = narrations.map((n) => n.text).join("");
  console.log(
    `\n🎬 ${videoId} (${narrations.length} scenes, ${fullText.length} chars)`
  );

  // Generate single continuous MP3
  const tts = new EdgeTTS({
    voice: VOICE,
    rate: RATE,
    saveSubtitles: true,
    timeout: 60000,
  });

  await tts.ttsPromise(fullText, mp3Path);

  if (!fs.existsSync(metaPath)) {
    console.log(`  ❌ no subtitle generated`);
    return;
  }

  const allWords: WordBoundary[] = JSON.parse(
    fs.readFileSync(metaPath, "utf-8")
  );
  console.log(`  ✅ ${videoId}.mp3 (${allWords.length} words total)`);

  // Split words by narration and write per-scene JSON (absolute timestamps)
  const wordsByScene = splitWordsByNarration(allWords, narrations);

  // Write per-scene words + timing.json
  const timingEntries: Array<{ id: string; startMs: number; endMs: number }> = [];

  for (const n of narrations) {
    const words = wordsByScene.get(n.id) || [];
    const wordsPath = path.join(wordsDir, `${n.id}-words.json`);
    fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2));

    const startMs = words.length > 0 ? words[0].start : 0;
    const endMs = words.length > 0 ? words[words.length - 1].end : 0;
    timingEntries.push({ id: n.id, startMs, endMs });
    console.log(`  📝 ${n.id}: ${words.length} words (${startMs}-${endMs}ms)`);
  }

  // Write timing.json for Demo components to compute scene durations
  const timingPath = path.join(SRC_DIR, videoId, "timing.json");
  fs.writeFileSync(timingPath, JSON.stringify(timingEntries, null, 2));
  console.log(`  ⏱️  timing.json`);

  // Clean up the .mp3.json intermediate file
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

  // Remove old per-scene mp3 files
  for (const n of narrations) {
    const old = path.join(audioDir, `${n.id}.mp3`);
    if (fs.existsSync(old)) fs.unlinkSync(old);
    const oldMeta = `${old}.json`;
    if (fs.existsSync(oldMeta)) fs.unlinkSync(oldMeta);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const videoArg = args.find((a) => a !== "--force");

  const videos = listVideos();

  if (videoArg && videoArg !== "all") {
    if (!videos.includes(videoArg)) {
      console.error(`Unknown video: ${videoArg}`);
      console.error(`Available: ${videos.join(", ")}, all`);
      process.exit(1);
    }
    await processVideo(videoArg, force);
  } else {
    for (const vid of videos) {
      await processVideo(vid, force);
    }
  }

  console.log("\n✨ Done!");
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
