import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { SceneAcIntro } from "./SceneAcIntro";
import { SceneAcModel } from "./SceneAcModel";
import { SceneAcRuntime } from "./SceneAcRuntime";
import { SceneAcPrompt } from "./SceneAcPrompt";
import { SceneAcLifecycle } from "./SceneAcLifecycle";
import { SceneAcOutro } from "./SceneAcOutro";
import { Subtitle } from "../../Subtitle";
import acIntroWords from "./words/ac-intro-words.json";
import acModelWords from "./words/ac-model-words.json";
import acRuntimeWords from "./words/ac-runtime-words.json";
import acPromptWords from "./words/ac-prompt-words.json";
import acLifecycleWords from "./words/ac-lifecycle-words.json";
import acOutroWords from "./words/ac-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneAcIntro,
  SceneAcModel,
  SceneAcRuntime,
  SceneAcPrompt,
  SceneAcLifecycle,
  SceneAcOutro,
];
const SCENE_WORDS = [
  acIntroWords,
  acModelWords,
  acRuntimeWords,
  acPromptWords,
  acLifecycleWords,
  acOutroWords,
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

export const AgentConfig: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
    <Audio
      src={staticFile("audio/agent-config/agent-config.mp3")}
      volume={0.9}
    />
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
