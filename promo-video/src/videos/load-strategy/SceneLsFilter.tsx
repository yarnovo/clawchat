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

const fileNames = ["AGENTS", "SOUL", "IDENTITY", "USER", "TOOLS", "MEMORY", "HEARTBEAT", "BOOTSTRAP"];

const scenarios = [
  { name: "主会话", loaded: [true, true, true, true, true, true, true, true] },
  { name: "子Agent", loaded: [true, true, true, false, true, false, true, true] },
  { name: "群聊", loaded: [true, true, true, true, true, false, true, true] },
];

export const SceneLsFilter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const tableProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 8,
          }}
        >
          条件过滤
        </div>

        <div
          style={{
            opacity: interpolate(tableProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tableProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* Header row */}
          <div style={{ display: "flex", gap: 0, marginBottom: 4 }}>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.muted,
                width: 120,
                textAlign: "center",
                padding: "12px 8px",
              }}
            />
            {fileNames.map((f) => (
              <div
                key={f}
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  fontWeight: 600,
                  color: COLORS.text,
                  width: 130,
                  textAlign: "center",
                  padding: "12px 4px",
                }}
              >
                {f}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {scenarios.map((s, si) => {
            const rowDelay = 20 + si * 10;
            const rowProg = spring({ frame: frame - rowDelay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  gap: 0,
                  background: si % 2 === 0 ? COLORS.card : "rgba(0,0,0,0.02)",
                  borderRadius: si === 0 ? "12px 12px 0 0" : si === scenarios.length - 1 ? "0 0 12px 12px" : 0,
                  border: `1px solid ${COLORS.border}`,
                  borderBottom: si < scenarios.length - 1 ? "none" : undefined,
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [-20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.accent,
                    width: 120,
                    textAlign: "center",
                    padding: "14px 8px",
                    borderRight: `1px solid ${COLORS.border}`,
                  }}
                >
                  {s.name}
                </div>
                {s.loaded.map((ok, fi) => (
                  <div
                    key={fi}
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      color: ok ? "#4CAF50" : "#E57373",
                      width: 130,
                      textAlign: "center",
                      padding: "14px 4px",
                    }}
                  >
                    {ok ? "\u2713" : "\u2717"}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.accent,
            marginTop: 8,
            padding: "8px 24px",
            borderRadius: 8,
            background: "rgba(218, 119, 86, 0.08)",
            border: `1px solid rgba(218, 119, 86, 0.2)`,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteProg, [0, 1], [16, 0])}px)`,
          }}
        >
          MEMORY 按场景过滤，防止隐私泄露
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
