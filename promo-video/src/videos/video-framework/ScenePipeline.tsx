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

const steps = [
  {
    num: "01",
    title: "narration.json",
    desc: "编写旁白文案\n每个场景一句话",
    file: '[{ "id": "intro", "text": "..." }]',
  },
  {
    num: "02",
    title: "npm run tts",
    desc: "生成 MP3 音频\n+ 词级时间戳",
    file: "→ audio.mp3 + timing.json",
  },
  {
    num: "03",
    title: "Scene*.tsx",
    desc: "编写场景组件\nReact + 动画",
    file: "<SceneIntro />, <SceneDemo />",
  },
  {
    num: "04",
    title: "npm run render",
    desc: "一键合成\n输出 MP4",
    file: "→ out/video-name.mp4",
  },
];

export const ScenePipeline: React.FC = () => {
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          四步流水线
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {steps.map((s, i) => {
            const delay = 12 + i * 14;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });

            return (
              <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    padding: "24px 28px",
                    background: COLORS.card,
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    width: 280,
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(ent, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>
                    {s.num}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: COLORS.text }}>
                    {s.title}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted, whiteSpace: "pre-line", lineHeight: 1.5 }}>
                    {s.desc}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      color: COLORS.subtle,
                      background: COLORS.bg,
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: `1px solid ${COLORS.border}`,
                      whiteSpace: "pre",
                    }}
                  >
                    {s.file}
                  </div>
                </div>

                {i < steps.length - 1 && (
                  <div style={{ opacity: interpolate(ent, [0, 1], [0, 1]) }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
