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

const steps = [
  { step: "Step 1", cmd: "gh repo fork --clone", desc: "Fork 并克隆仓库" },
  { step: "Step 2", cmd: "claude", desc: "进入 Claude Code" },
  { step: "Step 3", cmd: "/setup", desc: "自动装依赖、配认证、启动" },
];

export const SceneNcSetup: React.FC = () => {
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
          gap: 36,
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
          三步启动
        </div>

        <div style={{ display: "flex", gap: 28 }}>
          {steps.map((s, i) => {
            const delay = 12 + i * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={s.step}
                style={{
                  width: 340,
                  padding: "28px 30px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.accent,
                  }}
                >
                  {s.step}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.text,
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "#1E1E1E",
                  }}
                >
                  <span style={{ color: "#DA7756" }}>$ </span>
                  <span style={{ color: "#D4D4D4" }}>{s.cmd}</span>
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {s.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
