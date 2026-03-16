import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneIntro } from "./SceneIntro";
import { SceneCrud } from "./SceneCrud";
import { SceneLifecycle } from "./SceneLifecycle";
import { Subtitle } from "../../Subtitle";

import introWords from "./words/sva-intro-words.json";
import crudWords from "./words/sva-crud-words.json";
import lifecycleWords from "./words/sva-lifecycle-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [SceneIntro, SceneCrud, SceneLifecycle];
const SCENE_WORDS = [introWords, crudWords, lifecycleWords];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  const endFrame = isLast
    ? Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD
    : Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;

  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i], Comp: SCENE_COMPS[i] };
});

export const SV_AGENTS_FRAMES = scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast ? 1 : interpolate(frame, [dur - FADE, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const SvAgents: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
    <Audio src={staticFile("audio/sv-agents/sv-agents.mp3")} volume={0.9} />
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
