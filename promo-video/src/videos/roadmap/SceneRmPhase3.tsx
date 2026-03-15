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

const items = [
  "Docker 容器编排",
  "三种运行时支持",
  "OpenClaw 插件集成",
  "核心闭环：人 → Agent → 回复",
];

export const SceneRmPhase3: React.FC = () => {
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
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.accent,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Phase 3（进行中）
        </div>

        {/* List */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {items.map((text, i) => {
            const prog = spring({
              frame: frame - 12 - i * 10,
              fps,
              config: { damping: 14 },
            });

            return (
              <div
                key={text}
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
                  transform: `translateX(${interpolate(prog, [0, 1], [-30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: COLORS.accent,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    color: COLORS.text,
                  }}
                >
                  {text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom tag */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            color: COLORS.card,
            background: COLORS.accent,
            padding: "8px 24px",
            borderRadius: 8,
            opacity: interpolate(
              spring({ frame: frame - 55, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1],
            ),
          }}
        >
          当前重点
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
