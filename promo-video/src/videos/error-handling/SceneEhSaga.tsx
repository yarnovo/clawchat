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
  "创建失败 → 自动逆序回滚",
  "API Key 耗尽 → exhausted 状态",
  "每个失败都有恢复策略",
  "不留中间态",
];

export const SceneEhSaga: React.FC = () => {
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
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          业务层 Saga
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
                  transform: `translateX(${interpolate(prog, [0, 1], [40, 0])}px)`,
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
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
