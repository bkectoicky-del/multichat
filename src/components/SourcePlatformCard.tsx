import React, { useState } from "react";
import { Video, Bot, Flame, Hash, HelpCircle, Code, Radio } from "lucide-react";
import { generateBookmarkletCode } from "../utils";

interface SourcePlatformCardProps {
  appUrl: string;
  activeYoutubeVideoId: string | null;
  onStartYoutubePoll: (videoId: string) => void;
  onStopYoutubePoll: () => void;
  
  tiktokUsername: string;
  setTiktokUsername: (val: string) => void;
  isTiktokConnected: boolean;
  isTiktokConnecting: boolean;
  onConnectTiktok: () => void;
  onDisconnectTiktok: () => void;

  facebookPageId: string;
  setFacebookPageId: (val: string) => void;
  isFacebookConnected: boolean;
  isFacebookConnecting: boolean;
  onConnectFacebook: () => void;
  onDisconnectFacebook: () => void;

  onSimulateMessage: (author: string, message: string, platform: "tiktok" | "youtube" | "facebook" | "simulation") => void;
}

export default function SourcePlatformCard({
  appUrl,
  activeYoutubeVideoId,
  onStartYoutubePoll,
  onStopYoutubePoll,
  
  tiktokUsername,
  setTiktokUsername,
  isTiktokConnected,
  isTiktokConnecting,
  onConnectTiktok,
  onDisconnectTiktok,

  facebookPageId,
  setFacebookPageId,
  isFacebookConnected,
  isFacebookConnecting,
  onConnectFacebook,
  onDisconnectFacebook,

  onSimulateMessage,
}: SourcePlatformCardProps) {
  const [ytInput, setYtInput] = useState("");
  
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
        {/* TikTok Platform Card Block */}
        <div className="space-y-4 p-4 bg-slate-950/40 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 bg-pink-500/10 rounded flex items-center justify-center text-pink-500 font-bold font-mono text-xs animate-pulse">T</span>
              TikTok Live Chat
            </label>
            {isTiktokConnected ? (
              <span className="text-[9.5px] font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_6px_#10b981]"></span>
                Connected
              </span>
            ) : isTiktokConnecting ? (
              <span className="text-[9.5px] font-bold text-pink-400 flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                Connecting...
              </span>
            ) : (
              <span className="text-[9.5px] font-semibold text-slate-500 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-full uppercase tracking-widest">Offline</span>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">TikTok Username</label>
            <input
              type="text"
              placeholder="@username"
              value={tiktokUsername}
              onChange={(e) => setTiktokUsername(e.target.value)}
              disabled={isTiktokConnected || isTiktokConnecting}
              className="w-full bg-slate-950 border border-slate-800 disabled:opacity-60 rounded-xl py-2 px-3 text-xs font-medium text-slate-200 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
          <div>
            {isTiktokConnected ? (
              <button
                type="button"
                onClick={onDisconnectTiktok}
                className="w-full py-2 bg-pink-950/20 hover:bg-pink-950/40 text-pink-400 font-bold tracking-wide rounded-lg text-xs uppercase border border-pink-900/30 transition duration-150 cursor-pointer"
              >
                Disconnect From TikTok
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectTiktok}
                disabled={isTiktokConnecting}
                className="w-full py-2 bg-pink-600 hover:bg-pink-550 disabled:opacity-50 text-white font-bold tracking-wide rounded-lg text-xs uppercase shadow-lg shadow-pink-500/10 transition duration-150 cursor-pointer"
              >
                {isTiktokConnecting ? "Connecting to TikTok..." : "Start Connection"}
              </button>
            )}
          </div>
        </div>

        {/* YouTube Platform Card Block */}
        <div className="space-y-4 p-4 bg-slate-950/40 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 bg-red-500/10 rounded flex items-center justify-center text-red-500 font-bold font-mono text-xs animate-pulse">Y</span>
              YouTube Live Chat
            </label>
            {!!activeYoutubeVideoId ? (
              <span className="text-[9.5px] font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_6px_#10b981]"></span>
                Live Polling
              </span>
            ) : (
              <span className="text-[9.5px] font-semibold text-slate-500 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-full uppercase tracking-widest">Offline</span>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">YouTube Live ID or URL</label>
            <input
              type="text"
              placeholder="v=Video ID or Watch URL"
              value={ytInput}
              onChange={(e) => setYtInput(e.target.value)}
              disabled={!!activeYoutubeVideoId}
              className="w-full bg-slate-950 border border-slate-800 disabled:opacity-60 rounded-xl py-2 px-3 text-xs font-medium text-slate-200 focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>
          <div>
            {!!activeYoutubeVideoId ? (
              <button
                type="button"
                onClick={onStopYoutubePoll}
                className="w-full py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 font-bold tracking-wide rounded-lg text-xs uppercase border border-red-900/30 transition duration-150 cursor-pointer"
              >
                Disconnect From YouTube
              </button>
            ) : (
              <button
                type="button"
                onClick={handleYtSubmit}
                className="w-full py-2 bg-red-650 hover:bg-red-500 text-white font-bold tracking-wide rounded-lg text-xs uppercase shadow-lg shadow-red-500/10 transition duration-150 cursor-pointer"
              >
                Start Connection (Auto Poll)
              </button>
            )}
          </div>
        </div>

        {/* Facebook Platform Card Block */}
        <div className="space-y-4 p-4 bg-slate-950/40 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 bg-blue-500/10 rounded flex items-center justify-center text-blue-500 font-bold font-mono text-xs animate-pulse">F</span>
              Facebook Live Chat
            </label>
            {isFacebookConnected ? (
              <span className="text-[9.5px] font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_6px_#10b981]"></span>
                Connected
              </span>
            ) : isFacebookConnecting ? (
              <span className="text-[9.5px] font-bold text-blue-400 flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                Connecting...
              </span>
            ) : (
              <span className="text-[9.5px] font-semibold text-slate-500 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-full uppercase tracking-widest">Offline</span>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Facebook Page ID</label>
            <input
              type="text"
              placeholder="Page ID"
              value={facebookPageId}
              onChange={(e) => setFacebookPageId(e.target.value)}
              disabled={isFacebookConnected || isFacebookConnecting}
              className="w-full bg-slate-950 border border-slate-800 disabled:opacity-60 rounded-xl py-2 px-3 text-xs font-medium text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <div>
            {isFacebookConnected ? (
              <button
                type="button"
                onClick={onDisconnectFacebook}
                className="w-full py-2 bg-blue-950/20 hover:bg-blue-950/40 text-blue-450 font-bold tracking-wide rounded-lg text-xs uppercase border border-blue-900/30 transition duration-150 cursor-pointer"
              >
                Disconnect From Facebook
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectFacebook}
                disabled={isFacebookConnecting}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold tracking-wide rounded-lg text-xs uppercase shadow-lg shadow-blue-500/10 transition duration-150 cursor-pointer"
              >
                {isFacebookConnecting ? "Connecting to Facebook..." : "Start Connection"}
              </button>
            )}
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
