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

const PROVIDER_CODE = `interface LLMProvider {
  chat(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): Promise<LLMResponse>;

  stream?(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<LLMStreamEvent>;
}`;

const MESSAGE_CODE = `interface ChatMessage {
  role: 'system' | 'user'
      | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}`;

const TOOLCALL_CODE = `interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON
}`;

const TOOLDEF_CODE = `interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}`;

export const SceneLlm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const providerProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const msgProg = spring({ frame: frame - 32, fps, config: { damping: 14 } });
  const toolProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 68, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 20,
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
          llm.ts
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            44 lines
          </span>
        </div>

        {/* Top: LLMProvider (full width) */}
        <div
          style={{
            width: "88%",
            maxWidth: 1500,
            opacity: interpolate(providerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(providerProg, [0, 1], [16, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 18,
              fontWeight: 600,
              color: COLORS.accent,
              marginBottom: 6,
              letterSpacing: 1,
            }}
          >
            LLMProvider -- 模型无关接口
          </div>
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              boxShadow: COLORS.cardShadow,
              padding: "18px 24px",
            }}
          >
            <pre
              style={{
                fontFamily: MONO,
                fontSize: 18,
                lineHeight: 1.5,
                color: COLORS.text,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {PROVIDER_CODE}
            </pre>
          </div>
        </div>

        {/* Bottom: Three types side by side */}
        <div
          style={{
            display: "flex",
            gap: 20,
            width: "88%",
            maxWidth: 1500,
          }}
        >
          {/* ChatMessage */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(msgProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(msgProg, [0, 1], [16, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 6,
              }}
            >
              ChatMessage -- 4 种角色
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "16px 20px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {MESSAGE_CODE}
              </pre>
            </div>
          </div>

          {/* ToolCall */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(toolProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(toolProg, [0, 1], [16, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 6,
              }}
            >
              ToolCall -- 工具调用
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "16px 20px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {TOOLCALL_CODE}
              </pre>
            </div>
          </div>

          {/* ToolDefinition */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(toolProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(toolProg, [0, 1], [16, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 6,
              }}
            >
              ToolDefinition -- 工具描述
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "16px 20px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {TOOLDEF_CODE}
              </pre>
            </div>
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 22,
            color: COLORS.muted,
            letterSpacing: 1,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteProg, [0, 1], [10, 0])}px)`,
          }}
        >
          OpenAI 兼容格式 &mdash; 任何模型都能实现
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
