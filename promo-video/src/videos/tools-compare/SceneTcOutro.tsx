import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const recommendations = [
  {
    scenario: "浏览器自动化 + 灵活操控",
    runtime: "OpenClaw",
    color: COLORS.accent,
  },
  {
    scenario: "容器隔离 + 多 Agent 协作",
    runtime: "NanoClaw",
    color: "#5B8DEF",
  },
  {
    scenario: "企业级完整功能集",
    runtime: "IronClaw",
    color: "#7C5CBF",
  },
];

export const SceneTcOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
          如何选择？
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: 1000 }}>
          {recommendations.map((rec, i) => {
            const delay = 10 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.8 },
            });
            return (
              <div
                key={rec.runtime}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  padding: "24px 36px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-50, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.text,
                    flex: 1,
                  }}
                >
                  {rec.scenario}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.muted,
                    flexShrink: 0,
                  }}
                >
                  →
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    fontWeight: 700,
                    color: rec.color,
                    flexShrink: 0,
                    padding: "8px 24px",
                    borderRadius: 12,
                    background: `${rec.color}12`,
                    border: `1px solid ${rec.color}30`,
                  }}
                >
                  {rec.runtime}
                </div>
              </div>
            );
          })}
        </div>

        {(() => {
          const footerProg = spring({
            frame: frame - 50,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                color: COLORS.muted,
                marginTop: 8,
                opacity: interpolate(footerProg, [0, 1], [0, 1]),
              }}
            >
              三个 Runtime 并存不是冗余，是覆盖不同场景
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
