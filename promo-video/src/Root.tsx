import { Composition } from "remotion";
import { Main, TOTAL_FRAMES as MAIN_FRAMES } from "./videos/main/Main";
import { Backup, TOTAL_FRAMES as BACKUP_FRAMES } from "./videos/backup/Backup";
import { Db, TOTAL_FRAMES as DB_FRAMES } from "./videos/db/Db";
import { Skills, TOTAL_FRAMES as SKILLS_FRAMES } from "./videos/skills/Skills";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={MAIN_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Backup"
        component={Backup}
        durationInFrames={BACKUP_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Db"
        component={Db}
        durationInFrames={DB_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Skills"
        component={Skills}
        durationInFrames={SKILLS_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
