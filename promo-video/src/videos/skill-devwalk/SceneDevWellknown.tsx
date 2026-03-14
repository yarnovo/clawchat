import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT_SANS, MONO } from "../../constants";

export const SceneDevWellknown: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });

  const jsonLines = [
    '{',
    '  "apiBase": "http://skill-registry:3007",',
    '  "minCliVersion": "0.1.0"',
    '}',
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
          gap: 36,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 44, fontWeight: 700, color: COLORS.accent }}>
            well-known.ts
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted }}>
            发现协议
          </div>
        </div>

        {/* Request */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 26,
            color: COLORS.text,
            padding: "14px 28px",
            borderRadius: 10,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
          }}
        >
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>GET</span>
          {" /.well-known/clawhub.json"}
        </div>

        {/* Response */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            padding: "20px 32px",
            borderRadius: 12,
            background: "#1A1A1A",
            color: "#E8E0D8",
            lineHeight: 1.6,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {jsonLines.map((line, i) => (
            <div key={i}>
              {line.includes("apiBase") ? (
                <>
                  {"  "}<span style={{ color: "#DA7756" }}>"apiBase"</span>: <span style={{ color: "#8BC34A" }}>"http://skill-registry:3007"</span>,
                </>
              ) : line.includes("minCliVersion") ? (
                <>
                  {"  "}<span style={{ color: "#DA7756" }}>"minCliVersion"</span>: <span style={{ color: "#8BC34A" }}>"0.1.0"</span>
                </>
              ) : (
                line
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.muted,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
          }}
        >
          CLI 访问此端点 → 拿到 apiBase → 知道 API 在哪
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
