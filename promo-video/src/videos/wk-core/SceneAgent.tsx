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

const BASH_TOOL_CODE = `const BASH_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'bash',
    description: 'Execute a shell command',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string' }
      },
      required: ['command'],
    },
  },
};`;

const WHILE_LOOP_CODE = `async run(userMessage: string): Promise<string> {
  while (round < this.maxRounds) {
    round++;
    const response = await this.llm.chat(
      messages, [BASH_TOOL]
    );

    if (response.tool_calls.length === 0) {
      return response.content;   // ← 完成
    }

    // 执行 bash → 把结果喂回 LLM
    for (const call of response.tool_calls) {
      execSync(call.arguments.command);
    }
  }
}`;

const hooks = [
  {
    name: "onBeforeBash",
    sig: "(cmd) => { allowed, reason? }",
    desc: "执行前拦截，可阻止危险命令",
  },
  {
    name: "onAfterBash",
    sig: "(cmd, output, isError) => void",
    desc: "执行后通知，用于日志/监控",
  },
  {
    name: "onText",
    sig: "(text) => void",
    desc: "LLM 回复文本时回调",
  },
];

export const SceneAgent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const bashToolProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const whileLoopProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const hooksProg = spring({ frame: frame - 70, fps, config: { damping: 14 } });

  // Highlight pulse for key lines
  const pulseOpacity = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.15, 0.35, 0.15],
    { extrapolateRight: "clamp" }
  );

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
          agent.ts
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            124 lines
          </span>
        </div>

        {/* Two-column layout */}
        <div
          style={{
            display: "flex",
            gap: 28,
            width: "90%",
            maxWidth: 1600,
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          {/* Left: BASH_TOOL const */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(bashToolProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(bashToolProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              BASH_TOOL -- 内置唯一工具
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "20px 24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Highlight on "name: 'bash'" line */}
              <div
                style={{
                  position: "absolute",
                  top: 60,
                  left: 0,
                  right: 0,
                  height: 24,
                  background: COLORS.accent,
                  opacity: pulseOpacity,
                  borderRadius: 4,
                }}
              />
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                  position: "relative",
                }}
              >
                {BASH_TOOL_CODE}
              </pre>
            </div>
          </div>

          {/* Right: while loop + hooks */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* While loop */}
            <div
              style={{
                opacity: interpolate(whileLoopProg, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(whileLoopProg, [0, 1], [20, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.accent,
                  marginBottom: 8,
                  letterSpacing: 1,
                }}
              >
                while 循环 -- Think + Act
              </div>
              <div
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  boxShadow: COLORS.cardShadow,
                  padding: "20px 24px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Highlight on "while" line */}
                <div
                  style={{
                    position: "absolute",
                    top: 24,
                    left: 0,
                    right: 0,
                    height: 24,
                    background: COLORS.accent,
                    opacity: pulseOpacity,
                    borderRadius: 4,
                  }}
                />
                <pre
                  style={{
                    fontFamily: MONO,
                    fontSize: 15,
                    lineHeight: 1.45,
                    color: COLORS.text,
                    margin: 0,
                    whiteSpace: "pre",
                    position: "relative",
                  }}
                >
                  {WHILE_LOOP_CODE}
                </pre>
              </div>
            </div>

            {/* Hooks */}
            <div
              style={{
                opacity: interpolate(hooksProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(hooksProg, [0, 1], [16, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.accent,
                  marginBottom: 8,
                  letterSpacing: 1,
                }}
              >
                Hooks -- 拦截与监控
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {hooks.map((h, i) => {
                  const hDelay = 70 + i * 8;
                  const hProg = spring({
                    frame: frame - hDelay,
                    fps,
                    config: { damping: 14, mass: 0.6 },
                  });
                  return (
                    <div
                      key={h.name}
                      style={{
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 10,
                        boxShadow: COLORS.cardShadow,
                        padding: "12px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        opacity: interpolate(hProg, [0, 1], [0, 1]),
                        transform: `translateX(${interpolate(hProg, [0, 1], [12, 0])}px)`,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 17,
                          fontWeight: 700,
                          color: COLORS.text,
                          minWidth: 140,
                        }}
                      >
                        {h.name}
                      </div>
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 14,
                          color: COLORS.subtle,
                        }}
                      >
                        {h.sig}
                      </div>
                      <div
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 14,
                          color: COLORS.muted,
                          marginLeft: "auto",
                        }}
                      >
                        {h.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
