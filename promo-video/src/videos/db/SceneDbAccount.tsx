import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { FONT, MONO } from "../../constants";

const fields = [
  { name: "id", type: "UUID", desc: "主键", icon: "🔑" },
  { name: "type", type: "AccountType", desc: "human / agent", icon: "🏷️" },
  { name: "name", type: "String", desc: "显示名称", icon: "👤" },
  { name: "avatar", type: "String?", desc: "头像 URL", icon: "🖼️" },
  { name: "email", type: "String?", desc: "登录邮箱（Agent 可为空）", icon: "📧" },
  { name: "passwordHash", type: "String?", desc: "bcrypt 哈希", icon: "🔒" },
  { name: "searchable", type: "Boolean", desc: "是否可被搜索发现", icon: "🔍" },
];

export const SceneDbAccount: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0c0a2e", "#1a1040", "#0c0a2e"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
          paddingBottom: 120,
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
          <span style={{ fontSize: 48 }}>👥</span>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 800,
              background: "linear-gradient(135deg, #fff 30%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
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
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          {[
            { label: "人类用户", emoji: "🧑", color: "#60a5fa" },
            { label: "+", emoji: "", color: "rgba(255,255,255,0.3)" },
            { label: "AI Agent", emoji: "🤖", color: "#a78bfa" },
            { label: "=", emoji: "", color: "rgba(255,255,255,0.3)" },
            { label: "统一身份", emoji: "🪪", color: "#34d399" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                fontFamily: FONT,
                fontSize: item.emoji ? 22 : 28,
                fontWeight: 600,
                color: item.color,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {item.emoji && <span style={{ fontSize: 28 }}>{item.emoji}</span>}
              {item.label}
            </div>
          ))}
        </div>

        {/* Fields table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 20,
            border: "1px solid rgba(167,139,250,0.15)",
            padding: "8px 0",
            width: 900,
            boxShadow: "0 8px 40px rgba(108,99,255,0.08)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              padding: "8px 28px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {["", "字段", "类型", "说明"].map((h, idx) => (
              <div
                key={h || idx}
                style={{
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  width: idx === 0 ? 40 : idx === 3 ? 340 : 200,
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
                    i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ width: 40, fontSize: 20, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#a78bfa",
                    width: 200,
                    flexShrink: 0,
                  }}
                >
                  {f.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 16,
                    color: "#60a5fa",
                    width: 200,
                    flexShrink: 0,
                  }}
                >
                  {f.type}
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 16,
                    color: "rgba(255,255,255,0.6)",
                    width: 340,
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
