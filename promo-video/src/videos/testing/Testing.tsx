import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneTestIntro } from "./SceneTestIntro";
import { SceneTestL1 } from "./SceneTestL1";
import { SceneTestL2 } from "./SceneTestL2";
import { SceneTestL3 } from "./SceneTestL3";
import { SceneTestTools } from "./SceneTestTools";
import { SceneTestOutro } from "./SceneTestOutro";
import { Subtitle } from "../../Subtitle";

import testIntroWords from "./words/test-intro-words.json";
import testL1Words from "./words/test-l1-words.json";
import testL2Words from "./words/test-l2-words.json";
import testL3Words from "./words/test-l3-words.json";
import testToolsWords from "./words/test-tools-words.json";
import testOutroWords from "./words/test-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneTestIntro, SceneTestL1, SceneTestL2,
  SceneTestL3, SceneTestTools, SceneTestOutro,
];
const SCENE_WORDS = [
  testIntroWords, testL1Words, testL2Words,
  testL3Words, testToolsWords, testOutroWords,
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

  return {
    from: startFrame,
    dur: endFrame - startFrame,
    words: SCENE_WORDS[i],
    Comp: SCENE_COMPS[i],
    startMs: t.startMs,
  };
});

export const TOTAL_FRAMES = scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({
  children,
  dur,
  isLast,
}) => {
  const frame = useCurrentFrame();
  const opacity = isLast
    ? 1
    : interpolate(frame, [dur - FADE, dur], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Testing: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/testing/testing.mp3")} volume={0.9} />
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
