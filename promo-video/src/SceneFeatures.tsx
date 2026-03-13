import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "./GradientBg";
import { Particles } from "./Particles";
import { COLORS, FONT } from "./constants";

const features = [
  { icon: "⚛️", title: "React 组件", desc: "用 JSX 编写视频内容" },
  { icon: "🎨", title: "Web 技术", desc: "CSS / SVG / Canvas / WebGL" },
  { icon: "⚡", title: "弹簧动画", desc: "物理引擎驱动的自然动效" },
  { icon: "🚀", title: "Lambda 渲染", desc: "AWS 分布式并行极速输出" },
];

export const SceneFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-50, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0a0a2e", "#1a1a4e", "#0a0a2e"]} />
      <Particles />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 50 }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 800,
            color: COLORS.white,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
          }}
        >
          核心特性
        </div>

        <div style={{ display: "flex", gap: 30 }}>
          {features.map((f, i) => {
            const ent = spring({ frame: frame - 15 - i * 10, fps, config: { damping: 15, mass: 0.8 } });
            const dir = i % 2 === 0 ? -1 : 1;
            return (
              <div
                key={f.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  padding: "30px 40px",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.15)",
                  width: 280,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [80, 0])}px) translateX(${interpolate(ent, [0, 1], [60 * dir, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 48 }}>{f.icon}</div>
                <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: COLORS.white }}>
                  {f.title}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 16, color: "rgba(255,255,255,0.65)", textAlign: "center" }}>
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
