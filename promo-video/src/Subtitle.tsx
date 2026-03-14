import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./constants";

/** edge-tts 的 word boundary 格式 */
interface WordBoundary {
  part: string;
  start: number;
  end: number;
}

/**
 * 字幕组件 — 逐词高亮显示
 *
 * @param words - edge-tts 的 word boundary 数据
 * @param delayFrames - 在场景内延迟的帧数（音频开始播放的时间点）
 */
export const Subtitle: React.FC<{
  words: WordBoundary[];
  delayFrames?: number;
  offsetMs?: number;
}> = ({ words, delayFrames = 0, offsetMs = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (words.length === 0) return null;

  // offsetMs: scene start in global audio (for single-track mode)
  // delayFrames: legacy per-scene audio delay
  const elapsedMs = offsetMs + ((frame - delayFrames) / fps) * 1000;

  // 找到当前正在说的词
  let lastSpokenIdx = -1;
  for (let i = words.length - 1; i >= 0; i--) {
    if (elapsedMs >= words[i].start) {
      lastSpokenIdx = i;
      break;
    }
  }

  // 还没开始说话
  if (lastSpokenIdx < 0) return null;

  // 整句说完后的淡出
  const lastWord = words[words.length - 1];
  const sentenceDoneMs = lastWord.end;
  const fadeOutStart = sentenceDoneMs + 500; // 说完后 500ms 开始淡出
  const fadeOutEnd = sentenceDoneMs + 1000;
  const fadeOut = elapsedMs > fadeOutStart
    ? interpolate(elapsedMs, [fadeOutStart, fadeOutEnd], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  if (fadeOut <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 0,
          padding: "12px 32px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          maxWidth: 900,
        }}
      >
        {words.map((w, i) => {
          const isSpoken = i <= lastSpokenIdx;
          const isCurrent = i === lastSpokenIdx && elapsedMs < w.end;

          return (
            <span
              key={i}
              style={{
                fontFamily: FONT,
                fontSize: 28,
                fontWeight: isCurrent ? 700 : 500,
                color: isSpoken
                  ? "#ffffff"
                  : "rgba(255,255,255,0.35)",
                transition: "color 0.1s",
                textShadow: isCurrent ? "0 0 12px rgba(108,99,255,0.6)" : "none",
              }}
            >
              {w.part}
            </span>
          );
        })}
      </div>
    </div>
  );
};
