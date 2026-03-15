import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneIntro } from "./SceneIntro";
import { SceneCaseRent } from "./SceneCaseRent";
import { SceneCaseLabor } from "./SceneCaseLabor";
import { SceneCasePenalty } from "./SceneCasePenalty";
import { SceneCaseFormat } from "./SceneCaseFormat";
import { SceneReport } from "./SceneReport";
import { SceneOutro } from "./SceneOutro";
import { Subtitle } from "../../Subtitle";

import introWords from "./words/intro-words.json";
import caseRentWords from "./words/case-rent-words.json";
import caseLaborWords from "./words/case-labor-words.json";
import casePenaltyWords from "./words/case-penalty-words.json";
import caseFormatWords from "./words/case-format-words.json";
import reportWords from "./words/report-words.json";
import outroWords from "./words/outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneIntro, SceneCaseRent, SceneCaseLabor,
  SceneCasePenalty, SceneCaseFormat, SceneReport, SceneOutro,
];
const SCENE_WORDS = [
  introWords, caseRentWords, caseLaborWords,
  casePenaltyWords, caseFormatWords, reportWords, outroWords,
];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  const endFrame = isLast
    ? Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD
    : Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;

  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i], Comp: SCENE_COMPS[i] };
});

export const TOTAL_FRAMES = scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast ? 1 : interpolate(frame, [dur - FADE, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const LegalCases: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
    <Audio src={staticFile("audio/legal-cases/legal-cases.mp3")} volume={0.9} />
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
