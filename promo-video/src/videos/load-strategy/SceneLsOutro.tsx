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

const principles = [
  { icon: "1", title: "顺序优先级", desc: "越重要的文件越靠前" },
  { icon: "2", title: "条件过滤", desc: "隐私文件按场景过滤" },
  { icon: "3", title: "智能截断", desc: "大文件不丢关键信息" },
];

export const SceneLsOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });

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
          三个核心原则
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [16, 0])}px)`,
            marginBottom: 8,
          }}
        >
          人格文件全部注入系统提示词
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
          }}
        >
          {principles.map((p, i) => {
            const delay = 18 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={p.title}
                style={{
                  padding: "32px 40px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  minWidth: 300,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px) scale(${interpolate(prog, [0, 1], [0.9, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 36,
                    fontWeight: 700,
                    color: COLORS.accent,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    background: "rgba(218, 119, 86, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {p.icon}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {p.title}
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
