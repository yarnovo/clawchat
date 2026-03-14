import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

/**
 * Mesh gradient 背景 — 多个动态光斑叠加，比线性渐变更有质感
 */
export const GradientBg: React.FC<{
  colors?: [string, string, string];
}> = ({ colors = ["#0f0c29", "#302b63", "#24243e"] }) => {
  const frame = useCurrentFrame();
  const angle = interpolate(frame, [0, 600], [135, 315]);

  // 光斑动画参数
  const blob1X = 30 + Math.sin(frame * 0.008) * 15;
  const blob1Y = 25 + Math.cos(frame * 0.006) * 10;
  const blob2X = 70 + Math.cos(frame * 0.007) * 12;
  const blob2Y = 65 + Math.sin(frame * 0.009) * 15;
  const blob3X = 50 + Math.sin(frame * 0.005) * 20;
  const blob3Y = 80 + Math.cos(frame * 0.008) * 10;

  return (
    <AbsoluteFill>
      {/* Base gradient */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`,
        }}
      />
      {/* Mesh blobs */}
      <AbsoluteFill style={{ overflow: "hidden", opacity: 0.6 }}>
        <div
          style={{
            position: "absolute",
            left: `${blob1X}%`,
            top: `${blob1Y}%`,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(108,99,255,0.35) 0%, transparent 70%)",
            transform: "translate(-50%, -50%)",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${blob2X}%`,
            top: `${blob2Y}%`,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(7,193,96,0.25) 0%, transparent 70%)",
            transform: "translate(-50%, -50%)",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${blob3X}%`,
            top: `${blob3Y}%`,
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,210,255,0.2) 0%, transparent 70%)",
            transform: "translate(-50%, -50%)",
            filter: "blur(80px)",
          }}
        />
      </AbsoluteFill>
      {/* Noise/grain overlay */}
      <AbsoluteFill
        style={{
          background:
            "repeating-conic-gradient(rgba(255,255,255,0.01) 0% 25%, transparent 0% 50%) 0 0 / 4px 4px",
          opacity: 0.4,
        }}
      />
    </AbsoluteFill>
  );
};
