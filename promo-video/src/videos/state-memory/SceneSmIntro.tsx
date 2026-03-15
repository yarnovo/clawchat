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

const strategies = [
  { icon: "RAM", label: "纯内存", runtime: "OpenClaw" },
  { icon: "DB", label: "数据库驱动", runtime: "IronClaw" },
  { icon: "CTR", label: "容器隔离", runtime: "NanoClaw" },
];

export const SceneSmIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const cardsProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

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
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          状态与内存 · 三种策略
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
          }}
        >
          Agent 怎么记住东西？
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 8,
            opacity: interpolate(cardsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardsProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {strategies.map((s) => (
            <div
              key={s.runtime}
              style={{
                width: 300,
                padding: "32px 28px",
                borderRadius: 16,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 40,
                  fontWeight: 700,
                  color: COLORS.accent,
                }}
              >
                {s.icon}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  fontWeight: 600,
                  color: COLORS.text,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  color: COLORS.muted,
                }}
              >
                {s.runtime}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
