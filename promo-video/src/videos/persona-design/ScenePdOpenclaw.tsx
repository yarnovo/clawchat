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

export const ScenePdOpenclaw: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const mainProg = spring({ frame: frame - 10, fps, config: { damping: 12, mass: 0.8 } });
  const descProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const chipsProg = spring({ frame: frame - 38, fps, config: { damping: 14 } });

  const scattered = ["channel config", "plugin A", "plugin B", "env vars"];

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
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
          OpenClaw
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(mainProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(mainProg, [0, 1], [0.8, 1])})`,
          }}
        >
          无集中定义
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            opacity: interpolate(descProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(descProg, [0, 1], [20, 0])}px)`,
          }}
        >
          分散在配置和插件里
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 8,
            opacity: interpolate(chipsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(chipsProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {scattered.map((s) => (
            <div
              key={s}
              style={{
                fontFamily: MONO,
                fontSize: 24,
                color: COLORS.muted,
                padding: "10px 22px",
                borderRadius: 10,
                background: COLORS.card,
                border: `1px dashed ${COLORS.subtle}`,
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
