import React from "react";
import { Headphones, Volume2, Trash2 } from "lucide-react";

interface HeaderProps {
  isConnected: boolean;
  isSpeaking: boolean;
  currentSpokenText?: string;
  onClearHistory: () => void;
  playLocal: boolean;
  onTogglePlayLocal: () => void;
}

export default function Header({
  isConnected,
  isSpeaking,
  currentSpokenText,
  onClearHistory,
  playLocal,
  onTogglePlayLocal,
}: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
      {/* Brand Profile Title with Bento Look */}
      <div className="flex items-center gap-3 font-sans">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Headphones className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            OmniStream <span className="text-indigo-400">TTS</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium">
            Ubah live chat YouTube, TikTok, dan Facebook menjadi suara secara real-time
          </p>
        </div>
      </div>

      {/* Connection Widgets & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Master Auto-TTS Toggle Switch */}
        <button
          onClick={onTogglePlayLocal}
          id="btn-master-tts"
          title={playLocal ? "Matikan Auto-TTS" : "Hidupkan Auto-TTS"}
          className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
            playLocal
              ? "bg-emerald-600/90 hover:bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <Volume2 className={`w-3.5 h-3.5 ${playLocal ? "animate-pulse text-white" : "opacity-50"}`} />
          Auto-TTS: {playLocal ? "ON (Membaca)" : "OFF (Hening)"}
        </button>

        {/* Dynamic status badges */}
        <div className="flex items-center gap-3 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-red-500"}`}></div>
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
            {isConnected ? "SYSTEM ACTIVE" : "SERVER DISCONNECTED"}
          </span>
        </div>

        {/* Clear feedback button */}
        <button
          onClick={onClearHistory}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Chat
        </button>
      </div>
    </header>
  );
}
