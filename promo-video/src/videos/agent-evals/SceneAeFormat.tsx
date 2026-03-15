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

const treeLinesData = [
  { text: "agents/", indent: 0, highlight: false },
  { text: "  travel-agent/", indent: 0, highlight: false },
  { text: "    evals/", indent: 0, highlight: true },
  { text: "      cases.jsonl", indent: 0, highlight: true },
  { text: "    CLAUDE.md", indent: 0, highlight: false },
  { text: "    skills/", indent: 0, highlight: false },
];

const jsonlLines = [
  '{"input": "帮我订明天北京飞上海的机票",',
  ' "expected_tools": ["search_flights", "book_ticket"],',
  ' "must_include": ["航班", "确认"],',
  ' "must_not_include": ["酒店"],',
  ' "trajectory": ["search_flights", "book_ticket"]}',
];

export const SceneAeFormat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const treeProg = spring({ frame: frame - 10, fps, config: { damping: 14, mass: 0.7 } });
  const codeProg = spring({ frame: frame - 30, fps, config: { damping: 14, mass: 0.7 } });
  const badgeProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

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
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          Eval 工作区结构
        </div>

        <div style={{ display: "flex", gap: 48, alignItems: "flex-start" }}>
          {/* Directory tree */}
          <div
            style={{
              background: COLORS.card,
              border: `2px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: "28px 36px",
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 340,
              opacity: interpolate(treeProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(treeProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            {treeLinesData.map((line, i) => {
              const lineDelay = 14 + i * 6;
              const lineProg = spring({ frame: frame - lineDelay, fps, config: { damping: 14, mass: 0.4 } });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: line.highlight ? COLORS.accent : COLORS.text,
                    fontWeight: line.highlight ? 700 : 400,
                    opacity: interpolate(lineProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(lineProg, [0, 1], [-8, 0])}px)`,
                    minHeight: 34,
                    whiteSpace: "pre",
                  }}
                >
                  {line.text}
                </div>
              );
            })}
          </div>

          {/* JSONL code block */}
          <div
            style={{
              background: "#1E1E1E",
              borderRadius: 16,
              padding: "28px 36px",
              boxShadow: "0 4px 30px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 680,
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(codeProg, [0, 1], [0.95, 1])})`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 24,
                color: COLORS.muted,
                marginBottom: 8,
              }}
            >
              cases.jsonl
            </div>
            {jsonlLines.map((line, i) => {
              const lineDelay = 34 + i * 5;
              const lineProg = spring({ frame: frame - lineDelay, fps, config: { damping: 14, mass: 0.4 } });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: "#D4D4D4",
                    opacity: interpolate(lineProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(lineProg, [0, 1], [-10, 0])}px)`,
                    minHeight: 32,
                    whiteSpace: "pre",
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            padding: "10px 24px",
            borderRadius: 8,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(badgeProg, [0, 1], [16, 0])}px)`,
          }}
        >
          JSONL 格式 · 与 OpenAI 对齐
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
