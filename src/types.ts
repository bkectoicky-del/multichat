export interface ChatMessage {
  id: string;
  platform: "youtube" | "tiktok" | "facebook" | "system";
  author: string;
  message: string;
  timestamp: number;
  avatar?: string;
  isSpoken?: boolean;
}

export interface SpeechSettings {
  voiceURI: string;
  rate: number;
  pitch: number;
  volume: number;
  readUsername: boolean;
  minMessageLength: number;
  ignoredKeywords: string[];
  nicknameReadFormat: string; // e.g. "{name} berkata {message}"
  enabledPlatforms: {
    youtube: boolean;
    tiktok: boolean;
    facebook: boolean;
  };
  filterSystemMessages: boolean;
  playLocal: boolean;
  filterTtsMode?: "all" | "only_contributors";
}
