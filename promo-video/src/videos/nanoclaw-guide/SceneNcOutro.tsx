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

const formulaParts = [
  "Claude Code",
  "消息渠道",
  "容器隔离",
  "定时任务",
  "持久记忆",
];

export const SceneNcOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const formulaProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
            fontFamily: MONO,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.accent,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(titleProg, [0, 1], [0.8, 1])})`,
          }}
        >
          NanoClaw
        </div>

        {/* Formula */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 1000,
            opacity: interpolate(formulaProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(formulaProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {formulaParts.map((part, i) => (
            <div key={part} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  fontWeight: 600,
                  color: COLORS.text,
                  padding: "10px 24px",
                  borderRadius: 10,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                {part}
              </div>
              {i < formulaParts.length - 1 && (
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    color: COLORS.subtle,
                    fontWeight: 300,
                  }}
                >
                  +
                </div>
              )}
            </div>
          ))}
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 32,
              color: COLORS.accent,
              fontWeight: 700,
              marginLeft: 4,
            }}
          >
            = NanoClaw
          </div>
        </div>

        {/* Footer */}
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
          fork → /setup → 24/7 在线
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
