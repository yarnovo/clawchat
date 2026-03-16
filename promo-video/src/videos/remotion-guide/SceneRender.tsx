import {
  AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const methods = [
  {
    title: "CLI 本地渲染",
    desc: "开发机直接渲染\n最简单的方式",
    cmd: "npx remotion render MyVideo out.mp4",
    features: ["零配置", "支持所有格式", "进度条实时显示"],
  },
  {
    title: "Remotion Studio",
    desc: "可视化渲染\n点击按钮即可导出",
    cmd: "npm run dev → 点击 Render 按钮",
    features: ["GUI 操作", "渲染队列", "错误堆栈"],
  },
  {
    title: "Lambda 云渲染",
    desc: "AWS 分布式并行\n适合批量生产",
    cmd: "renderMediaOnLambda({ ... })",
    features: ["并行分片", "20 区域", "按次计费"],
  },
];

export const SceneRender: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 40, paddingBottom: 140 }}>
        <div style={{
          fontFamily: FONT, fontSize: 56, fontWeight: 700, color: COLORS.text,
          opacity: interpolate(titleProg, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
        }}>
          三种渲染方式
        </div>

        <div style={{ display: "flex", gap: 28, justifyContent: "center", maxWidth: 1400 }}>
          {methods.map((m, i) => {
            const delay = 15 + i * 12;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div key={m.title} style={{
                width: 380, padding: "28px 28px",
                background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, boxShadow: COLORS.cardShadow,
                opacity: interpolate(ent, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(ent, [0, 1], [30, 0])}px)`,
                display: "flex", flexDirection: "column", gap: 14,
              }}>
                <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: COLORS.accent }}>{m.title}</div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, whiteSpace: "pre-line", lineHeight: 1.5 }}>{m.desc}</div>
                <div style={{
                  fontFamily: MONO, fontSize: 18, color: COLORS.text, whiteSpace: "pre",
                  background: COLORS.bg, padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                }}>{m.cmd}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {m.features.map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.accent }} />
                      <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.text }}>{f}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
