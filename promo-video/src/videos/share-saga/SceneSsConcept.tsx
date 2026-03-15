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

const quotes = [
  "正向：按顺序执行本地事务",
  "失败：逆序执行补偿操作",
];

export const SceneSsConcept: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const q1Prog = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const q2Prog = spring({ frame: frame - 28, fps, config: { damping: 14 } });
  const footProg = spring({ frame: frame - 42, fps, config: { damping: 14 } });

  const qProgs = [q1Prog, q2Prog];

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
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          核心思想
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            width: 860,
          }}
        >
          {quotes.map((q, i) => (
            <div
              key={q}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                opacity: interpolate(qProgs[i], [0, 1], [0, 1]),
                transform: `translateX(${interpolate(qProgs[i], [0, 1], [40, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 52,
                  borderRadius: 3,
                  background: COLORS.accent,
                  flexShrink: 0,
                  marginRight: 24,
                }}
              />
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 36,
                  fontWeight: 600,
                  color: COLORS.text,
                  lineHeight: 1.4,
                }}
              >
                {q}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(footProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footProg, [0, 1], [20, 0])}px)`,
            marginTop: 8,
          }}
        >
          最终一致性，不是强一致性
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
