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

const headers = ["", "Hono", "Express", "Fastify", "Next.js"];
const rows = [
  { label: "体积", values: ["14 KB", "208 KB", "2 MB", "130+ MB"] },
  { label: "类型安全", values: ["原生", "需 @types", "部分", "内置"] },
  { label: "边缘运行时", values: ["全支持", "不支持", "不支持", "部分"] },
  { label: "多运行时", values: ["6+", "仅 Node", "仅 Node", "仅 Node"] },
  { label: "性能 req/s", values: ["150k", "15k", "78k", "12k"] },
];

// Check mark or cross rendering
const renderCell = (value: string, isHono: boolean) => {
  const isPositive = ["全支持", "原生", "6+", "150k", "14 KB"].includes(value);
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 26,
        fontWeight: isHono ? 700 : 400,
        color: isHono ? COLORS.accent : isPositive ? COLORS.text : COLORS.muted,
      }}
    >
      {value}
    </div>
  );
};

export const SceneCompare: React.FC = () => {
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
          gap: 36,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          框架横向对比
        </div>

        {/* Comparison table */}
        <div
          style={{
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
          }}
        >
          {/* Header row */}
          {(() => {
            const headerEnt = spring({
              frame: frame - 8,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                style={{
                  display: "flex",
                  borderBottom: `2px solid ${COLORS.border}`,
                  opacity: interpolate(headerEnt, [0, 1], [0, 1]),
                }}
              >
                {headers.map((h, hi) => (
                  <div
                    key={h}
                    style={{
                      width: hi === 0 ? 160 : 210,
                      padding: "18px 24px",
                      fontFamily: hi === 0 ? FONT_SANS : MONO,
                      fontSize: 28,
                      fontWeight: 700,
                      color: hi === 1 ? COLORS.accent : COLORS.text,
                      borderRight: hi < headers.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Data rows */}
          {rows.map((row, ri) => {
            const delay = 15 + ri * 8;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  borderBottom: ri < rows.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [10, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 160,
                    padding: "16px 24px",
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.text,
                    borderRight: `1px solid ${COLORS.border}`,
                  }}
                >
                  {row.label}
                </div>
                {row.values.map((v, vi) => (
                  <div
                    key={vi}
                    style={{
                      width: 210,
                      padding: "16px 24px",
                      borderRight: vi < row.values.length - 1 ? `1px solid ${COLORS.border}` : "none",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {renderCell(v, vi === 0)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
