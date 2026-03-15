import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneBizIntro } from "./SceneBizIntro";
import { SceneBizTrust } from "./SceneBizTrust";
import { SceneBizSolo } from "./SceneBizSolo";
import { SceneBizSkill } from "./SceneBizSkill";
import { SceneBizLoneliness } from "./SceneBizLoneliness";
import { SceneBizTaste } from "./SceneBizTaste";
import { SceneBizFear } from "./SceneBizFear";
import { SceneBizLegacy } from "./SceneBizLegacy";
import { SceneBizOutro } from "./SceneBizOutro";
import { Subtitle } from "../../Subtitle";

import bizIntroWords from "./words/biz-intro-words.json";
import bizTrustWords from "./words/biz-trust-words.json";
import bizSoloWords from "./words/biz-solo-words.json";
import bizSkillWords from "./words/biz-skill-words.json";
import bizLonelinessWords from "./words/biz-loneliness-words.json";
import bizTasteWords from "./words/biz-taste-words.json";
import bizFearWords from "./words/biz-fear-words.json";
import bizLegacyWords from "./words/biz-legacy-words.json";
import bizOutroWords from "./words/biz-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneBizIntro, SceneBizTrust, SceneBizSolo, SceneBizSkill,
  SceneBizLoneliness, SceneBizTaste, SceneBizFear, SceneBizLegacy, SceneBizOutro,
];
const SCENE_WORDS = [
  bizIntroWords, bizTrustWords, bizSoloWords, bizSkillWords,
  bizLonelinessWords, bizTasteWords, bizFearWords, bizLegacyWords, bizOutroWords,
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

export const BizOpportunities: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/biz-opportunities/biz-opportunities.mp3")} volume={0.9} />
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
