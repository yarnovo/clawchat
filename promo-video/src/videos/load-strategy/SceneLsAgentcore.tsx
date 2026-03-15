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

const files = [
  { name: "AGENT.md", perm: "只读", protected: true },
  { name: "TOOLS.md", perm: "只读", protected: false },
  { name: "MEMORY.md", perm: "读写", protected: false },
  { name: "HEARTBEAT.md", perm: "只读", protected: false },
];

const steps = ["读文件", "拼接", "System Prompt"];

export const SceneLsAgentcore: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const flowProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            letterSpacing: 2,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
          }}
        >
          agent-core
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 4,
          }}
        >
          读文件 → 拼接 → System Prompt
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            justifyContent: "center",
          }}
        >
          {files.map((f, i) => {
            const delay = 18 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={f.name}
                style={{
                  padding: "24px 32px",
                  borderRadius: 14,
                  background: f.protected
                    ? `linear-gradient(135deg, ${COLORS.card}, rgba(218, 119, 86, 0.06))`
                    : COLORS.card,
                  border: f.protected
                    ? `2px solid ${COLORS.accent}`
                    : `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 210,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: f.protected ? COLORS.accent : COLORS.text,
                  }}
                >
                  {f.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: f.perm === "读写" ? "#4CAF50" : COLORS.muted,
                    fontWeight: f.perm === "读写" ? 600 : 400,
                  }}
                >
                  {f.perm}
                </div>
                {f.protected && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      right: -12,
                      fontFamily: FONT_SANS,
                      fontSize: 18,
                      fontWeight: 600,
                      color: COLORS.card,
                      background: COLORS.accent,
                      padding: "4px 12px",
                      borderRadius: 8,
                    }}
                  >
                    受保护
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 8,
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {steps.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  fontWeight: 600,
                  color: i === steps.length - 1 ? COLORS.accent : COLORS.text,
                  padding: "10px 24px",
                  borderRadius: 10,
                  background: COLORS.card,
                  border: i === steps.length - 1 ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                {s}
              </div>
              {i < steps.length - 1 && (
                <div style={{ fontFamily: FONT_SANS, fontSize: 32, color: COLORS.subtle }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
