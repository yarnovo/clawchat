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

const fields = [
  { name: "id", type: "UUID", desc: "主键" },
  { name: "accountId", type: "String", desc: "跨服务共享 ID → im-server", highlight: true },
  { name: "ownerId", type: "String", desc: "创建者（人类用户）" },
  { name: "parentId", type: "String?", desc: "父 Agent → 树形结构" },
  { name: "name", type: "String", desc: "显示名称" },
  { name: "avatar", type: "String?", desc: "头像 URL" },
  { name: "createdAt", type: "DateTime", desc: "创建时间" },
];

export const SceneAgentDbAgent: React.FC = () => {
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
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 60,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            Agent 身份主表
          </div>
        </div>

        {/* Design highlight */}
        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "center",
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          {[
            { label: "身份信息", color: COLORS.text },
            { label: "+", color: COLORS.muted, isOp: true },
            { label: "树形关系", color: COLORS.muted },
            { label: "+", color: COLORS.muted, isOp: true },
            { label: "跨服务桥梁", color: COLORS.accent },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                fontFamily: FONT_SANS,
                fontSize: item.isOp ? 28 : 24,
                fontWeight: 600,
                color: item.color,
              }}
            >
              {item.label}
            </div>
          ))}
        </div>

        {/* Fields table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            padding: "8px 0",
            width: 900,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              padding: "10px 28px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            {["字段", "类型", "说明"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  fontWeight: 600,
                  color: COLORS.muted,
                  letterSpacing: 2,
                  width: idx === 0 ? 200 : idx === 1 ? 180 : 420,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {fields.map((f, i) => {
            const delay = 12 + i * 6;
            const rowProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={f.name}
                style={{
                  display: "flex",
                  padding: "10px 28px",
                  alignItems: "center",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background: f.highlight
                    ? "rgba(218,119,86,0.06)"
                    : i % 2 === 0
                      ? "transparent"
                      : "rgba(0,0,0,0.015)",
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 600,
                    color: f.highlight ? COLORS.accent : COLORS.text,
                    width: 200,
                    flexShrink: 0,
                  }}
                >
                  {f.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    color: COLORS.accent,
                    width: 180,
                    flexShrink: 0,
                  }}
                >
                  {f.type}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.muted,
                    width: 420,
                    flexShrink: 0,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
