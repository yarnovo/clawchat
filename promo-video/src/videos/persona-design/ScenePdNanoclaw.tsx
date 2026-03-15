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

export const ScenePdNanoclaw: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const fileProg = spring({ frame: frame - 10, fps, config: { damping: 12, mass: 0.8 } });
  const layersProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const warningProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });

  const layers = [
    { name: "global", desc: "所有群组共享的基础人格" },
    { name: "group", desc: "每个群组可覆盖" },
  ];

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            letterSpacing: 2,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
          }}
        >
          NanoClaw
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            padding: "16px 44px",
            borderRadius: 16,
            background: COLORS.card,
            border: `2px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            transform: `scale(${interpolate(fileProg, [0, 1], [0.8, 1])})`,
            opacity: interpolate(fileProg, [0, 1], [0, 1]),
          }}
        >
          CLAUDE.md
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 8,
            opacity: interpolate(layersProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(layersProg, [0, 1], [24, 0])}px)`,
          }}
        >
          {layers.map((l, i) => (
            <div
              key={l.name}
              style={{
                padding: "20px 36px",
                borderRadius: 14,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                minWidth: 280,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 28,
                  fontWeight: 700,
                  color: i === 0 ? COLORS.accent : COLORS.text,
                }}
              >
                {l.name}/
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  color: COLORS.muted,
                }}
              >
                {l.desc}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.accent,
            marginTop: 4,
            padding: "8px 24px",
            borderRadius: 8,
            background: "rgba(218, 119, 86, 0.08)",
            border: `1px solid rgba(218, 119, 86, 0.2)`,
            opacity: interpolate(warningProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(warningProg, [0, 1], [16, 0])}px)`,
          }}
        >
          跟 Claude 绑定
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
