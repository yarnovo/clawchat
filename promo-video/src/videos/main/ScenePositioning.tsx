import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT } from "../../constants";

export const ScenePositioning: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftEnt = spring({ frame: frame - 5, fps, config: { damping: 14 } });
  const rightEnt = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const taglineEnt = spring({ frame: frame - 35, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0f0c29", "#1a1845", "#0f0c29"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 50,
          paddingBottom: 120, /* 为底部字幕留空间 */
        }}
      >
        {/* Tagline — 顶部 */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 36,
            fontWeight: 700,
            color: COLORS.white,
            opacity: interpolate(taglineEnt, [0, 1], [0, 1]),
            transform: `scale(${interpolate(taglineEnt, [0, 1], [0.8, 1])})`,
            textShadow: "0 0 30px rgba(108,99,255,0.4)",
          }}
        >
          第一个原生 AI Agent 聊天应用
        </div>

        {/* 左右对比 — 横排 */}
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
                fontFamily: FONT,
                fontSize: 24,
                color: "rgba(255,255,255,0.5)",
                textAlign: "center",
              }}
            >
              WhatsApp / 微信 / Slack
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 20,
                color: "rgba(255,100,100,0.7)",
                padding: "8px 20px",
                border: "1px solid rgba(255,100,100,0.2)",
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
              fontWeight: 800,
              color: "rgba(255,255,255,0.3)",
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
            <div style={{ fontSize: 64 }}>🐾</div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 32,
                fontWeight: 800,
                color: COLORS.white,
              }}
            >
              ClawChat
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 20,
                color: COLORS.accent,
                padding: "8px 20px",
                border: "1px solid rgba(7,193,96,0.3)",
                borderRadius: 12,
                background: "rgba(7,193,96,0.08)",
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
