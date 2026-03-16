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

const cases = [
  { company: "GitHub Unwrapped", desc: "用户年度代码回顾\n每人一个独特视频" },
  { company: "Submagic", desc: "AI 短视频工具\n300 万用户" },
  { company: "Crayo.ai", desc: "视频故事生成器\n$6M/年收入" },
  { company: "Typeframes", desc: "SaaS 产品介绍视频\n模板化批量生产" },
];

export const SceneScale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  // Flow diagram
  const flowOp = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
          一个模板，千级输出
        </div>

        {/* Template → Data → Videos flow */}
        <div
          style={{
            opacity: flowOp,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div style={{ padding: "16px 28px", background: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.border}`, boxShadow: COLORS.cardShadow }}>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: COLORS.accent }}>Template.tsx</div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.muted }}>一个 React 组件</div>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
          <div style={{ padding: "16px 28px", background: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.border}`, boxShadow: COLORS.cardShadow }}>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: COLORS.accent }}>data[]</div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.muted }}>千组不同数据</div>
          </div>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
          <div style={{ padding: "16px 28px", background: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.border}`, boxShadow: COLORS.cardShadow }}>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: COLORS.accent }}>1000+ MP4</div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.muted }}>个性化视频</div>
          </div>
        </div>

        {/* Success cases */}
        <div style={{ display: "flex", gap: 22, justifyContent: "center", maxWidth: 1400 }}>
          {cases.map((c, i) => {
            const delay = 35 + i * 10;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={c.company}
                style={{
                  padding: "22px 28px",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  width: 280,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [25, 0])}px)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: COLORS.text }}>
                  {c.company}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted, textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.5 }}>
                  {c.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
