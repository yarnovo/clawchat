import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneDbIntro } from "./SceneDbIntro";
import { SceneDbAccount } from "./SceneDbAccount";
import { SceneDbSocial } from "./SceneDbSocial";
import { SceneDbMessaging } from "./SceneDbMessaging";
import { SceneDbErd } from "./SceneDbErd";
import { SceneDbOutro } from "./SceneDbOutro";
import { Subtitle } from "../../Subtitle";

import dbIntroWords from "./words/db-intro-words.json";
import dbAccountWords from "./words/db-account-words.json";
import dbSocialWords from "./words/db-social-words.json";
import dbMessagingWords from "./words/db-messaging-words.json";
import dbErdWords from "./words/db-erd-words.json";
import dbOutroWords from "./words/db-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10; // frames before narration starts
const OUTRO_PAD = 30; // frames after last narration ends

// Scene components in order (must match narration.json order)
const SCENE_COMPS = [
  SceneDbIntro, SceneDbAccount, SceneDbSocial,
  SceneDbMessaging, SceneDbErd, SceneDbOutro,
];
const SCENE_WORDS = [
  dbIntroWords, dbAccountWords, dbSocialWords,
  dbMessagingWords, dbErdWords, dbOutroWords,
];

// Compute scene timing from audio timing
const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;

  let endFrame: number;
  if (isLast) {
    endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD;
  } else {
    // Scene ends when next narration starts (minus intro pad of next scene)
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

export const DbDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0c29" }}>
      <Audio src={staticFile("audio/db/db.mp3")} volume={0.9} />
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
