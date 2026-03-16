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
  { num: "1", label: "前端 POST /api/proxy/:agentId/chat", detail: "用户发送消息" },
  { num: "2", label: "Server 查 DB → agent.channelUrl", detail: "鉴权 + 找到目标容器" },
  { num: "3", label: "fetch(channelUrl + '/api/chat')", detail: "转发请求到 Agent 容器" },
  { num: "4", label: "Agent → LLM 生成回复", detail: "容器调用大模型" },
  { num: "5", label: "SSE stream → Server → 前端", detail: "流式推送回前端" },
  { num: "6", label: "stream.writeSSE({ data })", detail: "逐块写入，实时显示" },
];

export const SceneFlow: React.FC = () => {
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
          gap: 28,
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
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          完整消息流程
        </div>

        {/* Step cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 1000,
            width: "100%",
          }}
        >
          {steps.map((step, i) => {
            const delay = 12 + i * 9;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={step.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "14px 28px",
                  background: COLORS.card,
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-30, 0])}px)`,
                }}
              >
                {/* Step number */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.accent,
                    minWidth: 40,
                    textAlign: "center",
                    whiteSpace: "pre",
                  }}
                >
                  {step.num}
                </div>

                {/* Code label */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: COLORS.text,
                    fontWeight: 600,
                    flex: 1,
                    whiteSpace: "pre",
                  }}
                >
                  {step.label}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                    minWidth: 180,
                    textAlign: "right",
                  }}
                >
                  {step.detail}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
