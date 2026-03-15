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

const pathSteps = ["服务", "平台", "生态"];

export const SceneAmOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const pathProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });

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
        {/* 主标题大字 */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.accent,
            padding: "14px 48px",
            borderRadius: 16,
            background: COLORS.card,
            border: `2px solid ${COLORS.accent}`,
            boxShadow: COLORS.cardShadow,
            transform: `scale(${titleProg})`,
          }}
        >
          先卖铲子，再开金矿
        </div>

        {/* 下方路径 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(pathProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(pathProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {pathSteps.map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 32,
                  fontWeight: 700,
                  color: COLORS.text,
                  padding: "12px 32px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                {step}
              </div>
              {i < pathSteps.length - 1 && (
                <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: COLORS.accent, fontWeight: 700 }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
