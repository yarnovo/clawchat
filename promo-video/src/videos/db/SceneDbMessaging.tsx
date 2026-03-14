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

const conversationFields = [
  { name: "id", type: "UUID", icon: "🔑", desc: "会话唯一标识" },
  { name: "type", type: "ConversationType", icon: "🏷️", desc: "dm / group" },
  { name: "targetId", type: "String", icon: "🎯", desc: "dm=双方ID / group=群组ID" },
  { name: "updatedAt", type: "DateTime", icon: "🕐", desc: "自动更新时间戳" },
];

const messageFields = [
  { name: "id", type: "UUID", icon: "🔑", desc: "消息唯一标识" },
  { name: "conversationId", type: "String", icon: "💬", desc: "所属会话" },
  { name: "senderId", type: "String", icon: "👤", desc: "发送者账号" },
  { name: "type", type: "MessageType", icon: "📝", desc: "text / image / voice" },
  { name: "content", type: "String?", icon: "📄", desc: "文字内容" },
  { name: "fileUrl", type: "String?", icon: "📎", desc: "图片/语音 URL" },
  { name: "mentions", type: "String[]", icon: "📢", desc: "被 @ 的账号列表" },
  { name: "deletedAt", type: "DateTime?", icon: "🗑️", desc: "软删除（消息撤回）" },
];

export const SceneDbMessaging: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0c0a2e", "#2a1a0e", "#0c0a2e"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
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
          <span style={{ fontSize: 44 }}>💬</span>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 800,
              background: "linear-gradient(135deg, #fff 30%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            消息系统
          </div>
        </div>

        {/* Two side-by-side tables */}
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          {/* Conversation */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 520,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 20,
              border: "1px solid rgba(245,158,11,0.15)",
              overflow: "hidden",
              opacity: interpolate(
                spring({ frame: frame - 10, fps, config: { damping: 14, mass: 0.7 } }),
                [0, 1],
                [0, 1],
              ),
              transform: `translateX(${interpolate(
                spring({ frame: frame - 10, fps, config: { damping: 14, mass: 0.7 } }),
                [0, 1],
                [-40, 0],
              )}px)`,
              boxShadow: "0 8px 40px rgba(245,158,11,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(245,158,11,0.04)",
              }}
            >
              <span style={{ fontSize: 22 }}>📋</span>
              <span style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>
                Conversation 会话
              </span>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: "#f59e0b",
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  marginLeft: "auto",
                }}
              >
                容器模式
              </div>
            </div>
            {conversationFields.map((f, i) => {
              const rowProg = spring({
                frame: frame - (18 + i * 5),
                fps,
                config: { damping: 14, mass: 0.5 },
              });
              return (
                <div
                  key={f.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "9px 20px",
                    gap: 8,
                    opacity: interpolate(rowProg, [0, 1], [0, 1]),
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}
                >
                  <span style={{ fontSize: 15, width: 22, textAlign: "center" }}>{f.icon}</span>
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "#f59e0b", width: 120 }}>
                    {f.name}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: "rgba(245,158,11,0.7)", width: 130 }}>
                    {f.type}
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                    {f.desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Message */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 580,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 20,
              border: "1px solid rgba(96,165,250,0.15)",
              overflow: "hidden",
              opacity: interpolate(
                spring({ frame: frame - 18, fps, config: { damping: 14, mass: 0.7 } }),
                [0, 1],
                [0, 1],
              ),
              transform: `translateX(${interpolate(
                spring({ frame: frame - 18, fps, config: { damping: 14, mass: 0.7 } }),
                [0, 1],
                [40, 0],
              )}px)`,
              boxShadow: "0 8px 40px rgba(96,165,250,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(96,165,250,0.04)",
              }}
            >
              <span style={{ fontSize: 22 }}>✉️</span>
              <span style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: "#60a5fa" }}>
                Message 消息
              </span>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: "#60a5fa",
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: "rgba(96,165,250,0.1)",
                  border: "1px solid rgba(96,165,250,0.2)",
                  marginLeft: "auto",
                }}
              >
                软删除
              </div>
            </div>
            {messageFields.map((f, i) => {
              const rowProg = spring({
                frame: frame - (24 + i * 4),
                fps,
                config: { damping: 14, mass: 0.5 },
              });
              return (
                <div
                  key={f.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "7px 20px",
                    gap: 8,
                    opacity: interpolate(rowProg, [0, 1], [0, 1]),
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}
                >
                  <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{f.icon}</span>
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "#60a5fa", width: 130 }}>
                    {f.name}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: "rgba(96,165,250,0.7)", width: 120 }}>
                    {f.type}
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                    {f.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
