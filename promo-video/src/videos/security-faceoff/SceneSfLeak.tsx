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

export const SceneSfLeak: React.FC = () => {
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
          泄露检测
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {/* OpenClaw - 无检测 */}
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
              minHeight: 280,
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
              无内置检测
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, textAlign: "center", lineHeight: 1.6 }}>
              密钥可能随输出泄露
              <br />
              无自动拦截机制
            </div>
          </div>

          {/* IronClaw - 请求/响应扫描 */}
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
            {/* 扫描流程 */}
            {[
              { step: "1", label: "请求扫描", desc: "检测入站密钥" },
              { step: "2", label: "响应扫描", desc: "检测出站密钥" },
              { step: "3", label: "拦截告警", desc: "发现泄露立即阻断" },
            ].map((item, i) => {
              const stepProg = spring({ frame: frame - 25 - i * 8, fps, config: { damping: 14 } });
              return (
                <div
                  key={item.step}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    opacity: interpolate(stepProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(stepProg, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.accent,
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      border: `2px solid ${COLORS.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 600, color: COLORS.text }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
