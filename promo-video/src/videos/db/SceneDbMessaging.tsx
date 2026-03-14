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

const conversationFields = [
  { name: "id", type: "UUID", desc: "会话唯一标识" },
  { name: "type", type: "ConversationType", desc: "dm / group" },
  { name: "targetId", type: "String", desc: "dm=双方ID / group=群组ID" },
  { name: "updatedAt", type: "DateTime", desc: "自动更新时间戳" },
];

const messageFields = [
  { name: "id", type: "UUID", desc: "消息唯一标识" },
  { name: "conversationId", type: "String", desc: "所属会话" },
  { name: "senderId", type: "String", desc: "发送者账号" },
  { name: "type", type: "MessageType", desc: "text / image / voice" },
  { name: "content", type: "String?", desc: "文字内容" },
  { name: "fileUrl", type: "String?", desc: "图片/语音 URL" },
  { name: "mentions", type: "String[]", desc: "被 @ 的账号列表" },
  { name: "deletedAt", type: "DateTime?", desc: "软删除（消息撤回）" },
];

interface TableBlockProps {
  title: string;
  badge: string;
  fields: { name: string; type: string; desc: string }[];
  width: number;
  delay: number;
  slideDir: number; // -1 = from left, 1 = from right
}

const TableBlock: React.FC<TableBlockProps> = ({ title, badge, fields, width, delay, slideDir }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardProg = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        background: COLORS.card,
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
        opacity: interpolate(cardProg, [0, 1], [0, 1]),
        transform: `translateX(${interpolate(cardProg, [0, 1], [slideDir * 40, 0])}px)`,
        boxShadow: COLORS.cardShadow,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <span style={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: COLORS.text }}>
          {title}
        </span>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            color: COLORS.accent,
            padding: "3px 10px",
            borderRadius: 6,
            background: "rgba(218,119,86,0.08)",
            border: "1px solid rgba(218,119,86,0.2)",
            marginLeft: "auto",
          }}
        >
          {badge}
        </div>
      </div>

      {/* Rows */}
      {fields.map((f, i) => {
        const rowProg = spring({
          frame: frame - (delay + 8 + i * 4),
          fps,
          config: { damping: 14, mass: 0.5 },
        });
        return (
          <div
            key={f.name}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 20px",
              gap: 8,
              opacity: interpolate(rowProg, [0, 1], [0, 1]),
              background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: COLORS.text, width: 130, flexShrink: 0 }}>
              {f.name}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 26, color: COLORS.accent, width: 130, flexShrink: 0 }}>
              {f.type}
            </span>
            <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted }}>
              {f.desc}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const SceneDbMessaging: React.FC = () => {
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
            消息系统
          </div>
        </div>

        {/* Two side-by-side tables */}
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          <TableBlock
            title="Conversation 会话"
            badge="容器模式"
            fields={conversationFields}
            width={520}
            delay={10}
            slideDir={-1}
          />
          <TableBlock
            title="Message 消息"
            badge="软删除"
            fields={messageFields}
            width={560}
            delay={18}
            slideDir={1}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
