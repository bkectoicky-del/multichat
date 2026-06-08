import React, { useState } from "react";
import { Video, Bot, Flame, Hash, HelpCircle, Code, Radio } from "lucide-react";
import { generateBookmarkletCode } from "../utils";

interface SourcePlatformCardProps {
  appUrl: string;
  activeYoutubeVideoId: string | null;
  onStartYoutubePoll: (videoId: string) => void;
  onStopYoutubePoll: () => void;
  onSimulateMessage: (author: string, message: string, platform: "tiktok" | "youtube" | "facebook" | "simulation") => void;
}

export default function SourcePlatformCard({
  appUrl,
  activeYoutubeVideoId,
  onStartYoutubePoll,
  onStopYoutubePoll,
  onSimulateMessage,
}: SourcePlatformCardProps) {
  const [ytInput, setYtInput] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("@streaming_pro");
  const [facebookPageId, setFacebookPageId] = useState("page_live_12");
  
  // Simulation states
  const [simName, setSimName] = useState("Siska");
  const [simText, setSimText] = useState("Bang, sapa aku dong!");
  const [simPlatform, setSimPlatform] = useState<"tiktok" | "youtube" | "facebook">("tiktok");

  const [copiedScript, setCopiedScript] = useState(false);

  const handleYtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ytInput.trim()) {
      let videoId = ytInput.trim();
      try {
        if (videoId.includes("youtube.com") || videoId.includes("youtu.be")) {
          const url = new URL(videoId);
          if (url.searchParams.has("v")) {
            videoId = url.searchParams.get("v") || videoId;
          } else {
            const paths = url.pathname.split("/");
            videoId = paths[paths.length - 1] || videoId;
          }
        }
      } catch (err) {}
      onStartYoutubePoll(videoId);
    }
  };

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (simName.trim() && simText.trim()) {
      onSimulateMessage(simName.trim(), simText.trim(), simPlatform);
      setSimText("");
    }
  };

  // Connect-code generator
  const bookmarkletCode = generateBookmarkletCode(appUrl);
  const handleCopyConsoleCode = () => {
    const unescaped = decodeURIComponent(bookmarkletCode.replace(/^javascript:/, ""));
    navigator.clipboard.writeText(unescaped);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5 shadow-xl h-full">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
        <Radio className="w-4 h-4 text-indigo-400" />
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Source Platforms</h2>
      </div>

      <div className="space-y-4">
        {/* TikTok input field */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">TikTok Username</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-pink-500 font-bold font-mono text-xs">T</span>
            </div>
            <input
              type="text"
              placeholder="@username"
              value={tiktokUsername}
              onChange={(e) => setTiktokUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-8 pr-4 text-xs font-medium text-slate-200 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
        </div>

        {/* YouTube Input field & Control trigger */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">YouTube Live ID</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-red-500 font-bold font-mono text-xs">Y</span>
            </div>
            <input
              type="text"
              placeholder="Video ID or watch URL"
              value={ytInput}
              onChange={(e) => setYtInput(e.target.value)}
              disabled={!!activeYoutubeVideoId}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-8 pr-4 text-xs font-medium text-slate-200 focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>
          {/* Active status or Action Trigger for YouTube poller */}
          <div className="mt-1">
            {!activeYoutubeVideoId ? (
              <button
                type="button"
                onClick={handleYtSubmit}
                className="w-full py-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white transition duration-150 rounded-lg text-[10px] font-semibold border border-red-500/20"
              >
                Start Automated Server Polling
              </button>
            ) : (
              <div className="flex items-center gap-2 justify-between bg-red-950/20 p-2 rounded-lg border border-red-900/30">
                <span className="text-[10px] text-red-300 font-medium truncate">Active Video: {activeYoutubeVideoId}</span>
                <button
                  onClick={onStopYoutubePoll}
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[9px] uppercase"
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Facebook input field */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Facebook Page ID</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-blue-500 font-bold font-mono text-xs">F</span>
            </div>
            <input
              type="text"
              placeholder="Page ID"
              value={facebookPageId}
              onChange={(e) => setFacebookPageId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-8 pr-4 text-xs font-medium text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Integration helper block */}
      <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tight">Kanal Linker</span>
          <button
            onClick={handleCopyConsoleCode}
            className="text-[9px] font-bold text-indigo-300 hover:text-white bg-indigo-500/20 px-2 py-0.5 rounded transition"
          >
            {copiedScript ? "Script Copied!" : "Copy Script"}
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-indigo-300 opacity-80">
          Untuk TikTok & Facebook: Klik "Copy Script" lalu paste-kan di Developer Console (F12) browser dashboard penyiaran Anda.
        </p>
      </div>

      {/* Mini Interactive Simulator Built in */}
      <div className="mt-auto border-t border-slate-850 pt-4 space-y-3">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          Live Comment Simulator
        </label>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <input
            type="text"
            placeholder="Name"
            value={simName}
            onChange={(e) => setSimName(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg text-[11px] focus:outline-none"
          />
          <select
            value={simPlatform}
            onChange={(e) => setSimPlatform(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 p-2 rounded-lg text-[11px] cursor-pointer focus:outline-none"
          >
            <option value="tiktok">🎵 TikTok</option>
            <option value="youtube">📺 Youtube</option>
            <option value="facebook">👥 Facebook</option>
          </select>
        </div>
        
        <input
          type="text"
          placeholder="Komentar simulasi..."
          value={simText}
          onChange={(e) => setSimText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSimulateSubmit(e)}
          className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded-lg text-[11px] focus:outline-none"
        />

        <button
          onClick={handleSimulateSubmit}
          className="w-full py-2 bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-650 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 text-orange-300" />
          Kirim & Bunyikan Chat
        </button>
      </div>
    </div>
  );
}
