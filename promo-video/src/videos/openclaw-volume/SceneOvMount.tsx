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

export const SceneOvMount: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const wrongProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const rightProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          挂载路径
        </div>

        {/* Wrong path */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "20px 36px",
            borderRadius: 14,
            background: "rgba(220,80,60,0.05)",
            border: "1px solid rgba(220,80,60,0.2)",
            opacity: interpolate(wrongProg, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(wrongProg, [0, 1], [-40, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 36 }}>&#10060;</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 30,
                fontWeight: 700,
                color: "#DC4C3C",
              }}
            >
              /root/.openclaw
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                color: COLORS.muted,
              }}
            >
              错误：root 用户
            </div>
          </div>
        </div>

        {/* Right path */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "20px 36px",
            borderRadius: 14,
            background: "rgba(80,180,80,0.05)",
            border: "1px solid rgba(80,180,80,0.2)",
            opacity: interpolate(rightProg, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(rightProg, [0, 1], [40, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 36 }}>&#9989;</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 30,
                fontWeight: 700,
                color: "#3BA55C",
              }}
            >
              /home/node/.openclaw
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                color: COLORS.muted,
              }}
            >
              正确：USER node
            </div>
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.accent,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
          }}
        >
          Dockerfile 最终 USER node，数据在 /home/node/
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
