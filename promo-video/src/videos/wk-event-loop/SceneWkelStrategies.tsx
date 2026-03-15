import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT_SANS, MONO } from "../../constants";

const DOT_COLORS = ["#DA7756", "#5B8DEF", "#E8A838", "#6DC5A1", "#9B7DD4"];

const SEQ_CODE = `// sequential: shift one item
await this.processItems(
  [this.queue.shift()!]
);`;

const BATCH_CODE = `scheduleBatch(): void {
  if (queue.length >= batchMax) {
    clearTimeout(timer); drain();
    return;
  }
  if (!timer) timer = setTimeout(
    () => drain(), batchWindow);
}`;

const PRIORITY_CODE = `// on push: sort by priority
this.queue.sort(
  (a, b) =>
    (a.event.priority ?? 10)
    - (b.event.priority ?? 10)
);`;

export const SceneWkelStrategies: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  const strategies = [
    {
      label: "Sequential",
      sublabel: "逐个处理",
      delay: 15,
      code: SEQ_CODE,
      highlight: (line: string) =>
        line.includes("shift") ? COLORS.accent : COLORS.text,
      render: () => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[0, 1, 2, 3, 4].map((j) => {
            const active = j === 0;
            return (
              <div
                key={j}
                style={{
                  width: active ? 26 : 20,
                  height: active ? 26 : 20,
                  borderRadius: "50%",
                  backgroundColor: DOT_COLORS[j % DOT_COLORS.length],
                  opacity: active ? 1 : 0.35,
                  boxShadow: active ? `0 0 14px ${COLORS.accent}50` : "none",
                }}
              />
            );
          })}
          <span style={{ fontFamily: MONO, fontSize: 16, color: COLORS.muted, marginLeft: 6 }}>
            one at a time
          </span>
        </div>
      ),
    },
    {
      label: "Batch",
      sublabel: "合并处理",
      delay: 30,
      code: BATCH_CODE,
      highlight: (line: string) =>
        line.includes("setTimeout") ? "#E8A838"
          : line.includes("batchMax") ? COLORS.accent
            : COLORS.text,
      render: () => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              gap: 5,
              padding: "6px 14px",
              borderRadius: 10,
              border: `2px solid ${COLORS.accent}`,
              background: `${COLORS.accent}10`,
            }}
          >
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  backgroundColor: DOT_COLORS[j],
                  opacity: 0.9,
                }}
              />
            ))}
          </div>
          <span style={{ fontFamily: MONO, fontSize: 16, color: COLORS.muted }}>
            window + max
          </span>
        </div>
      ),
    },
    {
      label: "Priority",
      sublabel: "优先级排序",
      delay: 45,
      code: PRIORITY_CODE,
      highlight: (line: string) =>
        line.includes("priority") ? COLORS.accent
          : line.includes("sort") ? "#5B8DEF"
            : COLORS.text,
      render: () => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[1, 5, 10].map((p, j) => (
            <div
              key={j}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: j === 0 ? COLORS.accent : DOT_COLORS[j + 1],
                opacity: j === 0 ? 1 : 0.55,
                boxShadow: j === 0 ? `0 0 10px ${COLORS.accent}40` : "none",
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: COLORS.white }}>
                {p}
              </span>
            </div>
          ))}
          <span style={{ fontFamily: MONO, fontSize: 16, color: COLORS.muted, marginLeft: 4 }}>
            smaller = first
          </span>
        </div>
      ),
    },
  ];

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
            fontFamily: FONT_SANS,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          QueueStrategy
        </div>

        {/* Strategy cards with code */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {strategies.map((s, i) => {
            const prog = spring({
              frame: frame - s.delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "18px 28px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                {/* Label column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 110 }}>
                  <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: COLORS.text }}>
                    {s.label}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 16, color: COLORS.muted }}>
                    {s.sublabel}
                  </div>
                </div>

                {/* Separator */}
                <div style={{ width: 1.5, height: 60, background: COLORS.border }} />

                {/* Code snippet */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 15,
                    lineHeight: 1.5,
                    whiteSpace: "pre",
                    minWidth: 320,
                  }}
                >
                  {s.code.split("\n").map((line, li) => (
                    <div key={li}>
                      <span style={{ color: line.trimStart().startsWith("//") ? COLORS.muted : s.highlight(line) }}>
                        {line}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Separator */}
                <div style={{ width: 1.5, height: 60, background: COLORS.border }} />

                {/* Visual */}
                {s.render()}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
