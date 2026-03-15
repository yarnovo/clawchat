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

const containers = [
  { group: "群组 A", state: "State A" },
  { group: "群组 B", state: "State B" },
  { group: "群组 C", state: "State C" },
];

export const SceneSmNanoclaw: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const containersProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const volumeProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

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
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          NanoClaw · 容器级状态
        </div>

        {/* Container per group */}
        <div
          style={{
            display: "flex",
            gap: 32,
            opacity: interpolate(containersProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(containersProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {containers.map((c) => (
            <div
              key={c.group}
              style={{
                width: 280,
                padding: "28px 24px",
                borderRadius: 16,
                background: COLORS.card,
                border: `2px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 600, color: COLORS.text }}>
                {c.group}
              </div>
              <div
                style={{
                  width: "100%",
                  padding: "16px 0",
                  borderRadius: 10,
                  background: "#F5F0EB",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.accent, fontWeight: 600 }}>
                  Container
                </div>
                <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.muted }}>
                  {c.state}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Volume mount */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "24px 40px",
            borderRadius: 14,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(volumeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(volumeProg, [0, 1], [30, 0])}px)`,
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: COLORS.accent }}>
            Volume
          </div>
          <div style={{ width: 2, height: 36, background: COLORS.border }} />
          <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted }}>
            挂载数据卷 = 持久化
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
          }}
        >
          天然隔离 · 容器销毁则状态丢失
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
