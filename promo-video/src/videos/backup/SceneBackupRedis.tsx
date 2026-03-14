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

export const SceneBackupRedis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  const beforeEnt = spring({
    frame: frame - 25,
    fps,
    config: { damping: 14, mass: 0.8 },
  });
  const afterEnt = spring({
    frame: frame - 55,
    fps,
    config: { damping: 14, mass: 0.8 },
  });
  const configEnt = spring({
    frame: frame - 90,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
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
            transform: `translateY(${titleY}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              fontWeight: 600,
              color: COLORS.accent,
              padding: "6px 16px",
              background: "rgba(218,119,86,0.08)",
              borderRadius: 8,
              border: `1px solid rgba(218,119,86,0.15)`,
            }}
          >
            防线 3
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 60,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            Redis 持久化
          </div>
        </div>

        {/* Before / After comparison */}
        <div style={{ display: "flex", gap: 40, alignItems: "stretch" }}>
          {/* Before */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: "28px 32px",
              background: "#fff",
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              width: 360,
              opacity: interpolate(beforeEnt, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(beforeEnt, [0, 1], [-40, 0])}px)`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 600,
                color: COLORS.muted,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              ❌ 之前
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 28,
                color: COLORS.text,
                padding: "12px 16px",
                background: "rgba(0,0,0,0.02)",
                borderRadius: 8,
                lineHeight: 1.8,
              }}
            >
              image: redis:7<br />
              <span style={{ color: COLORS.subtle }}># 无 command 配置</span><br />
              <span style={{ color: COLORS.subtle }}># 数据仅存内存</span>
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.muted,
                padding: "8px 12px",
                background: "rgba(0,0,0,0.02)",
                borderRadius: 8,
                borderLeft: `3px solid ${COLORS.subtle}`,
              }}
            >
              容器重启 → 队列消息全部丢失
            </div>
          </div>

          {/* VS */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: FONT,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.subtle,
            }}
          >
            VS
          </div>

          {/* After */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: "28px 32px",
              background: "#fff",
              borderRadius: 12,
              border: `2px solid ${COLORS.accent}`,
              width: 360,
              opacity: interpolate(afterEnt, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(afterEnt, [0, 1], [40, 0])}px)`,
              boxShadow: "0 4px 24px rgba(218,119,86,0.1)",
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 600,
                color: COLORS.accent,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              ✅ 现在
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 28,
                color: COLORS.text,
                padding: "12px 16px",
                background: "rgba(0,0,0,0.02)",
                borderRadius: 8,
                lineHeight: 1.8,
              }}
            >
              image: redis:7<br />
              <span style={{ color: COLORS.accent }}>command: redis-server</span><br />
              <span style={{ color: COLORS.accent }}>  --save 60 1 --save 300 100</span>
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.accent,
                padding: "8px 12px",
                background: "rgba(218,119,86,0.06)",
                borderRadius: 8,
                borderLeft: `3px solid ${COLORS.accent}`,
              }}
            >
              容器重启 → 自动从 RDB 恢复数据
            </div>
          </div>
        </div>

        {/* Config explanation */}
        <div
          style={{
            display: "flex",
            gap: 24,
            opacity: interpolate(configEnt, [0, 1], [0, 1]),
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 28,
              color: COLORS.muted,
              padding: "6px 14px",
              background: "#fff",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            --save 60 1 → 60秒内有1次写入就存盘
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 28,
              color: COLORS.muted,
              padding: "6px 14px",
              background: "#fff",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            --save 300 100 → 5分钟内100次写入也存盘
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
