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

const expectedTrace = [
  { tool: "search_db", color: "#5A9E6F" },
  { tool: "format_result", color: "#7B8EC4" },
  { tool: "send_reply", color: COLORS.accent },
];

const actualTrace = [
  { tool: "search_db", color: "#5A9E6F", match: true },
  { tool: "format_result", color: "#7B8EC4", match: true },
  { tool: "send_reply", color: COLORS.accent, match: true },
];

const modes = [
  { label: "精确匹配", desc: "顺序 + 参数完全一致" },
  { label: "模糊匹配", desc: "允许额外步骤" },
  { label: "LLM 裁判", desc: "语义等价判断" },
];

export const SceneEfL2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const badgeProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const traceProg = spring({ frame: frame - 16, fps, config: { damping: 14, mass: 0.7 } });
  const modesProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 700,
              color: COLORS.text,
              opacity: interpolate(titleProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            L2 · agentevals
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              color: COLORS.white,
              background: "#C4956A",
              padding: "6px 18px",
              borderRadius: 8,
              opacity: interpolate(badgeProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(badgeProg, [0, 1], [0.8, 1])})`,
            }}
          >
            LangChain 出品
          </div>
        </div>

        {/* Trace comparison */}
        <div
          style={{
            display: "flex",
            gap: 60,
            alignItems: "flex-start",
            opacity: interpolate(traceProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(traceProg, [0, 1], [24, 0])}px)`,
          }}
        >
          {/* Expected */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 600,
                color: COLORS.muted,
                marginBottom: 8,
              }}
            >
              预期轨迹
            </div>
            {expectedTrace.map((t, i) => {
              const delay = 20 + i * 10;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
              return (
                <div key={`exp-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 600,
                      color: t.color,
                      padding: "14px 28px",
                      borderRadius: 12,
                      background: COLORS.card,
                      border: `2px solid ${t.color}`,
                      boxShadow: COLORS.cardShadow,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(prog, [0, 1], [-16, 0])}px)`,
                    }}
                  >
                    {t.tool}
                  </div>
                  {i < expectedTrace.length - 1 && (
                    <div style={{ fontFamily: MONO, fontSize: 28, color: COLORS.subtle, margin: "4px 0" }}>|</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Match indicator */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              alignSelf: "center",
            }}
          >
            {actualTrace.map((t, i) => {
              const delay = 35 + i * 10;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
              return (
                <div
                  key={`match-${i}`}
                  style={{
                    fontFamily: MONO,
                    fontSize: 32,
                    color: "#5A9E6F",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(prog, [0, 1], [0.5, 1])})`,
                    height: 56,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  =
                </div>
              );
            })}
          </div>

          {/* Actual */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 600,
                color: COLORS.muted,
                marginBottom: 8,
              }}
            >
              实际轨迹
            </div>
            {actualTrace.map((t, i) => {
              const delay = 24 + i * 10;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
              return (
                <div key={`act-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 600,
                      color: t.color,
                      padding: "14px 28px",
                      borderRadius: 12,
                      background: COLORS.card,
                      border: `2px solid ${t.color}`,
                      boxShadow: COLORS.cardShadow,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(prog, [0, 1], [16, 0])}px)`,
                    }}
                  >
                    {t.tool}
                  </div>
                  {i < actualTrace.length - 1 && (
                    <div style={{ fontFamily: MONO, fontSize: 28, color: COLORS.subtle, margin: "4px 0" }}>|</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Three modes */}
        <div
          style={{
            display: "flex",
            gap: 24,
            opacity: interpolate(modesProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(modesProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {modes.map((m, i) => {
            const delay = 60 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={m.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "14px 24px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}
              >
                <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, color: COLORS.accent }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {m.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
