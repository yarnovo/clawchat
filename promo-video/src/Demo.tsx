import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { SceneIntro } from "./SceneIntro";
import { SceneFeatures } from "./SceneFeatures";
import { SceneCode } from "./SceneCode";
import { SceneOutro } from "./SceneOutro";

// 30fps: Intro 0-89(3s) → Features 90-209(4s) → Code 210-329(4s) → Outro 330-419(3s) = 14s total
const FADE = 15;

const Scene: React.FC<{ children: React.ReactNode; dur: number }> = ({ children, dur }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [dur - FADE, dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Demo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0f0c29" }}>
    <Sequence from={0} durationInFrames={90 + FADE}>
      <Scene dur={90 + FADE}>
        <SceneIntro />
      </Scene>
    </Sequence>

    <Sequence from={90} durationInFrames={120 + FADE}>
      <Scene dur={120 + FADE}>
        <SceneFeatures />
      </Scene>
    </Sequence>

    <Sequence from={210} durationInFrames={120 + FADE}>
      <Scene dur={120 + FADE}>
        <SceneCode />
      </Scene>
    </Sequence>

    <Sequence from={330} durationInFrames={90}>
      <SceneOutro />
    </Sequence>
  </AbsoluteFill>
);
