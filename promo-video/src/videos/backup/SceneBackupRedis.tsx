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
      <GradientBg colors={["#0a1a15", "#0e2e22", "#0a1a15"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 120,
        }}
      >
        {/* 标题 */}
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
              fontFamily: FONT,
              fontSize: 20,
              fontWeight: 600,
              color: "#34d399",
              padding: "6px 16px",
              background: "rgba(52,211,153,0.1)",
              borderRadius: 8,
              border: "1px solid rgba(52,211,153,0.2)",
            }}
          >
            防线 3
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 800,
              background: "linear-gradient(135deg, #ffffff 20%, #34d399 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Redis 持久化
          </div>
        </div>

        {/* 对比：Before / After */}
        <div style={{ display: "flex", gap: 40, alignItems: "stretch" }}>
          {/* Before */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: "28px 32px",
              background: "rgba(255,60,60,0.04)",
              borderRadius: 20,
              border: "1px solid rgba(255,60,60,0.12)",
              width: 360,
              opacity: interpolate(beforeEnt, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(beforeEnt, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 600,
                color: "#ff6b6b",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              ❌ 之前
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                color: "rgba(255,255,255,0.5)",
                padding: "12px 16px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: 10,
                lineHeight: 1.8,
              }}
            >
              image: redis:7<br />
              <span style={{ color: "rgba(255,255,255,0.25)" }}># 无 command 配置</span><br />
              <span style={{ color: "rgba(255,255,255,0.25)" }}># 数据仅存内存</span>
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 15,
                color: "#ff6b6b",
                padding: "8px 12px",
                background: "rgba(255,60,60,0.06)",
                borderRadius: 8,
                borderLeft: "3px solid #ff6b6b",
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
              fontSize: 24,
              fontWeight: 800,
              color: "rgba(255,255,255,0.15)",
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
              background: "rgba(52,211,153,0.04)",
              borderRadius: 20,
              border: "1px solid rgba(52,211,153,0.12)",
              width: 360,
              opacity: interpolate(afterEnt, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(afterEnt, [0, 1], [40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 600,
                color: "#34d399",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              ✅ 现在
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                color: "rgba(255,255,255,0.5)",
                padding: "12px 16px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: 10,
                lineHeight: 1.8,
              }}
            >
              image: redis:7<br />
              <span style={{ color: "#34d399" }}>command: redis-server</span><br />
              <span style={{ color: "#34d399" }}>  --save 60 1 --save 300 100</span>
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 15,
                color: "#34d399",
                padding: "8px 12px",
                background: "rgba(52,211,153,0.06)",
                borderRadius: 8,
                borderLeft: "3px solid #34d399",
              }}
            >
              容器重启 → 自动从 RDB 恢复数据
            </div>
          </div>
        </div>

        {/* 配置说明 */}
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
              fontSize: 14,
              color: "rgba(52,211,153,0.5)",
              padding: "6px 14px",
              background: "rgba(52,211,153,0.05)",
              borderRadius: 8,
              border: "1px solid rgba(52,211,153,0.1)",
            }}
          >
            --save 60 1 → 60秒内有1次写入就存盘
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 14,
              color: "rgba(52,211,153,0.5)",
              padding: "6px 14px",
              background: "rgba(52,211,153,0.05)",
              borderRadius: 8,
              border: "1px solid rgba(52,211,153,0.1)",
            }}
          >
            --save 300 100 → 5分钟内100次写入也存盘
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
