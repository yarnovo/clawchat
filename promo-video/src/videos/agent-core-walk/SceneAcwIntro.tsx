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

const files = [
  "agent.ts",
  "llm.ts",
  "openai-provider.ts",
  "persona.ts",
  "types.ts",
  "memory.ts",
];

export const SceneAcwIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const tagsProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

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
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          agent-core 走读
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 36,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          6 个文件 · 300 行代码
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            opacity: interpolate(tagsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagsProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {files.map((f, i) => {
            const delay = 35 + i * 6;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={f}
                style={{
                  fontFamily: MONO,
                  fontSize: 26,
                  color: COLORS.accent,
                  padding: "10px 22px",
                  borderRadius: 8,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [16, 0])}px)`,
                }}
              >
                {f}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
