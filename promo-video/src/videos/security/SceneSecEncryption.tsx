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

export const SceneSecEncryption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const storeProg = spring({ frame: frame - 15, fps, config: { damping: 14, mass: 0.7 } });
  const runtimeProg = spring({ frame: frame - 30, fps, config: { damping: 14, mass: 0.7 } });
  const noteProg = spring({ frame: frame - 45, fps, config: { damping: 14, mass: 0.7 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          API Key 加密
        </div>

        {/* Storage comparison */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            width: 900,
          }}
        >
          {/* Database storage */}
          <div
            style={{
              padding: "20px 32px",
              borderRadius: 12,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(storeProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(storeProg, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.muted,
                marginBottom: 12,
              }}
            >
              数据库存储
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 26,
                color: COLORS.text,
              }}
            >
              sk-xxxxx → <span style={{ color: COLORS.accent }}>[加密密文]</span>
            </div>
          </div>

          {/* Runtime usage */}
          <div
            style={{
              padding: "20px 32px",
              borderRadius: 12,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(runtimeProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(runtimeProg, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.muted,
                marginBottom: 12,
              }}
            >
              运行时使用
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 26,
                color: COLORS.text,
              }}
            >
              <span style={{ color: COLORS.accent }}>[解密]</span> → sk-xxxxx → 传递给容器
            </div>
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteProg, [0, 1], [20, 0])}px)`,
            marginTop: 8,
          }}
        >
          即使数据库泄露，Key 也安全
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
