import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneRuntimeIntro } from "./SceneRuntimeIntro";
import { SceneRuntimeOpenclaw } from "./SceneRuntimeOpenclaw";
import { SceneRuntimeNanoclaw } from "./SceneRuntimeNanoclaw";
import { SceneRuntimeIronclaw } from "./SceneRuntimeIronclaw";
import { SceneRuntimeCompare } from "./SceneRuntimeCompare";
import { SceneRuntimeOutro } from "./SceneRuntimeOutro";
import { Subtitle } from "../../Subtitle";

import runtimeIntroWords from "./words/runtime-intro-words.json";
import runtimeOpenclawWords from "./words/runtime-openclaw-words.json";
import runtimeNanoclawWords from "./words/runtime-nanoclaw-words.json";
import runtimeIronclawWords from "./words/runtime-ironclaw-words.json";
import runtimeCompareWords from "./words/runtime-compare-words.json";
import runtimeOutroWords from "./words/runtime-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneRuntimeIntro, SceneRuntimeOpenclaw, SceneRuntimeNanoclaw,
  SceneRuntimeIronclaw, SceneRuntimeCompare, SceneRuntimeOutro,
];
const SCENE_WORDS = [
  runtimeIntroWords, runtimeOpenclawWords, runtimeNanoclawWords,
  runtimeIronclawWords, runtimeCompareWords, runtimeOutroWords,
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

export const Runtime: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/runtime/runtime.mp3")} volume={0.9} />
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
