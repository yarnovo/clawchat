import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { Subtitle } from "../../Subtitle";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

import wkpllmOverviewWords from "./words/wkpllm-overview-words.json";
import wkpllmConstructorWords from "./words/wkpllm-constructor-words.json";
import wkpllmChatWords from "./words/wkpllm-chat-words.json";

import timingData from "./timing.json";

const SCENE_WORDS = [wkpllmOverviewWords, wkpllmConstructorWords, wkpllmChatWords];

/* ── constants ── */
const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

/* ════════════════════════════════════════════════════════════
   Scene 1 — Overview
   ════════════════════════════════════════════════════════════ */

const INTERFACE_CODE = `export class OpenAIProvider
  implements LLMProvider {

  private client: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;
}`;

const ENDPOINTS = [
  { name: "OpenAI", url: "api.openai.com/v1" },
  { name: "百炼 (Qwen)", url: "dashscope.aliyuncs.com/..." },
  { name: "DeepSeek", url: "api.deepseek.com" },
  { name: "OpenRouter", url: "openrouter.ai/api/v1" },
];

const SceneOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 28, fps, config: { damping: 14 } });
  const epProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            transform: `scale(${titleProg})`,
            whiteSpace: "pre",
          }}
        >
          @agentkit/provider-llm-openai
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [16, 0])}px)`,
          }}
        >
          implements LLMProvider &middot; 1 file &middot; 83 lines &middot; dep: openai
        </div>

        {/* Code card */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: "32px 40px",
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [24, 0])}px)`,
          }}
        >
          <pre
            style={{
              fontFamily: MONO,
              fontSize: 24,
              fontWeight: 500,
              color: COLORS.text,
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: "pre",
            }}
          >
            {INTERFACE_CODE}
          </pre>
        </div>

        {/* Endpoint tags */}
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
            opacity: interpolate(epProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(epProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {ENDPOINTS.map((ep, i) => {
            const tagProg = spring({
              frame: frame - 60 - i * 8,
              fps,
              config: { damping: 14, mass: 0.5 },
            });
            return (
              <div
                key={ep.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "10px 24px",
                  borderRadius: 20,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(tagProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(tagProg, [0, 1], [0.8, 1])})`,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    fontWeight: 700,
                    color: COLORS.accent,
                    whiteSpace: "pre",
                  }}
                >
                  {ep.name}
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 14,
                    color: COLORS.subtle,
                    whiteSpace: "pre",
                  }}
                >
                  {ep.url}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   Scene 2 — Constructor
   ════════════════════════════════════════════════════════════ */

const CONSTRUCTOR_CODE = `constructor(options: OpenAIProviderOptions) {
  this.client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseURL,
  });
  this.model = options.model || 'gpt-4o';
  this.maxTokens = options.maxTokens || 4096;
  this.temperature = options.temperature ?? 0.7;
}`;

const OPTIONS = [
  { key: "apiKey", type: "string", desc: "API 密钥" },
  { key: "baseURL", type: "string?", desc: "端点地址" },
  { key: "model", type: "string?", desc: "默认 gpt-4o" },
  { key: "maxTokens", type: "number?", desc: "默认 4096" },
  { key: "temperature", type: "number?", desc: "默认 0.7" },
];

const SceneConstructor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const codeProg = spring({ frame: frame - 16, fps, config: { damping: 14 } });
  const optProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [24, 0])}px)`,
          }}
        >
          Constructor
        </div>

        {/* Code card */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: "32px 48px",
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [30, 0])}px)`,
          }}
        >
          <pre
            style={{
              fontFamily: MONO,
              fontSize: 22,
              fontWeight: 500,
              color: COLORS.text,
              lineHeight: 1.65,
              margin: 0,
              whiteSpace: "pre",
            }}
          >
            {CONSTRUCTOR_CODE}
          </pre>
        </div>

        {/* Option pills */}
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 1100,
            opacity: interpolate(optProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(optProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {OPTIONS.map((o, i) => {
            const pill = spring({
              frame: frame - 40 - i * 6,
              fps,
              config: { damping: 14, mass: 0.5 },
            });
            return (
              <div
                key={o.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 20px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(pill, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(pill, [0, 1], [0.85, 1])})`,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    fontWeight: 700,
                    color: COLORS.accent,
                    whiteSpace: "pre",
                  }}
                >
                  {o.key}
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 16,
                    color: COLORS.subtle,
                    whiteSpace: "pre",
                  }}
                >
                  {o.type}
                </span>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 16,
                    color: COLORS.muted,
                  }}
                >
                  {o.desc}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   Scene 3 — chat() + toOpenAIMessage()
   ════════════════════════════════════════════════════════════ */

const CHAT_CODE = `async chat(messages, tools?) {
  const response = await this.client
    .chat.completions.create({
      model: this.model,
      messages: messages.map(
        m => this.toOpenAIMessage(m)
      ),
      tools: tools?.length ? tools : undefined,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    });

  const choice = response.choices[0];
  // extract tool_calls ...
  return { content, tool_calls, finish_reason };
}`;

