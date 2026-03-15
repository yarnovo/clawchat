import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneEfIntro } from "./SceneEfIntro";
import { SceneEfLandscape } from "./SceneEfLandscape";
import { SceneEfDimensions } from "./SceneEfDimensions";
import { SceneEfL1 } from "./SceneEfL1";
import { SceneEfL2 } from "./SceneEfL2";
import { SceneEfL3 } from "./SceneEfL3";
import { SceneEfOutro } from "./SceneEfOutro";
import { Subtitle } from "../../Subtitle";

import efIntroWords from "./words/ef-intro-words.json";
import efLandscapeWords from "./words/ef-landscape-words.json";
import efDimensionsWords from "./words/ef-dimensions-words.json";
import efL1Words from "./words/ef-l1-words.json";
import efL2Words from "./words/ef-l2-words.json";
import efL3Words from "./words/ef-l3-words.json";
import efOutroWords from "./words/ef-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneEfIntro, SceneEfLandscape, SceneEfDimensions, SceneEfL1,
  SceneEfL2, SceneEfL3, SceneEfOutro,
];
const SCENE_WORDS = [
  efIntroWords, efLandscapeWords, efDimensionsWords, efL1Words,
  efL2Words, efL3Words, efOutroWords,
];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  let endFrame: number;
  if (isLast) {
    endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD;
  } else {
    const nextStart = Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
    endFrame = nextStart;
  }
  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i], Comp: SCENE_COMPS[i], startMs: t.startMs };
});

export const TOTAL_FRAMES = scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast ? 1 : interpolate(frame, [dur - FADE, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const EvalFramework: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/eval-framework/eval-framework.mp3")} volume={0.9} />
      {scenes.map((s, i) => {
        const isLast = i === scenes.length - 1;
        const seqDur = isLast ? s.dur : s.dur + FADE;
        const sceneStartMs = (s.from / FPS) * 1000;
        return (
          <Sequence key={i} from={s.from} durationInFrames={seqDur}>
            <Scene dur={seqDur} isLast={isLast}>
              <s.Comp />
              <AbsoluteFill style={{ zIndex: 100 }}>
                <Subtitle words={s.words as any} offsetMs={sceneStartMs} />
              </AbsoluteFill>
            </Scene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
