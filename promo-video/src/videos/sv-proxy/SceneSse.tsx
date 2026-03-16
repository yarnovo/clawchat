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

const sseCode = `app.get('/:agentId/events', async (c) => {
  return streamSSE(c, async (stream) => {
    const upstream = await fetch(
      \`\${agent.channelUrl}/api/events\`
    );
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // 逐行解析 SSE，转发给前端
      await stream.writeSSE({ data: line });
    }
  });
});`;

export const SceneSse: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  const codeEnt = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  const noteEnt = spring({
    frame: frame - 55,
    fps,
    config: { damping: 14, mass: 0.7 },
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
          SSE 代理 — 流式转发
        </div>

        {/* Code block */}
        <div
          style={{
            opacity: interpolate(codeEnt, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeEnt, [0, 1], [30, 0])}px)`,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            padding: "24px 32px",
            maxWidth: 900,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 18,
              color: COLORS.muted,
              marginBottom: 14,
            }}
          >
            proxy.ts — SSE 端点代理
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 19,
              color: COLORS.text,
              whiteSpace: "pre",
              lineHeight: 1.55,
            }}
          >
            {sseCode}
          </div>
        </div>

        {/* Key concepts */}
        <div
          style={{
            display: "flex",
            gap: 20,
            opacity: interpolate(noteEnt, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteEnt, [0, 1], [20, 0])}px)`,
          }}
        >
          {[
            { label: "streamSSE", desc: "Hono 内置流式响应" },
            { label: "ReadableStream", desc: "Web 标准流 API" },
            { label: "逐块转发", desc: "全程流式，不缓冲" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "12px 24px",
                background: COLORS.card,
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 22,
                  fontWeight: 700,
                  color: COLORS.accent,
                  whiteSpace: "pre",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 20,
                  color: COLORS.muted,
                }}
              >
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
