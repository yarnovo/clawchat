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

## 视觉规范：Claude 风格

整体风格：**温暖、人文、克制、留白多、无浮华效果**。参考 Anthropic/Claude 的设计语言。

### 颜色体系（定义在 constants.ts）
| 用途 | 变量 | 值 | 说明 |
|------|------|----|------|
| 背景 | `COLORS.bg` | `#FAF9F6` | 奶油白 |
| 正文 | `COLORS.text` | `#1A1A1A` | 深棕 |
| 次要 | `COLORS.muted` | `#8B7E74` | 暖灰 |
| 辅助 | `COLORS.subtle` | `#C4B9AE` | 更淡暖灰 |
| 强调 | `COLORS.accent` | `#DA7756` | Claude 橙 |
| 边框 | `COLORS.border` | `#E8E0D8` | 暖色边框 |
| 卡片 | `COLORS.card` | `#FFFFFF` | 纯白 |

### 严格颜色规则
- **禁止使用彩色**：不要蓝、绿、紫、红等饱和色，只用上面的暖色调色板
- 所有文字只用 `COLORS.text`（主要）或 `COLORS.muted`（次要）或 `COLORS.accent`（强调）
- 背景统一 `COLORS.bg` 奶油白，不要深色背景
- 卡片用 `COLORS.card` 白色 + 极淡阴影

### 字体（定义在 constants.ts）
| 变量 | 用途 | 字体 |
|------|------|------|
| `FONT` | 标题（衬线） | Noto Serif SC, Georgia, serif |
| `FONT_SANS` | 正文/字幕（无衬线） | Noto Sans SC, SF Pro Display, sans-serif |
| `MONO` | 代码/字段 | JetBrains Mono, SF Mono, monospace |

### 字号规范
- 场景大标题: 60-84px, `FONT`, fontWeight: 700
- 卡片标题: 36-48px, `FONT` 或 `FONT_SANS`, fontWeight: 600
- 卡片正文/描述: 28-32px, `FONT_SANS`, fontWeight: 400
- 代码/字段名: 26-28px, `MONO`, fontWeight: 600
- 辅助说明: 24-28px, `FONT_SANS`, color: `COLORS.muted`
- **最小字号不低于 24px**，所有文字必须在视频中清晰可读

### 内容呈现方式
像 Markdown 渲染一样简洁，只用这些元素：
- **标题**（h1/h2/h3 层级，衬线体，大号）
- **列表**（有序/无序，无衬线体）
- **代码块**（等宽字体 + 极淡背景）
- **SVG 图**（简洁线条图、流程图、ER 图，取代花哨卡片）
- **引用/高亮**（左边框 + 浅背景，用于强调关键信息）
- **分割线**（极淡，用于内容分区）

### 禁止的元素
- 不要渐变背景、发光效果、脉冲动画
- 不要毛玻璃、阴影层叠、彩色装饰
- 不要 emoji 做标题装饰（可在列表项中少量使用）
- 不要圆角卡片堆叠，用留白和排版代替

### 动画模式
保持克制，只用简单过渡：
- 入场: `spring({ frame, fps, config: { damping: 14, mass: 0.7 } })`
- 标题: 淡入 `opacity: 0->1`
- 内容块: 从下方滑入 `translateY(20->0) + opacity: 0->1`
- 列表项: 逐行淡入，延迟 5-6 帧
- **禁止缩放、旋转、弹跳等过度动画**

## 文案写作规范：多音字处理

edge-tts 无法自动判断多音字读音，**写文案时必须主动规避**。方法是给多音字加上下文词，让 TTS 正确断句：

| 错误写法 | TTS 会读成 | 正确写法 | TTS 读音 |
|---------|-----------|---------|---------|
| 技术同行 | tóng xíng（同行走） | 技术圈的同行 / 业内同行 | tóng háng ✓ |
| 行情 | xíng qíng | 市场行情 | háng qíng ✓ |
| 重复 | zhòng fù | 再重复一遍 / 重复执行 | chóng fù ✓ |
| 数据 | shù jù（一般正确） | — | — |
| 调用 | tiáo yòng | 函数调用 / API 调用 | diào yòng ✓ |

**原则：不要让多音字单独出现，给它加定语或上下文，让读音不言自明。**

## 避坑清单

1. **旁白超时** — 生成 TTS 后必须用 ffprobe 校验时长，公式 `dur >= ceil(audio_s * 30) + delay + 15`
2. **字幕遮挡** — 场景内容必须加 `paddingBottom: 120`
3. **淡出冲突** — 最后一个场景 `isLast=true` 不加淡出
4. **字体缺失** — 使用 `FONT` / `MONO` 常量，不硬编码字体名
5. **TTS 跳过** — 重新生成要加 `--force`，否则跳过已有文件
6. **总帧数** — Root.tsx 的 `durationInFrames` 必须 = 所有场景 dur 之和
7. **多音字** — 写文案时主动加上下文规避，不依赖 TTS 自动判断（见上方规范）
8. **timing 必须从 timing.json 导入** — 禁止内联 placeholder timing 数组。必须用 `import timingData from "./timing.json"`，否则字幕不同步。TTS 生成后 timing.json 自动产生，视频组件必须从这个文件导入
9. **代码缩进** — 用 MONO 字体展示代码时必须加 `whiteSpace: "pre"`，否则缩进会被 HTML 吞掉
10. **words 必须从 JSON 文件导入** — 禁止用 `emptyWords`、空数组 `[]`、或 placeholder 代替字幕数据。必须 `import xxxWords from "./words/xxx-words.json"` 导入 TTS 生成的真实字幕时间戳文件，并传给 `<Subtitle words={...}>`。不导入 = 没字幕
