import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const items = [
  { label: "Provider", desc: "管供给", sub: "LLM · Session · Tool", color: COLORS.accent },
  { label: "Channel", desc: "管连接", sub: "HTTP · WebSocket · Scheduler", color: COLORS.muted },
  { label: "Extension", desc: "管增强", sub: "Skills · Memory · Logging", color: COLORS.text },
];

export const SceneAkegSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 48, paddingBottom: 140 }}>
        <div style={{
          fontFamily: FONT, fontSize: 56, fontWeight: 700, color: COLORS.text,
          opacity: interpolate(titleProg, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
        }}>互不依赖，按需组合</div>

        <div style={{ display: "flex", gap: 36 }}>
          {items.map((item, i) => {
            const prog = spring({ frame: frame - 16 - i * 10, fps, config: { damping: 12, mass: 0.6 } });
            return (
              <div key={item.label} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                background: COLORS.card, border: `2px solid ${COLORS.border}`, borderRadius: 20,
                padding: "36px 44px", minWidth: 320, boxShadow: COLORS.cardShadow,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
              }}>
                <div style={{ fontFamily: FONT_SANS, fontSize: 40, fontWeight: 700, color: item.color }}>{item.label}</div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 32, fontWeight: 600, color: COLORS.text }}>{item.desc}</div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted, letterSpacing: 1 }}>{item.sub}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
