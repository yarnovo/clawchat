/**
 * HTML Builder — 把 slides.json + timing 变成可播放的 HTML 页面
 * 支持：场景切换、音频同步、逐词字幕、淡入淡出
 */
import type { VideoProject, SceneTiming } from './types.js';

export function buildHTML(
  project: VideoProject,
  timings: SceneTiming[] | null,
  isDev: boolean,
): string {
  const { title, width = 1920, height = 1080, theme = {}, scenes } = project;
  const {
    fontFamily = "'Noto Sans SC', sans-serif",
    titleSize = '72px',
    contentSize = '32px',
    color = '#1A1A1A',
    background = '#FAF9F6',
    accent = '#DA7756',
  } = theme;

  const scenesJSON = JSON.stringify(scenes);
  const timingsJSON = JSON.stringify(timings || []);

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    font-family: ${fontFamily};
    color: ${color};
    background: ${background};
  }
  .scene {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 80px;
    padding-bottom: 180px;
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  .scene.active { opacity: 1; }
  .scene-title {
    font-size: ${titleSize};
    font-weight: 700;
    letter-spacing: -2px;
    margin-bottom: 24px;
    text-align: center;
  }
  .scene-content {
    font-size: ${contentSize};
    line-height: 1.7;
    text-align: center;
    max-width: 1400px;
  }
  .subtitle-bar {
    position: fixed;
    bottom: 60px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 36px;
    font-family: ${fontFamily};
    color: ${color};
    pointer-events: none;
    z-index: 100;
  }
  .subtitle-word {
    display: inline;
    opacity: 0.4;
    transition: opacity 0.15s;
  }
  .subtitle-word.active {
    opacity: 1;
    color: ${accent};
  }
  ${isDev ? `
  .controls {
    position: fixed;
    bottom: 10px;
    right: 20px;
    z-index: 200;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .controls button {
    padding: 8px 16px;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    font-size: 14px;
  }
  .controls span { font-size: 14px; color: #888; }
  ` : ''}
</style>
</head>
<body>
${scenes.map((s, i) => `
  <div class="scene" id="scene-${i}" style="${s.background ? `background:${s.background}` : ''}">
    ${s.title ? `<div class="scene-title">${s.title}</div>` : ''}
    <div class="scene-content">${s.content}</div>
  </div>
`).join('')}

<div class="subtitle-bar" id="subtitles"></div>

${isDev ? `
<div class="controls">
  <button onclick="toggle()">Play/Pause</button>
  <button onclick="prev()">Prev</button>
  <button onclick="next()">Next</button>
  <span id="info">Ready</span>
</div>
` : ''}

<script>
const scenes = ${scenesJSON};
const timings = ${timingsJSON};
const audio = new Audio('output/audio.mp3');
let currentScene = -1;
let playing = false;
let animFrame;

function showScene(idx) {
  document.querySelectorAll('.scene').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  currentScene = idx;
}

function updateSubtitles(timeMs) {
  const bar = document.getElementById('subtitles');
  if (!timings.length) { bar.innerHTML = ''; return; }

  // 找当前场景
  let sceneIdx = 0;
  for (let i = 0; i < timings.length; i++) {
    if (timeMs >= timings[i].startMs && timeMs <= timings[i].endMs) {
      sceneIdx = i;
      break;
    }
    if (timeMs > timings[i].endMs) sceneIdx = i + 1;
  }

  if (sceneIdx !== currentScene && sceneIdx < scenes.length) {
    showScene(sceneIdx);
  }

  // 渲染字幕
  const timing = timings[sceneIdx];
  if (!timing || !timing.words.length) { bar.innerHTML = ''; return; }

  bar.innerHTML = timing.words.map(w => {
    const active = timeMs >= w.start && timeMs <= w.end;
    return '<span class="subtitle-word' + (active ? ' active' : '') + '">' + w.text + '</span>';
  }).join('');
}

function tick() {
  if (!playing) return;
  const timeMs = audio.currentTime * 1000;
  updateSubtitles(timeMs);
  ${isDev ? `document.getElementById('info').textContent = (timeMs/1000).toFixed(1) + 's / scene ' + currentScene;` : ''}
  animFrame = requestAnimationFrame(tick);
}

function toggle() {
  if (playing) {
    audio.pause();
    playing = false;
  } else {
    audio.play();
    playing = true;
    tick();
  }
}

function prev() {
  const idx = Math.max(0, currentScene - 1);
  if (timings[idx]) {
    audio.currentTime = timings[idx].startMs / 1000;
    showScene(idx);
  }
}

function next() {
  const idx = Math.min(scenes.length - 1, currentScene + 1);
  if (timings[idx]) {
    audio.currentTime = timings[idx].startMs / 1000;
    showScene(idx);
  }
}

// 初始化
showScene(0);

// 渲染模式：自动标记帧就绪
window.slidesReady = true;
window.slidesSetTime = function(ms) {
  updateSubtitles(ms);
  // 找到对应场景
  for (let i = timings.length - 1; i >= 0; i--) {
    if (ms >= timings[i].startMs) { showScene(i); break; }
  }
  window.slidesReady = true;
};
</script>
</body>
</html>`;
}
