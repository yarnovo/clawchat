import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { SceneRmIntro } from "./SceneRmIntro";
import { SceneRmPhase12 } from "./SceneRmPhase12";
import { SceneRmPhase3 } from "./SceneRmPhase3";
import { SceneRmPhase45 } from "./SceneRmPhase45";
import { SceneRmPhase67 } from "./SceneRmPhase67";
import { SceneRmOutro } from "./SceneRmOutro";
import { Subtitle } from "../../Subtitle";
import rmIntroWords from "./words/rm-intro-words.json";
import rmPhase12Words from "./words/rm-phase12-words.json";
import rmPhase3Words from "./words/rm-phase3-words.json";
import rmPhase45Words from "./words/rm-phase45-words.json";
import rmPhase67Words from "./words/rm-phase67-words.json";
import rmOutroWords from "./words/rm-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneRmIntro,
  SceneRmPhase12,
  SceneRmPhase3,
  SceneRmPhase45,
  SceneRmPhase67,
  SceneRmOutro,
];

const SCENE_WORDS = [
  rmIntroWords,
  rmPhase12Words,
  rmPhase3Words,
  rmPhase45Words,
  rmPhase67Words,
  rmOutroWords,
];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(
    0,
    Math.round((t.startMs / 1000) * FPS) - INTRO_PAD,
  );
  const isLast = i === timingData.length - 1;
  let endFrame: number;
  if (isLast) {
    endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD;
  } else {
    const nextStart =
      Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
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

export const TOTAL_FRAMES =
  scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{
  children: React.ReactNode;
  dur: number;
  isLast?: boolean;
}> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast
    ? 1
    : interpolate(frame, [dur - FADE, dur], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Roadmap: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
    <Audio src={staticFile("audio/roadmap/roadmap.mp3")} volume={0.9} />
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
