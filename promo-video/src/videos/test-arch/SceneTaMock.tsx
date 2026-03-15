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

const calls = [
  { call: "调用 1", arrow: "->", result: "tool_call", resultColor: COLORS.accent },
  { call: "调用 2", arrow: "->", result: "text", resultColor: "#5A9E6F" },
];

export const SceneTaMock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const boxProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          FakeLLM 示意
        </div>

        <div
          style={{
            background: COLORS.card,
            border: `2px solid ${COLORS.accent}`,
            borderRadius: 16,
            boxShadow: COLORS.cardShadow,
            padding: "36px 60px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            opacity: interpolate(boxProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(boxProg, [0, 1], [0.9, 1])})`,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 30,
              fontWeight: 700,
              color: COLORS.accent,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            FakeLLM
          </div>

          {calls.map((c, i) => {
            const delay = 22 + i * 18;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={c.call}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 600,
                    color: COLORS.text,
                    minWidth: 100,
                  }}
                >
                  {c.call}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 32,
                    color: COLORS.muted,
                  }}
                >
                  {c.arrow}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: c.resultColor,
                    padding: "8px 24px",
                    borderRadius: 10,
                    background: `${c.resultColor}10`,
                    border: `1px solid ${c.resultColor}40`,
                  }}
                >
                  {c.result}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 8,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {["零 API 费用", "毫秒级", "可测边界"].map((t, i) => {
            const delay = 65 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={t}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  color: COLORS.muted,
                  padding: "8px 20px",
                  borderRadius: 8,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}
              >
                {t}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
