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

const userMessages = [
  { text: "帮我分析一下这段代码的性能问题", time: "14:32" },
  { text: "有没有更好的方案？", time: "14:33" },
];

const agentMessages = [
  {
    text: "这段代码有两个性能瓶颈：\n1. **重复渲染** — 每次state变化都全量re-render\n2. `Array.filter()` 在大数据集上很慢",
    time: "14:32",
  },
  {
    text: "推荐使用 `useMemo` + 虚拟列表：\n```tsx\nconst filtered = useMemo(\n  () => items.filter(pred),\n  [items, pred]\n);\n```",
    time: "14:33",
  },
];

const features = [
  { label: "react-markdown", desc: "Markdown 渲染" },
  { label: "代码高亮", desc: "语法着色块" },
  { label: "表格/列表", desc: "结构化内容" },
];

export const SceneBubble: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const userProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const agentProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const featuresProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingTop: 50,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-16, 0])}px)`,
          }}
        >
          消息气泡
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            两种风格
          </span>
        </div>

        {/* Two-column: user vs agent */}
        <div
          style={{
            display: "flex",
            gap: 32,
            width: "88%",
            maxWidth: 1500,
            flex: 1,
          }}
        >
          {/* Left: User messages */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              opacity: interpolate(userProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(userProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                letterSpacing: 1,
              }}
            >
              用户消息 -- 右对齐深色
            </div>
            {userMessages.map((msg, i) => {
              const msgDelay = 14 + i * 12;
              const msgProg = spring({
                frame: frame - msgDelay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    opacity: interpolate(msgProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(msgProg, [0, 1], [16, 0])}px)`,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <div
                      style={{
                        background: COLORS.accent,
                        color: COLORS.white,
                        borderRadius: 16,
                        padding: "14px 20px",
                        fontFamily: FONT_SANS,
                        fontSize: 18,
                        lineHeight: 1.5,
                        maxWidth: "85%",
                      }}
                    >
                      {msg.text}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 12, color: COLORS.subtle }}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Agent messages */}
          <div
            style={{
              flex: 1.3,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              opacity: interpolate(agentProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(agentProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                letterSpacing: 1,
              }}
            >
              Agent 消息 -- 左对齐卡片式
            </div>
            {agentMessages.map((msg, i) => {
              const msgDelay = 30 + i * 14;
              const msgProg = spring({
                frame: frame - msgDelay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    opacity: interpolate(msgProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(msgProg, [0, 1], [-16, 0])}px)`,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div
                      style={{
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 16,
                        padding: "14px 20px",
                        boxShadow: COLORS.cardShadow,
                        maxWidth: "95%",
                      }}
                    >
                      <pre
                        style={{
                          fontFamily: MONO,
                          fontSize: 15,
                          lineHeight: 1.5,
                          color: COLORS.text,
                          margin: 0,
                          whiteSpace: "pre",
                        }}
                      >
                        {msg.text}
                      </pre>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 12, color: COLORS.subtle }}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature tags */}
        <div
          style={{
            display: "flex",
            gap: 16,
            opacity: interpolate(featuresProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(featuresProg, [0, 1], [12, 0])}px)`,
          }}
        >
          {features.map((f, i) => {
            const tagDelay = 55 + i * 8;
            const tagProg = spring({
              frame: frame - tagDelay,
              fps,
              config: { damping: 14, mass: 0.5 },
            });
            return (
              <div
                key={f.label}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 20,
                  boxShadow: COLORS.cardShadow,
                  padding: "10px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  opacity: interpolate(tagProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(tagProg, [0, 1], [0.8, 1])})`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: COLORS.accent }}>
                  {f.label}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 15, color: COLORS.muted }}>
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
