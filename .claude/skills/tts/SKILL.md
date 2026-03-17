---
name: tts
description: TTS 语音生成。当用户说"生成语音"、"读给我听"、"转语音"、"tts"等时调用。将文本转为语音并自动播放。
allowed-tools: Bash, Read, Glob, Grep
---

# TTS 语音生成

将文本内容转为语音 MP3 并自动播放。

## 流程

1. **确定文案**：将用户指定的文本（或回答内容的口语化摘要）作为语音文案
2. **分段**：每段不超过 80 字，控制在 2-3 句话，避免 edge-tts 超时
3. **生成**：用 `node-edge-tts` 串行生成 MP3
4. **播放**：生成完毕后自动播放

## TTS 命令

```bash
# 单段
npx node-edge-tts -t "文案" -v zh-CN-YunxiNeural --timeout 30000 -f tts/topic-1.mp3

# 多段（串行生成）
npx node-edge-tts -t "第一段" -v zh-CN-YunxiNeural --timeout 30000 -f tts/topic-1.mp3 \
&& npx node-edge-tts -t "第二段" -v zh-CN-YunxiNeural --timeout 30000 -f tts/topic-2.mp3
```

## 播放命令

```bash
# 单段
open tts/topic.mp3

# 多段串行播放
afplay tts/topic-1.mp3 && afplay tts/topic-2.mp3 && open tts/topic-3.mp3
```

## 注意事项

- 音色固定 `zh-CN-YunxiNeural`（云希）
- 输出目录固定 `tts/`
- 文件名用 `话题-序号` 格式，如 `k3s-1.mp3`
- 每段文案不超过 80 字
- 多音字加上下文消歧（如"函数调用"而非单独"调用"）
