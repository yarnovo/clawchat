import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, MONO } from "../../constants";

const promptLines = [
  "你是一个专业的法律顾问。",
  "你的职责是：",
  "- 解答法律咨询",
  "- 分析合同条款",
  "- 提供合规建议",
  "回复要专业、准确、易懂。",
];

export const SceneAcPrompt: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const blockProg = spring({
    frame: frame - 15,
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
          gap: 48,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          系统提示词
        </div>

        {/* Code block */}
        <div
          style={{
            padding: "36px 48px",
            borderRadius: 16,
            background: "rgba(218,119,86,0.04)",
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(blockProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(blockProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {promptLines.map((line, i) => {
            const lineProg = spring({
              frame: frame - 20 - i * 6,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 30,
                  lineHeight: 1.8,
                  color: COLORS.text,
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [20, 0])}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
