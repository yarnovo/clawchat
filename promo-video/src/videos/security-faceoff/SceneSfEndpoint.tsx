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

export const SceneSfEndpoint: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const rightProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          网络访问控制
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {/* OpenClaw - 无限制 */}
          <div
            style={{
              width: 520,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 300,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 600, color: COLORS.accent }}>
              OpenClaw
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 36,
                color: COLORS.subtle,
                fontWeight: 600,
              }}
            >
              无限制
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, textAlign: "center", lineHeight: 1.6 }}>
              工具可访问任意域名
              <br />
              无出站过滤
            </div>
          </div>

          {/* IronClaw - 白名单 */}
          <div
            style={{
              width: 520,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 600, color: COLORS.accent }}>
              IronClaw
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 600, color: COLORS.text }}>
              Endpoint 白名单
            </div>
            {[
              { rule: "api.github.com/*", status: "ALLOW" },
              { rule: "registry.npmjs.org/*", status: "ALLOW" },
              { rule: "*.evil.com", status: "DENY" },
            ].map((item, i) => {
              const ruleProg = spring({ frame: frame - 25 - i * 8, fps, config: { damping: 14 } });
              return (
                <div
                  key={item.rule}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 20px",
                    borderRadius: 10,
                    background: "#F5F0EB",
                    opacity: interpolate(ruleProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(ruleProg, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.text }}>
                    {item.rule}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      fontWeight: 700,
                      color: item.status === "ALLOW" ? COLORS.muted : COLORS.accent,
                    }}
                  >
                    {item.status}
                  </div>
                </div>
              );
            })}
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, lineHeight: 1.6 }}>
              阻断未授权外联
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
