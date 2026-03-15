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

export const SceneSfCred: React.FC = () => {
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
          凭证管理
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {/* OpenClaw */}
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
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 600, color: COLORS.accent }}>
              OpenClaw
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 24,
                color: COLORS.text,
                padding: "16px 20px",
                borderRadius: 10,
                background: "#F5F0EB",
                lineHeight: 1.8,
              }}
            >
              API_KEY=sk-abc123...
              <br />
              DB_PASSWORD=mypass...
            </div>
            {[
              "环境变量明文存储",
              "应用级访问控制",
              "工具可直接读取密钥",
            ].map((item, i) => {
              const itemProg = spring({ frame: frame - 30 - i * 6, fps, config: { damping: 14 } });
              return (
                <div
                  key={item}
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    lineHeight: 1.6,
                    opacity: interpolate(itemProg, [0, 1], [0, 1]),
                  }}
                >
                  {item}
                </div>
              );
            })}
          </div>

          {/* IronClaw */}
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
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {["AES-256-GCM 加密", "OS Keychain 集成", "宿主边界注入"].map((layer, i) => {
                const layerProg = spring({ frame: frame - 30 - i * 6, fps, config: { damping: 14 } });
                return (
                  <div
                    key={layer}
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      color: COLORS.text,
                      padding: "12px 20px",
                      borderRadius: 10,
                      background: "#F5F0EB",
                      textAlign: "center",
                      opacity: interpolate(layerProg, [0, 1], [0, 1]),
                      transform: `translateY(${interpolate(layerProg, [0, 1], [10, 0])}px)`,
                    }}
                  >
                    {layer}
                  </div>
                );
              })}
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, lineHeight: 1.6 }}>
              密钥从不暴露给工具
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
