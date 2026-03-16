---
name: tts
description: 生成 TTS 语音文件。当用户说"生成语音"、"TTS"、"文字转语音"、"配音"等时调用。使用 edge-tts (node-edge-tts) 生成中文语音。
allowed-tools: Bash, Read, Write, Glob
---

# TTS 语音生成技能

使用 Microsoft Edge TTS（node-edge-tts）生成中文语音，免费、无需 API Key。

## 默认配置

- **音色**: `zh-CN-YunxiNeural`（年轻阳光男声）
- **输出目录**: `tts/`
- **格式**: MP3

## 生成命令

```bash
# 基本用法
npx node-edge-tts -t "要转换的文字" -v zh-CN-YunxiNeural -f tts/output.mp3

# 调整语速（+10% 加速，-10% 减速）
npx node-edge-tts -t "文字" -v zh-CN-YunxiNeural -r "+10%" -f tts/output.mp3

# 同时生成字幕时间戳（输出 .json 到同目录）
npx node-edge-tts -t "文字" -v zh-CN-YunxiNeural -f tts/output.mp3 -s
```

## 可用中文音色

免费可用的音色（已验证）：

| 音色 ID | 名称 | 性别 | 特点 |
|---------|------|------|------|
| zh-CN-YunxiNeural | 云希 | 男 | 年轻阳光（默认） |
| zh-CN-YunxiNeural | 云夏 | 男 | 少年感 |
| zh-CN-YunjianNeural | 云健 | 男 | 沉稳有力 |
| zh-CN-YunyangNeural | 云扬 | 男 | 新闻播报风 |
| zh-CN-XiaoxiaoNeural | 晓晓 | 女 | 温暖活泼 |
| zh-CN-XiaoyiNeural | 晓伊 | 女 | 甜美清新 |
| zh-CN-XiaoxuanNeural | 晓萱 | 女 | 知性优雅 |

## 批量生成

当需要为多段文本生成语音时，用脚本并行处理：

```bash
# 示例：从 JSON 文件批量生成
# narration.json 格式: [{"id": "intro", "text": "文案"}, ...]
for entry in $(cat narration.json | jq -c '.[]'); do
  id=$(echo $entry | jq -r '.id')
  text=$(echo $entry | jq -r '.text')
  npx node-edge-tts -t "$text" -v zh-CN-YunxiNeural -f "tts/${id}.mp3" -s &
done
wait
```

## 校验音频时长

生成后用 ffprobe 检查时长：

```bash
for f in tts/*.mp3; do
  name=$(basename "$f" .mp3)
  dur=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f")
  echo "$name: ${dur}s"
done
```

## 注意事项

- 需要网络连接（调用微软在线 TTS 服务）
- 多音字处理：不要让多音字单独出现，加定语或上下文消除歧义（如"函数调用"而非单独"调用"）
- 超时问题：网络不稳定时加 `--timeout 30000`
