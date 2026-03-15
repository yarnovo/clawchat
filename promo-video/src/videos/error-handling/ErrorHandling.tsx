import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneEhIntro } from "./SceneEhIntro";
import { SceneEhContainer } from "./SceneEhContainer";
import { SceneEhNetwork } from "./SceneEhNetwork";
import { SceneEhApi } from "./SceneEhApi";
import { SceneEhSaga } from "./SceneEhSaga";
import { SceneEhOutro } from "./SceneEhOutro";
import { Subtitle } from "../../Subtitle";

import ehIntroWords from "./words/eh-intro-words.json";
import ehContainerWords from "./words/eh-container-words.json";
import ehNetworkWords from "./words/eh-network-words.json";
import ehApiWords from "./words/eh-api-words.json";
import ehSagaWords from "./words/eh-saga-words.json";
import ehOutroWords from "./words/eh-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneEhIntro, SceneEhContainer, SceneEhNetwork,
  SceneEhApi, SceneEhSaga, SceneEhOutro,
];
const SCENE_WORDS = [
  ehIntroWords, ehContainerWords, ehNetworkWords,
  ehApiWords, ehSagaWords, ehOutroWords,
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

export const ErrorHandling: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/error-handling/error-handling.mp3")} volume={0.9} />
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
