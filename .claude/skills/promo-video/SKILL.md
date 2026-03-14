---
name: promo-video
description: 创建宣传视频（Remotion PPT）。当用户说"做个视频"、"创建视频"、"宣传视频"、"PPT"、"介绍视频"等时调用。基于 Remotion 框架生成带旁白和字幕的动画视频。
---

# ClawChat 宣传视频制作技能

基于 Remotion 框架，创建带 TTS 旁白 + 逐词字幕的动画视频。

## 项目结构

```
promo-video/
├── scripts/
│   └── generate-tts.ts       # TTS 生成脚本（唯一，edge-tts）
├── src/
│   ├── Root.tsx              # Composition 注册（入口）
│   ├── Subtitle.tsx          # 逐词高亮字幕组件
│   ├── GradientBg.tsx        # Mesh 渐变背景
│   ├── Particles.tsx         # 浮动粒子
│   ├── constants.ts          # 颜色/字体常量
│   └── videos/               # 所有视频项目（每个自包含）
│       ├── main/             # 主视频
│       │   ├── Demo.tsx      # 时间轴
│       │   ├── Scene*.tsx    # 场景组件
│       │   ├── narration.json # 旁白文案（唯一数据源）
│       │   └── words/        # 字幕时间戳 JSON（生成产物）
│       ├── backup/           # 备份策略视频
│       ├── skills/           # 技能市场视频
│       └── db/               # 数据库架构视频
├── public/audio/             # 生成的 MP3 音频（按视频分目录）
│   ├── main/
│   ├── backup/
│   ├── skills/
│   └── db/
└── package.json
```

## TTS 引擎：edge-tts (node-edge-tts)

使用 Microsoft Edge 在线 TTS 服务，音色确定性（同参数 = 同输出），生成极快。

### 当前音色：zh-CN-XiaoxiaoNeural（温暖中文女声，语速 +10%）

### 使用命令

```bash
cd promo-video

npm run tts                    # 生成所有视频音频
npm run tts:db                 # 只生成 DB 视频
npx tsx scripts/generate-tts.ts db           # 等价
npx tsx scripts/generate-tts.ts all --force  # 强制重新生成
```

### 添加新视频

1. 创建 `src/videos/xyz/narration.json`（旁白唯一数据源）：
```json
[
  {"id": "xyz-intro", "text": "旁白文案"},
  {"id": "xyz-outro", "text": "结束语"}
]
```
2. 脚本自动扫描含 `narration.json` 的子目录
3. 音频输出到 `public/audio/xyz/`，字幕输出到 `src/videos/xyz/words/`

## 创建新视频的标准流程

### Step 1: 规划场景

先确定场景数量、每场内容、旁白文案。**关键约束**：

> **旁白文案必须短于场景时长**。edge-tts 语速（+10%）约 5-6 字/秒，
> 一个 6 秒场景最多容纳 25-30 个汉字的旁白。

### Step 2: 创建文件

在 `src/videos/` 下建子目录（如 `src/videos/xyz/`），创建：

1. **场景组件** `SceneXyz*.tsx`：
   - 必须包含 `<GradientBg />` + `<Particles />`
   - 内容区必须加 `paddingBottom: 120` 为字幕留空间
   - 动画用 `spring()` 和 `interpolate()`
   - 字段用 `MONO` 字体，标题用 `FONT`
   - 公共组件引用路径为 `../../`（如 `import { Subtitle } from "../../Subtitle"`）

2. **时间轴** `XyzDemo.tsx`：
   - 复制现有 Demo 模板
   - 配置 scenes 数组：`{ dur, delay, words, Comp, audio }`
   - 音频路径格式：`"audio/xyz/xxx.mp3"`

3. **旁白文案** `narration.json`

4. **空字幕文件** `words/xyz-*-words.json`：初始内容 `[]`

### Step 3: 注册 Composition

在 `src/Root.tsx` 添加：
```tsx
import { XyzDemo } from "./videos/xyz/XyzDemo";
<Composition id="XyzDemo" component={XyzDemo}
  durationInFrames={总帧数} fps={30} width={1920} height={1080} />
```

在 `package.json` 添加 scripts：
```json
"render:xyz": "remotion render XyzDemo out/xyz-demo.mp4"
```

### Step 4: 生成 TTS 并校验时长

```bash
npx tsx scripts/generate-tts.ts xyz --force
```

生成后**必须校验音频时长**：
```bash
for f in public/audio/xyz/*.mp3; do
  name=$(basename "$f" .mp3)
  dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f")
  echo "$name: ${dur}s"
done
```

校验公式：**dur >= ceil(audio_s * 30) + delay + 15**
如果不满足，缩短文案或延长场景 dur，然后用 `--force` 重新生成。

### Step 5: 预览和渲染

```bash
npm run dev              # Remotion Studio 预览
npm run render:xyz       # 渲染 MP4
```

## 视觉规范

### 颜色体系
| 用途 | 颜色 | 值 |
|------|------|----|
| 主色 | 紫色 | `#6C63FF` |
| 强调 | 绿色 | `#07C160` |
| 青色 | 信息 | `#00D2FF` |
| 背景 | 深色 | `#0f0c29` |

### 场景配色
每个场景通过 `<GradientBg colors={[...]}/>` 设置不同的背景色调：
- 紫色调: `["#0c0a2e", "#1a1040", "#0c0a2e"]`
- 绿色调: `["#0c0a2e", "#0e2a1e", "#0c0a2e"]`
- 橙色调: `["#0c0a2e", "#2a1a0e", "#0c0a2e"]`
- 蓝色调: `["#0a0a2e", "#1a1a4e", "#0a0a2e"]`

### 卡片样式
```tsx
background: "rgba(255,255,255,0.03)",
borderRadius: 20,
border: "1px solid rgba(COLOR,0.15)",
boxShadow: "0 8px 40px rgba(COLOR,0.08)",
```

### 代码/字段展示
- 字段名: `MONO` 字体, 主题色, fontWeight: 600
- 类型: `MONO` 字体, 主题色 70% 透明度
- 说明: `FONT` 字体, 白色 60% 透明度

### 动画模式
- 入场: `spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } })`
- 标题: 从上方滑入 `translateY(-30 → 0)`
- 卡片: 缩放 + 位移 `scale(0.9→1) + translateY(50→0)`
- 表格行: 从右滑入 `translateX(40→0)`，逐行延迟 5-6 帧
- 发光脉冲: `Math.sin(frame * 0.04~0.06)` 控制 glow 强度

## 避坑清单

1. **旁白超时** — 生成 TTS 后必须用 ffprobe 校验时长，公式 `dur >= ceil(audio_s * 30) + delay + 15`
2. **字幕遮挡** — 场景内容必须加 `paddingBottom: 120`
3. **淡出冲突** — 最后一个场景 `isLast=true` 不加淡出
4. **字体缺失** — 使用 `FONT` / `MONO` 常量，不硬编码字体名
5. **TTS 跳过** — 重新生成要加 `--force`，否则跳过已有文件
6. **总帧数** — Root.tsx 的 `durationInFrames` 必须 = 所有场景 dur 之和
