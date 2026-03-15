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

const packages = [
  { name: "core", desc: "引擎: while 循环 + LLM 调用", color: "#DA7756" },
  { name: "tools", desc: "13 个内置工具", color: "#C06840" },
  { name: "eval", desc: "评估评分器", color: "#B05A35" },
  { name: "channels", desc: "接口层, 接收外部消息", color: "#DA7756" },
  { name: "scheduler", desc: "定时任务, cron 执行", color: "#C06840" },
  { name: "cli", desc: "命令行入口, 集成所有包", color: "#B05A35" },
];

export const SceneAkPackages: React.FC = () => {
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
          六个包
        </div>

        {/* Cards grid: 3x2 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 24,
            maxWidth: 1200,
          }}
        >
          {packages.map((pkg, i) => {
            const delay = 10 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={pkg.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: "28px 32px",
                  width: 360,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  borderLeft: `4px solid ${pkg.color}`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 30,
                    fontWeight: 700,
                    color: pkg.color,
                  }}
                >
                  {pkg.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.text,
                    lineHeight: 1.4,
                  }}
                >
                  {pkg.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
