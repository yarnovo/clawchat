import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneSlIntro } from "./SceneSlIntro";
import { SceneSlNanoclaw } from "./SceneSlNanoclaw";
import { SceneSlIronclaw } from "./SceneSlIronclaw";
import { SceneSlOpenclaw } from "./SceneSlOpenclaw";
import { SceneSlOurs } from "./SceneSlOurs";
import { SceneSlStructure } from "./SceneSlStructure";
import { SceneSlOutro } from "./SceneSlOutro";
import { Subtitle } from "../../Subtitle";

import slIntroWords from "./words/sl-intro-words.json";
import slNanoclawWords from "./words/sl-nanoclaw-words.json";
import slIronclawWords from "./words/sl-ironclaw-words.json";
import slOpenclawWords from "./words/sl-openclaw-words.json";
import slOursWords from "./words/sl-ours-words.json";
import slStructureWords from "./words/sl-structure-words.json";
import slOutroWords from "./words/sl-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneSlIntro, SceneSlNanoclaw, SceneSlIronclaw, SceneSlOpenclaw,
  SceneSlOurs, SceneSlStructure, SceneSlOutro,
];
const SCENE_WORDS = [
  slIntroWords, slNanoclawWords, slIronclawWords, slOpenclawWords,
  slOursWords, slStructureWords, slOutroWords,
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

export const SkillLoading: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/skill-loading/skill-loading.mp3")} volume={0.9} />
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
