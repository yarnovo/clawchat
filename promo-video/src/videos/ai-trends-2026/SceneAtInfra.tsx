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

const bigFive = ["Amazon", "Alphabet", "Meta", "Microsoft", "Oracle"];

export const SceneAtInfra: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const num1Prog = spring({ frame: frame - 10, fps, config: { damping: 12, mass: 0.8 } });
  const num2Prog = spring({ frame: frame - 22, fps, config: { damping: 12, mass: 0.8 } });
  const tagsProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          天量基础设施投资
        </div>

        <div style={{ display: "flex", gap: 80, alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              transform: `scale(${num1Prog})`,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 80, fontWeight: 700, color: COLORS.accent, lineHeight: 1 }}>
              $2.5 万亿
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted }}>
              全球 AI 支出
            </div>
          </div>

          <div
            style={{
              width: 2,
              height: 80,
              background: COLORS.border,
              opacity: interpolate(num2Prog, [0, 1], [0, 1]),
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              transform: `scale(${num2Prog})`,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 80, fontWeight: 700, color: COLORS.text, lineHeight: 1 }}>
              $6000 亿
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted }}>
              五大厂 CapEx（75% → AI）
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            opacity: interpolate(tagsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagsProg, [0, 1], [15, 0])}px)`,
          }}
        >
          {bigFive.map((name) => (
            <div
              key={name}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.muted,
                padding: "8px 18px",
                borderRadius: 8,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
