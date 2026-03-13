import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";

const COUNT = 35;

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
        const opacity = random(`o${i}`) * 0.4 + 0.1;
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
              backgroundColor: `rgba(255,255,255,${opacity})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
