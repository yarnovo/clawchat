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

const xmlLines = [
  { code: '<skill name="search" version="1.2" trust="builtin">', highlight: false },
  { code: "  搜索互联网内容...", highlight: false },
  { code: "</skill>", highlight: false },
  { code: '<skill name="translate" version="0.8" trust="installed">', highlight: true },
  { code: "  翻译多语言文本...", highlight: false },
  { code: "  <!-- SUGGESTIONS only -->", highlight: true },
  { code: "</skill>", highlight: false },
];

export const SceneSlIronclaw: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const channelProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const warnProg = spring({ frame: frame - 65, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
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
          IronClaw
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 4,
          }}
        >
          独立 skill_context 通道
        </div>

        {/* Channel label */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            color: COLORS.muted,
            padding: "6px 18px",
            borderRadius: 8,
            background: "rgba(218, 119, 86, 0.06)",
            border: `1px solid ${COLORS.border}`,
            opacity: interpolate(channelProg, [0, 1], [0, 1]),
            marginBottom: 8,
          }}
        >
          channel: skill_context (非 system prompt)
        </div>

        {/* XML block */}
        <div
          style={{
            padding: "24px 36px",
            borderRadius: 14,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            width: 780,
          }}
        >
          {xmlLines.map((line, i) => {
            const delay = 25 + i * 6;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  color: line.highlight ? COLORS.accent : COLORS.text,
                  fontWeight: line.highlight ? 600 : 400,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-16, 0])}px)`,
                  whiteSpace: "pre",
                }}
              >
                {line.code}
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            fontWeight: 600,
            color: COLORS.accent,
            marginTop: 8,
            padding: "10px 28px",
            borderRadius: 10,
            background: "rgba(218, 119, 86, 0.08)",
            border: `1px solid rgba(218, 119, 86, 0.2)`,
            opacity: interpolate(warnProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(warnProg, [0, 1], [16, 0])}px)`,
          }}
        >
          Installed 技能 → SUGGESTIONS only
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
