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

const measures = [
  { name: "API Key 加密", desc: "数据库加密存储，运行时解密", icon: "🔐" },
  { name: "Agent 配额", desc: "每用户限制创建数量", icon: "📊" },
  { name: "JWT 认证", desc: "只有 owner 能管理 Agent", icon: "🛡️" },
];

export const SceneAswSecurity: React.FC = () => {
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
          安全设计
        </div>

        {/* Security measures */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {measures.map((m, i) => {
            const delay = 12 + i * 12;
            const cardProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={m.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "20px 32px",
                  boxShadow: COLORS.cardShadow,
                  width: 700,
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [25, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 40, flexShrink: 0 }}>{m.icon}</div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 30,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {m.name}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                    }}
                  >
                    {m.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
