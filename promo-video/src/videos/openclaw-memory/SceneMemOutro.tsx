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

const layers = [
  { num: "L1", label: "会话层", desc: "完整日志" },
  { num: "L2", label: "工作空间", desc: "可读笔记" },
  { num: "L3", label: "向量层", desc: "语义搜索" },
];

export const SceneMemOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const mottoDelay = 45;
  const mottoProg = spring({ frame: frame - mottoDelay, fps, config: { damping: 14 } });

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
          三层架构，各司其职
        </div>

        <div style={{ display: "flex", gap: 48 }}>
          {layers.map((l, i) => {
            const delay = 10 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={l.num}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.7, 1])})`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 56, fontWeight: 800, color: COLORS.accent }}>
                  {l.num}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, color: COLORS.text }}>
                  {l.label}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.muted }}>
                  {l.desc}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(mottoProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(mottoProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Agent 的记忆就是它的经验，值得好好保管
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
