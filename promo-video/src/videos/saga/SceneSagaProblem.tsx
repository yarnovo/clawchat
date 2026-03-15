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

const steps = [
  { num: "①", label: "im-server 注册账号" },
  { num: "②", label: "agent-server 建数据库记录" },
  { num: "③", label: "建立好友关系" },
  { num: "④", label: "启动 Docker 容器" },
];

export const SceneSagaProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const warningProg = spring({
    frame: frame - 50,
    fps,
    config: { damping: 14 },
  });

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
        {/* Title */}
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
          创建 Agent 四步曲
        </div>

        {/* Steps */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {steps.map((step, i) => {
            const prog = spring({
              frame: frame - 12 - i * 10,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={step.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "16px 32px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 36,
                    fontWeight: 700,
                    color: COLORS.accent,
                    flexShrink: 0,
                  }}
                >
                  {step.num}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    color: COLORS.text,
                  }}
                >
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Warning */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(warningProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(warningProg, [0, 1], [20, 0])}px)`,
            marginTop: 8,
          }}
        >
          任一步失败 → 脏数据
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
