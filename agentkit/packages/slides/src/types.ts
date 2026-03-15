/**
 * 视频项目定义
 */

/** 一个场景 */
export interface Scene {
  id: string;
  /** 场景标题 */
  title?: string;
  /** 场景内容（支持 HTML） */
  content: string;
  /** 旁白文本 */
  narration?: string;
  /** 自定义 CSS */
  style?: Record<string, string>;
  /** 背景色 */
  background?: string;
}

/** 视频项目配置 */
export interface VideoProject {
  /** 视频标题 */
  title: string;
  /** 宽度（默认 1920） */
  width?: number;
  /** 高度（默认 1080） */
  height?: number;
  /** 帧率（默认 30） */
  fps?: number;
  /** 全局样式 */
  theme?: Theme;
  /** 场景列表 */
  scenes: Scene[];
}

export interface Theme {
  fontFamily?: string;
  titleSize?: string;
  contentSize?: string;
  color?: string;
  background?: string;
  accent?: string;
}

/** TTS 生成的时间戳 */
export interface WordTimestamp {
  text: string;
  start: number; // ms
  end: number;   // ms
}

/** 场景的 timing 信息（TTS 生成后） */
export interface SceneTiming {
  id: string;
  startMs: number;
  endMs: number;
  words: WordTimestamp[];
  audioFile?: string;
}