const CONVERT_CODE = `toOpenAIMessage(msg: ChatMessage) {
  const base = { role: msg.role, content: msg.content };

  if (msg.role === 'tool')
    base.tool_call_id = msg.tool_call_id;

  if (msg.role === 'assistant' && msg.tool_calls)
    base.tool_calls = msg.tool_calls.map(tc => ({
      id: tc.id, type: 'function',
      function: { name: tc.name, arguments: tc.arguments },
    }));

  return base;
}`;

const SceneChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const chatProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const convertProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });
  const highlightProg = spring({ frame: frame - 80, fps, config: { damping: 10, mass: 0.6 } });

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
            fontFamily: MONO,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [24, 0])}px)`,
            whiteSpace: "pre",
          }}
        >
          chat() + toOpenAIMessage()
        </div>

        {/* Two code cards side by side */}
        <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
          {/* chat() card */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: "28px 36px",
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(chatProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(chatProg, [0, 1], [-30, 0])}px)`,
              position: "relative",
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.accent,
                marginBottom: 12,
                whiteSpace: "pre",
              }}
            >
              chat()
            </div>
            <pre
              style={{
                fontFamily: MONO,
                fontSize: 18,
                fontWeight: 500,
                color: COLORS.text,
                lineHeight: 1.55,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {CHAT_CODE}
            </pre>
            {/* Highlight glow on completions.create */}
            <div
              style={{
                position: "absolute",
                top: 80,
                left: 28,
                right: 28,
                height: 96,
                borderRadius: 8,
                background: `rgba(218,119,86,${interpolate(highlightProg, [0, 1], [0, 0.08])})`,
                pointerEvents: "none",
              }}
            />
          </div>

          {/* toOpenAIMessage() card */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: "28px 36px",
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(convertProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(convertProg, [0, 1], [30, 0])}px)`,
              position: "relative",
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.accent,
                marginBottom: 12,
                whiteSpace: "pre",
              }}
            >
              toOpenAIMessage()
            </div>
            <pre
              style={{
                fontFamily: MONO,
                fontSize: 18,
                fontWeight: 500,
                color: COLORS.text,
                lineHeight: 1.55,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {CONVERT_CODE}
            </pre>
            {/* Highlight glow on role mapping */}
            <div
              style={{
                position: "absolute",
                top: 100,
                left: 28,
                right: 28,
                height: 72,
                borderRadius: 8,
                background: `rgba(218,119,86,${interpolate(highlightProg, [0, 1], [0, 0.08])})`,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        {/* Flow arrow summary */}
        {(() => {
          const flowProg = spring({
            frame: frame - 90,
            fps,
            config: { damping: 12, mass: 0.6 },
          });
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: interpolate(flowProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(flowProg, [0, 1], [12, 0])}px)`,
              }}
            >
              {["ChatMessage[]", "toOpenAIMessage()", "completions.create()", "LLMResponse"].map(
                (label, i) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {i > 0 && (
                      <span
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 28,
                          color: COLORS.subtle,
                        }}
                      >
                        {"\u2192"}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 20,
                        fontWeight: i === 1 || i === 2 ? 700 : 500,
                        color: i === 1 || i === 2 ? COLORS.accent : COLORS.text,
                        padding: "6px 16px",
                        borderRadius: 10,
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: COLORS.cardShadow,
                        whiteSpace: "pre",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                ),
              )}
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════
   Main composition
   ════════════════════════════════════════════════════════════ */

const SCENE_COMPS = [SceneOverview, SceneConstructor, SceneChat];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  let endFrame: number;
  if (isLast) {
    endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD;
  } else {
    const nextStart = Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
    endFrame = nextStart;
  }
  return {
    from: startFrame,
    dur: endFrame - startFrame,
    words: SCENE_WORDS[i],
    Comp: SCENE_COMPS[i],
    startMs: t.startMs,
  };
});

export const WK_PROVIDER_LLM_FRAMES = scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({
  children,
  dur,
  isLast,
}) => {
  const frame = useCurrentFrame();
  const opacity = isLast
    ? 1
    : interpolate(frame, [dur - FADE, dur], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const WkProviderLlm: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Audio src={staticFile("audio/wk-provider-llm/wk-provider-llm.mp3")} volume={0.9} />
      {scenes.map((s, i) => {
        const isLast = i === scenes.length - 1;
        const seqDur = isLast ? s.dur : s.dur + FADE;
        const sceneStartMs = (s.from / FPS) * 1000;
        return (
          <Sequence key={i} from={s.from} durationInFrames={seqDur}>
            <Scene dur={seqDur} isLast={isLast}>
              <s.Comp />
              <AbsoluteFill style={{ zIndex: 100 }}>
                <Subtitle words={s.words as any} offsetMs={sceneStartMs} />
              </AbsoluteFill>
            </Scene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
