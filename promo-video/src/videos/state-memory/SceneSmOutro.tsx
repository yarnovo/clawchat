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

const recommendations = [
  {
    runtime: "OpenClaw",
    level: "临时",
    scenario: "临时对话",
  },
  {
    runtime: "IronClaw",
    level: "持久",
    scenario: "持久记忆 + 审计",
  },
  {
    runtime: "NanoClaw",
    level: "隔离",
    scenario: "强隔离团队协作",
  },
];

export const SceneSmOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const cardsProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          选择策略 = 选择可靠性
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
            opacity: interpolate(cardsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardsProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {recommendations.map((r) => (
            <div
              key={r.runtime}
              style={{
                width: 320,
                padding: "32px 28px",
                borderRadius: 16,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 30,
                  fontWeight: 700,
                  color: COLORS.accent,
                }}
              >
                {r.runtime}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 36,
                  fontWeight: 700,
                  color: COLORS.text,
                }}
              >
                {r.level}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  color: COLORS.muted,
                  textAlign: "center",
                }}
              >
                {r.scenario}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            textAlign: "center",
            lineHeight: 1.8,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
          }}
        >
          状态策略决定 Agent 的记忆边界
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
