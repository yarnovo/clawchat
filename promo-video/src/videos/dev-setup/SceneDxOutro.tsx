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

const cmds = [
  { cmd: "make dev", desc: "启动" },
  { cmd: "make reload", desc: "热更前端" },
  { cmd: "make dev-stop", desc: "停止" },
];

export const SceneDxOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const cmdsProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
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
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          三条命令，覆盖日常
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
            opacity: interpolate(cmdsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cmdsProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {cmds.map((c) => (
            <div
              key={c.cmd}
              style={{
                padding: "28px 40px",
                borderRadius: 16,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: COLORS.accent }}>
                {c.cmd}
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted }}>
                {c.desc}
              </div>
            </div>
          ))}
        </div>

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
          clone → Docker → make dev → 开始贡献
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
