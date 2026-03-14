import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";

const COUNT = 40;

/**
 * 发光粒子背景 — 不同大小、颜色、发光强度
 */
export const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {Array.from({ length: COUNT }).map((_, i) => {
        const x = random(`x${i}`) * width;
        const baseY = random(`y${i}`) * height;
        const size = random(`s${i}`) * 4 + 1;
        const speed = random(`sp${i}`) * 0.6 + 0.2;
        const baseOpacity = random(`o${i}`) * 0.4 + 0.1;
        const y = ((baseY - frame * speed) % height + height) % height;

        // 一些粒子有颜色和发光
        const colorIdx = i % 5;
        const colors = [
          "rgba(255,255,255,",
          "rgba(108,99,255,",
          "rgba(7,193,96,",
          "rgba(0,210,255,",
          "rgba(255,255,255,",
        ];
        const color = colors[colorIdx];
        // 闪烁效果
        const twinkle = 0.7 + 0.3 * Math.sin(frame * 0.05 + i * 2);
        const opacity = baseOpacity * twinkle;
        const glowSize = size * 3;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: `${color}${opacity})`,
              boxShadow: colorIdx > 0 && colorIdx < 4
                ? `0 0 ${glowSize}px ${color}${opacity * 0.6})`
                : "none",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
