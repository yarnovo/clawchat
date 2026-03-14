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

export const ScenePositioning: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftEnt = spring({
    frame: frame - 5,
    fps,
    config: { damping: 14 },
  });
  const rightEnt = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14 },
  });
  const taglineEnt = spring({
    frame: frame - 35,
    fps,
    config: { damping: 12, mass: 0.8 },
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
          gap: 50,
          paddingBottom: 140,
        }}
      >
        {/* Tagline */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(taglineEnt, [0, 1], [0, 1]),
            transform: `scale(${interpolate(taglineEnt, [0, 1], [0.8, 1])})`,
          }}
        >
          第一个原生 AI Agent 聊天应用
        </div>

        {/* Left-right comparison */}
        <div style={{ display: "flex", alignItems: "center", gap: 80 }}>
          {/* Left: Generic IM */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              opacity: interpolate(leftEnt, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftEnt, [0, 1], [-80, 0])}px)`,
            }}
          >
            <div style={{ display: "flex", gap: 16, fontSize: 48 }}>
              <span>💬</span>
              <span>📱</span>
              <span>🖥️</span>
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                color: COLORS.muted,
                textAlign: "center",
              }}
            >
              WhatsApp / 微信 / Slack
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.muted,
                padding: "8px 20px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
              }}
            >
              为人类聊天设计
            </div>
          </div>

          {/* VS */}
          <div
            style={{
              fontFamily: FONT,
              fontSize: 36,
              fontWeight: 700,
              color: COLORS.subtle,
              opacity: interpolate(leftEnt, [0, 1], [0, 1]),
            }}
          >
            VS
          </div>

          {/* Right: ClawChat */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              opacity: interpolate(rightEnt, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightEnt, [0, 1], [80, 0])}px)`,
            }}
          >
            <div style={{ fontSize: 48 }}>🐾</div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 30,
                fontWeight: 700,
                color: COLORS.accent,
              }}
            >
              ClawChat
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.text,
                padding: "8px 20px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                background: COLORS.card,
                boxShadow: COLORS.cardShadow,
              }}
            >
              为 AI Agent 设计
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
