import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_SANS } from "./constants";

interface WordBoundary {
  part: string;
  start: number;
  end: number;
}

export const Subtitle: React.FC<{
  words: WordBoundary[];
  delayFrames?: number;
  offsetMs?: number;
}> = ({ words, delayFrames = 0, offsetMs = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (words.length === 0) return null;

  const elapsedMs = offsetMs + ((frame - delayFrames) / fps) * 1000;

  let lastSpokenIdx = -1;
  for (let i = words.length - 1; i >= 0; i--) {
    if (elapsedMs >= words[i].start) {
      lastSpokenIdx = i;
      break;
    }
  }

  if (lastSpokenIdx < 0) return null;

  const lastWord = words[words.length - 1];
  const sentenceDoneMs = lastWord.end;
  const fadeOutStart = sentenceDoneMs + 500;
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
          gap: 2,
          padding: "16px 40px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
          maxWidth: 1100,
        }}
      >
        {words.map((w, i) => {
          const isSpoken = i <= lastSpokenIdx;
          const isCurrent = i === lastSpokenIdx && elapsedMs < w.end;

          return (
            <span
              key={i}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 34,
                fontWeight: isCurrent ? 700 : 400,
                letterSpacing: 0.5,
                color: isSpoken ? COLORS.text : COLORS.subtle,
                borderBottom: isCurrent
                  ? `2px solid ${COLORS.accent}`
                  : "2px solid transparent",
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
