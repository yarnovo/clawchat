import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const words = [
  { part: "八十五", start: 0, dur: 0.8 },
  { part: "个", start: 0.8, dur: 0.3 },
  { part: "视频，", start: 1.1, dur: 0.6 },
  { part: "全部", start: 1.7, dur: 0.5 },
  { part: "出自", start: 2.2, dur: 0.4 },
  { part: "同一套", start: 2.6, dur: 0.7 },
  { part: "框架。", start: 3.3, dur: 0.6 },
];

export const SceneTts: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const elapsed = frame / fps;

  // Code block
  const codeOp = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Waveform + word visualization
  const vizOp = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
          paddingBottom: 140,
          paddingLeft: 100,
          paddingRight: 100,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Edge TTS 语音引擎
        </div>

        {/* TTS config code */}
        <div
          style={{
            opacity: codeOp,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: "24px 36px",
            boxShadow: COLORS.cardShadow,
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.text, whiteSpace: "pre", lineHeight: 1.7 }}>
{`voice: "zh-CN-XiaoxiaoNeural"    // 温暖中文女声
rate:  "+10%"                     // 语速微调
output: single MP3 + timestamps  // 单一音轨 + 词级时间戳`}
          </div>
        </div>

        {/* Word timeline visualization */}
        <div
          style={{
            opacity: vizOp,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: "20px 36px",
            boxShadow: COLORS.cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: "100%",
            maxWidth: 1200,
          }}
        >
          <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.subtle }}>
            词级时间戳可视化
          </div>

          {/* Timeline bar */}
          <div style={{ position: "relative", height: 56, background: COLORS.bg, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
            {words.map((w, i) => {
              const left = (w.start / 4.0) * 100;
              const width = (w.dur / 4.0) * 100;
              const isActive = elapsed > 1.5 + w.start && elapsed < 1.5 + w.start + w.dur;
              const isPast = elapsed >= 1.5 + w.start + w.dur;

              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    width: `${width}%`,
                    top: 4,
                    bottom: 4,
                    borderRadius: 6,
                    background: isActive ? COLORS.accent : isPast ? `${COLORS.accent}40` : COLORS.border,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    transition: "background 0.1s",
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? COLORS.card : isPast ? COLORS.accent : COLORS.muted,
                    }}
                  >
                    {w.part}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time scale */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {["0.0s", "1.0s", "2.0s", "3.0s", "4.0s"].map((t) => (
              <div key={t} style={{ fontFamily: MONO, fontSize: 18, color: COLORS.subtle }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
