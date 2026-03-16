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

const demoWords = ["字幕", "系统", "逐词", "高亮，", "当前词", "标注", "橙色", "下划线。"];

export const SceneSubtitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  // Which word is "current" (cycles through)
  const wordIdx = Math.floor(((frame - 20) / 12)) % demoWords.length;
  const showDemo = frame > 20;

  // Feature list
  const features = [
    { label: "逐词同步", desc: "TTS 时间戳驱动每个词的显示时机" },
    { label: "三态样式", desc: "已读（深色）→ 当前（加粗 + 下划线）→ 未读（浅灰）" },
    { label: "自动淡出", desc: "句子说完后 500ms 开始淡出，1s 完全消失" },
    { label: "毛玻璃背景", desc: "半透明白底 + backdrop-filter: blur(12px)" },
  ];

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
          paddingLeft: 80,
          paddingRight: 80,
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
          逐词高亮字幕
        </div>

        {/* Live demo */}
        {showDemo && (
          <div
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(12px)",
              borderRadius: 12,
              padding: "18px 36px",
              display: "flex",
              gap: 4,
              flexWrap: "wrap",
              justifyContent: "center",
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            {demoWords.map((w, i) => {
              const isPast = i < wordIdx;
              const isCurrent = i === wordIdx;
              return (
                <span
                  key={i}
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 36,
                    fontWeight: isCurrent ? 700 : 400,
                    color: isCurrent ? COLORS.text : isPast ? COLORS.text : COLORS.subtle,
                    textDecoration: isCurrent ? "underline" : "none",
                    textDecorationColor: COLORS.accent,
                    textUnderlineOffset: 6,
                    textDecorationThickness: 3,
                    padding: "0 2px",
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        )}

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1000 }}>
          {features.map((f, i) => {
            const delay = 25 + i * 10;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={f.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "14px 24px",
                  background: COLORS.card,
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-20, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: COLORS.accent, minWidth: 140 }}>
                  {f.label}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
