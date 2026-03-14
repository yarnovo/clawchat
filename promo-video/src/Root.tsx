import { Composition } from "remotion";
import { Demo, TOTAL_FRAMES as MAIN_FRAMES } from "./videos/main/Demo";
import { BackupDemo, TOTAL_FRAMES as BACKUP_FRAMES } from "./videos/backup/BackupDemo";
import { DbDemo, TOTAL_FRAMES as DB_FRAMES } from "./videos/db/DbDemo";
import { SkillsDemo, TOTAL_FRAMES as SKILLS_FRAMES } from "./videos/skills/SkillsDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={MAIN_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="BackupDemo"
        component={BackupDemo}
        durationInFrames={BACKUP_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DbDemo"
        component={DbDemo}
        durationInFrames={DB_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="SkillsDemo"
        component={SkillsDemo}
        durationInFrames={SKILLS_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
