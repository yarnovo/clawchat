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

const phases = [
  {
    stage: "开发",
    cmd: "prisma migrate dev",
    desc: "自动生成迁移文件",
  },
  {
    stage: "上线",
    cmd: "prisma migrate deploy",
    desc: "容器启动时自动执行",
  },
];

export const SceneDeployDb: React.FC = () => {
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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          数据库迁移
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {phases.map((p, i) => {
            const delay = 12 + i * 14;
            const cardProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={p.stage}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                  background: COLORS.card,
                  borderRadius: 16,
                  border: `1px solid ${COLORS.border}`,
                  padding: "36px 48px",
                  width: 420,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {p.stage}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: COLORS.accent,
                    padding: "8px 20px",
                    borderRadius: 8,
                    background: "rgba(218,119,86,0.06)",
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  {p.cmd}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    textAlign: "center",
                  }}
                >
                  {p.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
