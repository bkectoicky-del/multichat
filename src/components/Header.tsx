import React from "react";
import { Radio, ExternalLink, Headphones, Volume2, Shield, Trash2, Copy, Check } from "lucide-react";

interface HeaderProps {
  isConnected: boolean;
  activeClients: number;
  overlayUrl: string;
  isSpeaking: boolean;
  currentSpokenText?: string;
  onClearHistory: () => void;
}

export default function Header({
  isConnected,
  activeClients,
  overlayUrl,
  isSpeaking,
  currentSpokenText,
  onClearHistory,
}: HeaderProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
      {/* Brand Profile Title with Bento Look */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Headphones className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
            OmniStream <span className="text-indigo-400">TTS</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium">
            Ubah live chat YouTube, TikTok, dan Facebook menjadi suara secara real-time
          </p>
        </div>
      </div>

      {/* Connection Widgets & Actions */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Dynamic status badges */}
        <div className="flex items-center gap-4 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-red-500"}`}></div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            {isConnected ? "SYSTEM ACTIVE" : "SERVER DISCONNECTED"}
          </span>
        </div>

        {/* Clients Connected Tag */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
          <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
            {activeClients > 0 ? `${activeClients} OBS Live` : "0 OBS LINKED"}
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
