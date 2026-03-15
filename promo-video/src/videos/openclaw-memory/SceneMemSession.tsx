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

const jsonlLines = [
  '{"role":"user","content":"帮我写一个排序算法","ts":1710000}',
  '{"role":"assistant","content":"好的，这是快速排序...","ts":1710001}',
  '{"role":"user","content":"再优化一下时间复杂度","ts":1710002}',
  '{"role":"assistant","content":"可以用三路划分...","ts":1710003}',
];

const features = [
  { label: "格式", value: "JSONL（每行一条消息）" },
  { label: "写入", value: "流式追加，不覆盖" },
  { label: "内容", value: "角色 + 内容 + 时间戳" },
  { label: "路径", value: ".openclaw/agents/sessions/*.jsonl" },
];

export const SceneMemSession: React.FC = () => {
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
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 48 }}>📝</div>
          <div style={{ fontFamily: FONT, fontSize: 48, fontWeight: 700, color: COLORS.text }}>
            第一层：会话记忆
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "24px 32px",
            borderRadius: 12,
            background: "#1A1A1A",
            border: `1px solid ${COLORS.border}`,
            width: 1000,
          }}
        >
          {jsonlLines.map((line, i) => {
            const delay = 12 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 18,
                  color: "#A8D8A8",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 1000 }}>
          {features.map((f, i) => {
            const delay = 40 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={f.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 20px",
                  borderRadius: 8,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}
              >
                <div style={{ fontFamily: FONT_SANS, fontSize: 20, fontWeight: 700, color: COLORS.accent }}>
                  {f.label}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.muted }}>
                  {f.value}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
