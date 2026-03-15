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

const toolFields = [
  { field: "name", type: "string" },
  { field: "description", type: "string" },
  { field: "parameters", type: "JSONSchema" },
  { field: "execute", type: "(args) => Promise" },
];

const sessionItems = [
  { label: "ChatSession", desc: "接口", highlight: true },
  { label: "InMemorySession", desc: "测试用" },
  { label: "SQLiteSession", desc: "生产 / Drizzle ORM" },
];

export const SceneAcwTools: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const sessionProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });
  const schemaProg = spring({ frame: frame - 75, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 90, fps, config: { damping: 14 } });

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
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            letterSpacing: 2,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
          }}
        >
          types.ts + session.ts + schema.ts
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 42,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 8,
          }}
        >
          Tool + ChatSession + Schema
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          {/* Tool interface card */}
          <div
            style={{
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              borderRadius: 16,
              boxShadow: COLORS.cardShadow,
              padding: "28px 40px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.accent,
                marginBottom: 12,
              }}
            >
              Tool interface
            </div>
            {toolFields.map((tf, i) => {
              const delay = 18 + i * 8;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
              return (
                <div
                  key={tf.field}
                  style={{
                    display: "flex",
                    gap: 16,
                    alignItems: "baseline",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [-16, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 600,
                      color: COLORS.text,
                      minWidth: 180,
                    }}
                  >
                    {tf.field}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      color: COLORS.muted,
                    }}
                  >
                    {tf.type}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Session card */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              boxShadow: COLORS.cardShadow,
              padding: "28px 36px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minWidth: 300,
              opacity: interpolate(sessionProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(sessionProg, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
                marginBottom: 4,
              }}
            >
              session.ts
            </div>
            {sessionItems.map((item, i) => {
              const delay = 60 + i * 8;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
              return (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "baseline",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [-12, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 25,
                      fontWeight: 600,
                      color: item.highlight ? COLORS.accent : COLORS.text,
                    }}
                  >
                    {item.label}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                    {item.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Schema card */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              boxShadow: COLORS.cardShadow,
              padding: "28px 36px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              minWidth: 240,
              opacity: interpolate(schemaProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(schemaProg, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              schema.ts
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 24,
                color: COLORS.muted,
                background: `rgba(218, 119, 86, 0.06)`,
                padding: "10px 18px",
                borderRadius: 10,
              }}
            >
              Drizzle ORM
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                color: COLORS.muted,
              }}
            >
              类型安全表定义
            </div>
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            marginTop: 8,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [16, 0])}px)`,
          }}
        >
          七个文件，职责清晰，没有一行多余代码
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
