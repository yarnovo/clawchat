import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";

const COUNT = 12;

/**
 * 极淡暖色微粒 — 类似灰尘在阳光中漂浮
 */
export const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {Array.from({ length: COUNT }).map((_, i) => {
        const x = random(`x${i}`) * width;
        const baseY = random(`y${i}`) * height;
        const size = random(`s${i}`) * 3 + 1;
        const speed = random(`sp${i}`) * 0.2 + 0.05;
        const opacity = random(`o${i}`) * 0.08 + 0.02;
        const y = ((baseY - frame * speed) % height + height) % height;

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
              backgroundColor: `rgba(218,119,86,${opacity})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
