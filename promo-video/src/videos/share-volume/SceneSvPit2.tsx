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

export const SceneSvPit2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const diagramProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 24, fps, config: { damping: 14 } });
  const tipProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 50,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          坑 2：数据和应用耦合
        </div>

        {/* Diagram card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            padding: "28px 48px",
            opacity: interpolate(diagramProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(diagramProg, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 28,
              fontWeight: 600,
              color: COLORS.text,
              textAlign: "center",
            }}
          >
            App A 的 Volume
          </div>
          <div style={{ fontSize: 36, color: COLORS.muted }}>→</div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 28,
              fontWeight: 600,
              color: "rgba(220,80,60,0.85)",
              textAlign: "center",
            }}
          >
            App B 读不出来
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteProg, [0, 1], [20, 0])}px)`,
          }}
        >
          不同应用，不同数据格式
        </div>

        {/* Bottom tip */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(tipProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tipProg, [0, 1], [20, 0])}px)`,
            marginTop: 12,
          }}
        >
          备份前先搞清楚里面存了什么
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
