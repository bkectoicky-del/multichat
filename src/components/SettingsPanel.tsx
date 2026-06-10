import React, { useEffect, useState } from "react";
import { SpeechSettings } from "../types";
import { Volume2, Settings, MessageSquare, Shield, Play, SlidersHorizontal, Radio, Keyboard, Trash2 } from "lucide-react";

interface VoiceSettingsCardProps {
  settings: SpeechSettings;
  onChangeSettings: (newSettings: SpeechSettings) => void;
}

export function VoiceSettingsCard({ settings, onChangeSettings }: VoiceSettingsCardProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testText, setTestText] = useState("Koneksi berhasil! Pengaturan suara telah dikonfigurasi.");

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      }
    };

    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeSettings({
      ...settings,
      voiceURI: e.target.value,
    });
  };

  const handleSliderChange = (key: "rate" | "pitch" | "volume", val: number) => {
    onChangeSettings({
      ...settings,
      [key]: val,
    });
  };

  const handleToggle = (key: keyof SpeechSettings) => {
    if (typeof settings[key] === "boolean") {
      onChangeSettings({
        ...settings,
        [key]: !settings[key] as any,
      });
    }
  };

  const handleTestVoice = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(testText);
      utterance.lang = "id-ID";
      
      let selectedVoice = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (!selectedVoice) {
        // Fallback: Cari suara asli Bahasa Indonesia (id-ID) terbaik dari browser
        selectedVoice = voices.find((v) => {
          const l = v.lang.toLowerCase().replace("_", "-");
          return l === "id-id" || l === "id" || l.startsWith("id-");
        });
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Speech synthesis is not supported on this browser!");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5 shadow-xl h-full">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
        <Volume2 className="w-4 h-4 text-indigo-400" />
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Voice Engine</h2>
      </div>

      <div className="space-y-4">
        {/* Voice Selection dropdown */}
        <div className="space-y-2">
          <label className="text-xs text-slate-500 font-medium">Select Voice Model</label>
          <div className="relative">
            <select
              value={settings.voiceURI}
              onChange={handleVoiceChange}
              className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-slate-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-indigo-500 font-sans cursor-pointer focus:outline-none appearance-none transition-colors"
            >
              <option value="">Indonesian Standard (Default Browser)</option>
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 pointer-events-none flex items-center">
              <span className="text-slate-500">▼</span>
            </div>
          </div>
        </div>

        {/* Preset sliders aligned to Bento layout design */}
        <div className="space-y-4 py-2">
          {/* Speed Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
              <span>Speech Speed</span>
              <span className="text-indigo-400">{settings.rate.toFixed(1)}x</span>
            </div>
            <div className="relative flex items-center">
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={settings.rate}
                onChange={(e) => handleSliderChange("rate", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Pitch Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
              <span>Voice Pitch</span>
              <span className="text-indigo-400">{settings.pitch.toFixed(1)}x</span>
            </div>
            <div className="relative flex items-center">
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={settings.pitch}
                onChange={(e) => handleSliderChange("pitch", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Volume Slider with Shadow glow matching design */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
              <span>TTS Volume</span>
              <span className="text-indigo-400">{Math.round(settings.volume * 100)}%</span>
            </div>
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={(e) => handleSliderChange("volume", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Voice Format pattern inputs */}
        <div className="space-y-2 pt-2 border-t border-slate-850">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nickname Read Format</label>
          <input
            type="text"
            value={settings.nicknameReadFormat}
            onChange={(e) => onChangeSettings({ ...settings, nicknameReadFormat: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs font-mono focus:border-indigo-500 focus:outline-none"
            placeholder="{name} berkata {message}"
          />
        </div>

        {/* TTS Target / Filter Type */}
        <div className="space-y-2 pt-2 border-t border-slate-850">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            🎯 TARGET TTS FILTER
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChangeSettings({ ...settings, filterTtsMode: "all" })}
              className={`py-2 px-1 text-[10.5px] font-bold rounded-lg border transition-all cursor-pointer text-center ${
                (settings.filterTtsMode || "all") === "all"
                  ? "bg-indigo-900/30 border-indigo-500/50 text-indigo-300 shadow-sm shadow-indigo-950/40"
                  : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
              }`}
            >
              Semua Chat
            </button>
            <button
              onClick={() => onChangeSettings({ ...settings, filterTtsMode: "only_contributors" })}
              className={`py-2 px-1 text-[10.5px] font-bold rounded-lg border transition-all cursor-pointer text-center ${
                settings.filterTtsMode === "only_contributors"
                  ? "bg-indigo-900/30 border-indigo-500/50 text-indigo-300 shadow-sm shadow-indigo-950/40"
                  : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
              }`}
            >
              Follower & Subscriber
            </button>
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed font-medium">
            💡 <b className="text-slate-450">Follower & Subscriber</b>: Hanya membaca live Chat kontributor yang mengirim hadiah/gift, mawar, super chat, share live, menyukai, atau menuliskan kata <span className="text-indigo-400/85">follow</span> / <span className="text-indigo-400/85">sub</span> / <span className="text-indigo-400/85">share</span>.
          </div>
        </div>

        {/* Active Platform selection toggles */}
        <div className="space-y-2 pt-2 border-t border-slate-850">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            🌐 PLATFORM BERSUARA (TTS)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(settings.enabledPlatforms || {})
              .filter((plat) => plat !== "simulation")
              .map((plat) => {
                const label =
                  plat === "youtube"
                    ? "📺 YouTube"
                    : plat === "tiktok"
                    ? "🎵 TikTok"
                    : "👥 Facebook";
                const isEnabled = !!(settings.enabledPlatforms as any)[plat];
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => {
                      onChangeSettings({
                        ...settings,
                        enabledPlatforms: {
                          ...settings.enabledPlatforms,
                          [plat]: !isEnabled,
                        } as any,
                      });
                    }}
                    className={`py-2 px-2 rounded-lg border text-[10.5px] font-bold transition duration-150 cursor-pointer flex items-center justify-between ${
                      isEnabled
                        ? "bg-slate-900/80 border-indigo-500/50 text-indigo-300 shadow-sm"
                        : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-400"
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`w-2 h-2 rounded-full ${isEnabled ? "bg-indigo-400 shadow-[0_0_6px_#6366f1]" : "bg-slate-800"}`}></span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Audio Destination toggles */}
        <div className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850 mt-1">
          <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={settings.readUsername}
              onChange={() => handleToggle("readUsername")}
              className="rounded bg-slate-950 border-slate-800 text-indigo-500 w-3.5 h-3.5 focus:ring-0"
            />
            <span>Sebutkan Username</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={settings.playLocal}
              onChange={() => handleToggle("playLocal")}
              className="rounded bg-slate-950 border-slate-800 text-indigo-500 w-3.5 h-3.5 focus:ring-0"
            />
            <span>Putar TTS di Dashboard</span>
          </label>
        </div>
      </div>

      {/* Test voice action area */}
      <div className="mt-auto space-y-2 pt-2">
        <input
          type="text"
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 text-slate-400 p-2 text-xs rounded-lg focus:outline-none"
          placeholder="Test speech text..."
        />
        <button
          onClick={handleTestVoice}
          className="w-full py-2.5 bg-slate-800 hover:bg-indigo-600 hover:text-white text-xs font-bold text-slate-300 rounded-xl border border-slate-700 uppercase tracking-widest transition duration-150 cursor-pointer flex items-center justify-center gap-2"
        >
          <Play className="w-3.5 h-3.5" />
          Test Voice Output
        </button>
      </div>
    </div>
  );
}

interface SafetySettingsCardProps {
  settings: SpeechSettings;
  onChangeSettings: (newSettings: SpeechSettings) => void;
}

export function SafetySettingsCard({ settings, onChangeSettings }: SafetySettingsCardProps) {
  const [newKeyword, setNewKeyword] = useState("");

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !settings.ignoredKeywords.includes(newKeyword.trim())) {
      const updated = [...settings.ignoredKeywords, newKeyword.trim()];
      onChangeSettings({
        ...settings,
        ignoredKeywords: updated,
      });
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    const updated = settings.ignoredKeywords.filter((k) => k !== keywordToRemove);
    onChangeSettings({
      ...settings,
      ignoredKeywords: updated,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
        <Shield className="w-4 h-4 text-emerald-400" />
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Auto-Moderation</h2>
      </div>

      {/* Safety stats badging */}
      <div className="flex flex-wrap gap-1.5">
        <span className="px-2.5 py-1 bg-slate-950 text-[10px] rounded-md border border-slate-850 text-slate-500 font-semibold">
          Banned: {settings.ignoredKeywords.length}
        </span>
        <span className="px-2.5 py-1 bg-emerald-500/10 text-[10px] rounded-md border border-emerald-500/20 text-emerald-400 font-semibold">
          Spam Filter: ON
        </span>
        <span className="px-2.5 py-1 bg-slate-950 text-[10px] rounded-md border border-slate-850 text-slate-500 font-semibold">
          Min. Length: {settings.minMessageLength} char
        </span>
        <span className="px-2.5 py-1 bg-indigo-500/10 text-[10px] rounded-md border border-indigo-500/20 text-indigo-400 font-semibold">
          Safe Mode Active
        </span>
      </div>

      <div className="space-y-3 flex-grow">
        {/* Characters Minimum Length */}
        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/30 p-2 rounded-xl border border-slate-850">
          <span>Min. Message Length (Character)</span>
          <input
            type="number"
            min="0"
            max="100"
            value={settings.minMessageLength}
            onChange={(e) => onChangeSettings({ ...settings, minMessageLength: parseInt(e.target.value) || 0 })}
            className="w-12 bg-slate-950 border border-slate-800 rounded text-center font-mono text-xs text-indigo-400 py-0.5 focus:outline-none"
          />
        </div>

        {/* Forbidden keyword filters input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Block Word / Anti Spam</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Suku kata dilarang..."
              onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleAddKeyword}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 text-xs font-semibold cursor-pointer shrink-0"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto">
            {settings.ignoredKeywords.length === 0 && (
              <span className="text-[10px] text-slate-600 italic">No blocklists configured yet.</span>
            )}
            {settings.ignoredKeywords.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1 bg-pink-950/40 text-pink-300 border border-pink-900/20 text-[10px] font-mono rounded-full px-2 py-0.5"
              >
                {word}
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(word)}
                  className="hover:text-white font-bold cursor-pointer"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase pt-2 border-t border-slate-850">
        <span>Filtering delay: 0.2ms</span>
        <span className="text-emerald-400 font-normal">Real-Time</span>
      </div>
    </div>
  );
}
