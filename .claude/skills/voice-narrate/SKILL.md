---
name: voice-narrate
description: 语音讲解模式。当用户说"语音讲解"、"用语音说"、"讲给我听"等时调用。回答问题时同时输出文字和 TTS 语音并自动播放。
allowed-tools: Bash, Read, Glob, Grep
---

# 语音讲解模式

回答用户问题时，同时输出文字内容和生成 TTS 语音，自动播放。

## 规则

1. **先输出文字**，再生成语音
2. **语音文案**不需要和文字完全一致，应该是文字内容的口语化摘要，去掉表格、代码等不适合朗读的部分
3. **分段生成**：每段控制在 2-3 句话，避免超时
4. **串行播放**：用 `afplay` 串行播放，最后一段用 `open` 打开

## TTS 命令

```bash
# 单段
npx node-edge-tts -t "文案" -v zh-CN-YunxiNeural --timeout 30000 -f tts/topic-1.mp3

# 多段生成（串行，避免并发冲突）
npx node-edge-tts -t "第一段" -v zh-CN-YunxiNeural --timeout 30000 -f tts/topic-1.mp3 \
&& npx node-edge-tts -t "第二段" -v zh-CN-YunxiNeural --timeout 30000 -f tts/topic-2.mp3
```

## 播放命令

```bash
# 短内容（单段）
open tts/topic.mp3

# 长内容（多段串行播放）
afplay tts/topic-1.mp3 && afplay tts/topic-2.mp3 && open tts/topic-3.mp3
```

## 注意事项

- 音色固定 `zh-CN-YunxiNeural`（云希）
- 输出目录固定 `tts/`
- 文件名用 `话题-序号` 格式，如 `k3s-1.mp3`
- 每段文案不超过 80 字，避免 edge-tts 超时
- 多音字加上下文消歧（如"函数调用"而非单独"调用"）
- 此模式按需激活，用户说"语音讲解"时才开启，不是每次回答都生成语音
