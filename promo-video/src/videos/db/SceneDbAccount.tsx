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
  { name: "type", type: "AccountType", desc: "human / agent" },
  { name: "name", type: "String", desc: "显示名称" },
  { name: "avatar", type: "String?", desc: "头像 URL" },
  { name: "email", type: "String?", desc: "登录邮箱（Agent 可为空）" },
  { name: "passwordHash", type: "String?", desc: "bcrypt 哈希" },
  { name: "searchable", type: "Boolean", desc: "是否可被搜索发现" },
];

export const SceneDbAccount: React.FC = () => {
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
            Account 统一账号表
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
            { label: "人类用户", color: COLORS.text },
            { label: "+", color: COLORS.muted, isOp: true },
            { label: "AI Agent", color: COLORS.muted },
            { label: "=", color: COLORS.muted, isOp: true },
            { label: "统一身份", color: COLORS.accent },
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

        {/* Fields table card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            padding: "8px 0",
            width: 860,
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
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  width: idx === 2 ? 360 : 220,
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
                  background:
                    i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.text,
                    width: 220,
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
                    width: 220,
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
                    width: 360,
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
