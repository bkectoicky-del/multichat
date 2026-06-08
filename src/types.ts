export interface ChatMessage {
  id: string;
  platform: "youtube" | "tiktok" | "facebook" | "simulation";
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
    simulation: boolean;
  };
  filterSystemMessages: boolean;
  playLocal: boolean;
  playOverlay: boolean;
}
