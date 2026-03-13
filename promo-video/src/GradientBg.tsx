import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const GradientBg: React.FC<{
  colors?: [string, string, string];
}> = ({ colors = ["#0f0c29", "#302b63", "#24243e"] }) => {
  const frame = useCurrentFrame();
  const angle = interpolate(frame, [0, 300], [135, 225]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`,
      }}
    />
  );
};
