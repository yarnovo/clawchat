import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const nodes = [
  "用户使用",
  "评价反馈",
  "fork 教育",
  "上架新 Agent",
  "更多用户",
  "开发者收入",
];

export const SceneAmFlywheel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subtitleProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

  // 圆形排列参数
  const rx = 260;
  const ry = 180;

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          飞轮效应
        </div>

        <div
          style={{
            position: "relative",
            width: 700,
            height: 460,
          }}
        >
          {/* 圆形箭头连线 */}
          {nodes.map((_, i) => {
            const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
            const nextAngle = ((i + 1) / nodes.length) * Math.PI * 2 - Math.PI / 2;
            const midAngle = (angle + nextAngle) / 2;
            const arrowX = 350 + Math.cos(midAngle) * (rx + 10);
            const arrowY = 230 + Math.sin(midAngle) * (ry + 10);
            const delay = 12 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const rotation = (midAngle * 180) / Math.PI + 90;
            return (
              <div
                key={`arrow-${i}`}
                style={{
                  position: "absolute",
                  left: arrowX - 14,
                  top: arrowY - 14,
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  color: COLORS.accent,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `rotate(${rotation}deg)`,
                }}
              >
                →
              </div>
            );
          })}

          {/* 节点 */}
          {nodes.map((node, i) => {
            const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
            const x = 350 + Math.cos(angle) * rx;
            const y = 230 + Math.sin(angle) * ry;
            const delay = 10 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={node}
                style={{
                  position: "absolute",
                  left: x - 75,
                  top: y - 30,
                  width: 150,
                  padding: "14px 10px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `2px solid ${COLORS.accent}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.6, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.text,
                    textAlign: "center",
                    lineHeight: 1.3,
                  }}
                >
                  {node}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            fontWeight: 600,
            opacity: interpolate(subtitleProg, [0, 1], [0, 1]),
          }}
        >
          整个生态自我进化
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
