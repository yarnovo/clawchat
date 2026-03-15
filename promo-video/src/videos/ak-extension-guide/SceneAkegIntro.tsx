import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const items = [
  { label: "Provider", desc: "供给核心依赖", color: COLORS.accent },
  { label: "Channel", desc: "连接外部世界", color: COLORS.muted },
  { label: "Extension", desc: "增强 Agent 行为", color: COLORS.text },
];

export const SceneAkegIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 48, paddingBottom: 140 }}>
        <div style={{
          fontFamily: FONT, fontSize: 72, fontWeight: 700, color: COLORS.text, letterSpacing: -2,
          opacity: interpolate(titleProg, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
        }}>
          三种扩展方式
        </div>
        <div style={{ display: "flex", gap: 40 }}>
          {items.map((item, i) => {
            const prog = spring({ frame: frame - 20 - i * 10, fps, config: { damping: 12, mass: 0.6 } });
            return (
              <div key={item.label} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                background: COLORS.card, border: `2px solid ${COLORS.border}`, borderRadius: 20,
                padding: "32px 48px", minWidth: 280, boxShadow: COLORS.cardShadow,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
              }}>
                <div style={{ fontFamily: FONT_SANS, fontSize: 36, fontWeight: 700, color: item.color }}>{item.label}</div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>{item.desc}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
