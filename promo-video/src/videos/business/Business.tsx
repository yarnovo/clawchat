import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneBizIntro } from "./SceneBizIntro";
import { SceneBizSubscription } from "./SceneBizSubscription";
import { SceneBizMarketplace } from "./SceneBizMarketplace";
import { SceneBizFlywheel } from "./SceneBizFlywheel";
import { SceneBizStrategy } from "./SceneBizStrategy";
import { SceneBizOutro } from "./SceneBizOutro";
import { Subtitle } from "../../Subtitle";

import bizIntroWords from "./words/biz-intro-words.json";
import bizSubscriptionWords from "./words/biz-subscription-words.json";
import bizMarketplaceWords from "./words/biz-marketplace-words.json";
import bizFlywheelWords from "./words/biz-flywheel-words.json";
import bizStrategyWords from "./words/biz-strategy-words.json";
import bizOutroWords from "./words/biz-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneBizIntro, SceneBizSubscription, SceneBizMarketplace,
  SceneBizFlywheel, SceneBizStrategy, SceneBizOutro,
];
const SCENE_WORDS = [
  bizIntroWords, bizSubscriptionWords, bizMarketplaceWords,
  bizFlywheelWords, bizStrategyWords, bizOutroWords,
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

export const Business: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/business/business.mp3")} volume={0.9} />
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
