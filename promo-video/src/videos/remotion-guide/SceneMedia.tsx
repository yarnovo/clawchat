import {
  AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const mediaTypes = [
  {
    comp: "<Audio />",
    desc: "嵌入音频文件\n支持 volume / startFrom / endAt",
    code: '<Audio\n  src={staticFile("bgm.mp3")}\n  volume={0.8}\n/>',
  },
  {
    comp: "<OffthreadVideo />",
    desc: "高效嵌入视频素材\nFFmpeg C API 提取帧",
    code: '<OffthreadVideo\n  src={staticFile("clip.mp4")}\n  startFrom={30}\n/>',
  },
  {
    comp: "<Img />",
    desc: "嵌入图片\n等待加载完成再渲染",
    code: '<Img\n  src={staticFile("logo.png")}\n  width={200}\n/>',
  },
  {
    comp: "staticFile()",
    desc: "引用 public/ 目录\n本地静态资源",
    code: 'staticFile("audio/intro.mp3")\n// → /public/audio/intro.mp3',
  },
];

export const SceneMedia: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 36, paddingBottom: 140 }}>
        <div style={{
          fontFamily: FONT, fontSize: 56, fontWeight: 700, color: COLORS.text,
          opacity: interpolate(titleProg, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
        }}>
          媒体组件
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 22, justifyContent: "center", maxWidth: 1400 }}>
          {mediaTypes.map((m, i) => {
            const delay = 15 + i * 10;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div key={m.comp} style={{
                width: 620, padding: "22px 28px",
                background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, boxShadow: COLORS.cardShadow,
                opacity: interpolate(ent, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(ent, [0, 1], [25, 0])}px)`,
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: COLORS.accent }}>{m.comp}</div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted, whiteSpace: "pre-line", lineHeight: 1.5 }}>{m.desc}</div>
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 20, color: COLORS.text, whiteSpace: "pre",
                  background: COLORS.bg, padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                }}>{m.code}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
