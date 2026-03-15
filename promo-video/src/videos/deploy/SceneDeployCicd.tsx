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
  "git tag v1.x.x",
  "GitHub Actions 触发",
  "构建 Docker 镜像",
  "rsync 同步到 ECS",
  "docker compose up",
];

export const SceneDeployCicd: React.FC = () => {
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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          CI/CD 自动化
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            padding: "8px 0",
            width: 720,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
          }}
        >
          {steps.map((step, i) => {
            const delay = 10 + i * 8;
            const rowProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={step}
                style={{
                  display: "flex",
                  padding: "14px 28px",
                  alignItems: "center",
                  gap: 20,
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.accent,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: "rgba(218,119,86,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    fontFamily: i === 0 || i === 4 ? MONO : FONT_SANS,
                    fontSize: 28,
                    color: COLORS.text,
                    fontWeight: 500,
                  }}
                >
                  {step}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
