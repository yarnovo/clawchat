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

const takeaways = [
  "Agent 接管工作流",
  "世界模型理解物理世界",
  "机器人走出实验室",
  "编程被重新定义",
];

export const SceneAtOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
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
            transform: `scale(${titleProg})`,
          }}
        >
          分水岭已到来
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            marginTop: 8,
          }}
        >
          {takeaways.map((t, i) => {
            const delay = 14 + i * 6;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14 } });
            return (
              <div
                key={t}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  fontWeight: 600,
                  color: COLORS.text,
                  padding: "12px 22px",
                  borderRadius: 10,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [15, 0])}px)`,
                }}
              >
                {t}
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [10, 0])}px)`,
          }}
        >
          2026 · AI 趋势全景
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
