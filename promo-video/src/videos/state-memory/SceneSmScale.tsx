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

const columns = [
  {
    runtime: "OpenClaw",
    strategy: "单进程内存",
    scale: "加内存 / 分片",
    icon: "RAM",
  },
  {
    runtime: "IronClaw",
    strategy: "数据库共享",
    scale: "多 Worker 水平扩展",
    icon: "DB",
  },
  {
    runtime: "NanoClaw",
    strategy: "容器隔离",
    scale: "按容器扩展",
    icon: "CTR",
  },
];

export const SceneSmScale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          扩展性对比
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {columns.map((col, i) => {
            const delay = 12 + i * 14;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14 } });
            return (
              <div
                key={col.runtime}
                style={{
                  width: 340,
                  padding: "32px 28px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 40,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {col.icon}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {col.runtime}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 1,
                    background: COLORS.border,
                  }}
                />
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {col.strategy}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {col.scale}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
