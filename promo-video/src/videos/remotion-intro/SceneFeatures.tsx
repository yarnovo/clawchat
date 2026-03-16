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

const features = [
  {
    title: "Composition",
    desc: "一个项目管理多个视频\n注册组件 + 元数据",
    code: '<Composition id="Demo"\n  component={MyVideo}\n  fps={30} width={1920} />',
  },
  {
    title: "Remotion Studio",
    desc: "实时预览 + 可视化编辑\nGUI 调整 props",
    code: "npm run dev\n→ http://localhost:3000",
  },
  {
    title: "Lambda 渲染",
    desc: "AWS 分布式并行渲染\n分片拼接自动完成",
    code: "renderMediaOnLambda({\n  composition: 'Demo'\n})",
  },
  {
    title: "Remotion Player",
    desc: "嵌入 Web 应用\n交互式视频播放",
    code: "<Player component={MyVideo}\n  compositionWidth={1920} />",
  },
];

export const SceneFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          四大核心能力
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 22, justifyContent: "center", maxWidth: 1400 }}>
          {features.map((f, i) => {
            const delay = 15 + i * 10;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={f.title}
                style={{
                  width: 620,
                  padding: "22px 28px",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [30, 0])}px)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
                  <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: COLORS.accent }}>
                    {f.title}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted, whiteSpace: "pre-line", lineHeight: 1.5 }}>
                    {f.desc}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    color: COLORS.text,
                    background: COLORS.bg,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    whiteSpace: "pre",
                  }}
                >
                  {f.code}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
