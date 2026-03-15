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

const items = [
  "技能安装记录 → 消失",
  "对话历史 → 消失",
  "配置状态 → 消失",
];

export const SceneVsProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const footerProg = spring({
    frame: frame - 12 - items.length * 10,
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
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          没有 Volume 的问题
        </div>

        {/* List */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
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
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
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
                    fontSize: 36,
                    color: COLORS.text,
                    lineHeight: 1.5,
                  }}
                >
                  {text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 42,
            fontWeight: 700,
            color: COLORS.accent,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [20, 0])}px)`,
            marginTop: 12,
          }}
        >
          容器删除 = Agent 失忆
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
