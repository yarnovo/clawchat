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

const summary = [
  { num: "6", label: "源文件" },
  { num: "1", label: "环境变量注入" },
  { num: "4", label: "基础设施配置" },
];

const next = ["数据库持久化", "ClawHub 官方同步", "本地发布功能"];

export const SceneDevOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const nextProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
          }}
        >
          最小改动，最大兼容
        </div>

        <div style={{ display: "flex", gap: 48 }}>
          {summary.map((s, i) => {
            const delay = 10 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.7, 1])})`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 64, fontWeight: 800, color: COLORS.accent }}>
                  {s.num}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            opacity: interpolate(nextProg, [0, 1], [0, 1]),
          }}
        >
          <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.subtle, letterSpacing: 2 }}>
            后续迭代
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {next.map((n) => (
              <div
                key={n}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  color: COLORS.muted,
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: `1px dashed ${COLORS.border}`,
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
