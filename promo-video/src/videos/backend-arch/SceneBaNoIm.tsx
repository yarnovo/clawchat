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

const traditionalFlow = [
  { label: "App", sub: "send msg" },
  { label: "IM Server", sub: "store + route" },
  { label: "Agent", sub: "process" },
];

const ourFlow = [
  { label: "App", sub: "SSE connect" },
  { label: "Container", sub: "Agent + SQLite" },
];

export const SceneBaNoIm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const rightProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });
  const labelProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          为什么不需要 IM 服务器
        </div>

        {/* Two columns comparison */}
        <div
          style={{
            display: "flex",
            gap: 60,
            alignItems: "flex-start",
          }}
        >
          {/* Traditional */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-30, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.muted,
                marginBottom: 8,
              }}
            >
              传统架构
            </div>
            {traditionalFlow.map((step, i) => (
              <div key={step.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 14,
                    padding: "18px 36px",
                    boxShadow: COLORS.cardShadow,
                    minWidth: 200,
                    textAlign: "center" as const,
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: COLORS.text }}>
                    {step.label}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 16, color: COLORS.muted, marginTop: 4 }}>
                    {step.sub}
                  </div>
                </div>
                {i < traditionalFlow.length - 1 && (
                  <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.subtle }}>{"\u2193"}</div>
                )}
              </div>
            ))}
          </div>

          {/* VS divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "center",
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.accent,
                padding: "16px 24px",
                borderRadius: 50,
                border: `2px solid ${COLORS.accent}`,
              }}
            >
              VS
            </div>
          </div>

          {/* Ours */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
              }}
            >
              AgentKit
            </div>
            {ourFlow.map((step, i) => (
              <div key={step.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    background: i === 1 ? COLORS.accent : COLORS.card,
                    border: i === 1 ? "none" : `1px solid ${COLORS.border}`,
                    borderRadius: 14,
                    padding: "18px 36px",
                    boxShadow: i === 1 ? "0 4px 24px rgba(218,119,86,0.2)" : COLORS.cardShadow,
                    minWidth: 200,
                    textAlign: "center" as const,
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: i === 1 ? COLORS.white : COLORS.text }}>
                    {step.label}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 16, color: i === 1 ? "rgba(255,255,255,0.8)" : COLORS.muted, marginTop: 4 }}>
                    {step.sub}
                  </div>
                </div>
                {i < ourFlow.length - 1 && (
                  <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.accent }}>{"\u2193"}</div>
                )}
              </div>
            ))}
            {/* Direct connect label */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 20,
                color: COLORS.accent,
                fontWeight: 600,
                opacity: interpolate(labelProg, [0, 1], [0, 1]),
                background: "rgba(218,119,86,0.08)",
                borderRadius: 8,
                padding: "8px 20px",
              }}
            >
              直连，后端不介入
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
