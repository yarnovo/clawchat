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

const tokenFields = [
  { key: "accountId", type: "string", desc: "用户/Agent 唯一标识" },
  { key: "type", type: "string", desc: '"user" | "agent"' },
  { key: "name", type: "string", desc: "显示名称" },
];

const codeLines = [
  'const payload = c.get("jwtPayload");',
  "if (!payload?.accountId) {",
  '  return c.json({ error: "Invalid token" }, 401);',
  "}",
  "",
  'c.set("userId", payload.accountId);',
  'c.set("userType", payload.type);',
  'c.set("userName", payload.name);',
];

export const SceneSvauFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Token 结构与验证
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          {/* Left: Token fields */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {/* Header */}
            {(() => {
              const prog = spring({
                frame: frame - 8,
                fps,
                config: { damping: 14 },
              });
              return (
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.accent,
                    marginBottom: 12,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                  }}
                >
                  JwtPayload
                </div>
              );
            })()}

            {tokenFields.map((f, i) => {
              const prog = spring({
                frame: frame - 14 - i * 8,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={f.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "12px 20px",
                    borderRadius: 10,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 600,
                      color: COLORS.text,
                      width: 140,
                      whiteSpace: "pre",
                    }}
                  >
                    {f.key}
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      color: COLORS.subtle,
                      width: 80,
                      whiteSpace: "pre",
                    }}
                  >
                    {f.type}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 22,
                      color: COLORS.muted,
                    }}
                  >
                    {f.desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right: Code */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {(() => {
              const prog = spring({
                frame: frame - 10,
                fps,
                config: { damping: 14 },
              });
              return (
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.muted,
                    marginBottom: 12,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                  }}
                >
                  验证 + 注入
                </div>
              );
            })()}

            <div
              style={{
                background: "rgba(0,0,0,0.03)",
                borderRadius: 12,
                padding: "20px 24px",
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {codeLines.map((line, i) => {
                const prog = spring({
                  frame: frame - 16 - i * 3,
                  fps,
                  config: { damping: 16, mass: 0.5 },
                });

                const isError = line.includes("401") || line.includes("Invalid");
                const isSet = line.includes("c.set");

                let color = COLORS.text;
                if (isError) color = COLORS.accent;
                if (isSet) color = COLORS.accent;

                return (
                  <div
                    key={i}
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      lineHeight: 1.7,
                      color,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(prog, [0, 1], [15, 0])}px)`,
                      whiteSpace: "pre",
                      minHeight: line === "" ? 12 : undefined,
                    }}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
