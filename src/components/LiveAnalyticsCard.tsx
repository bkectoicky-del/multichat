import React, { useMemo } from "react";
import { ChatMessage } from "../types";
import { BarChart3, TrendingUp, Users, Radio, ShieldCheck } from "lucide-react";

interface LiveAnalyticsCardProps {
  chatHistory: ChatMessage[];
  activeClients: number;
  isSpeaking: boolean;
}

export default function LiveAnalyticsCard({ chatHistory, activeClients, isSpeaking }: LiveAnalyticsCardProps) {
  // Compute analytics dynamically
  const stats = useMemo(() => {
    let ytCount = 0;
    let ttCount = 0;
    let fbCount = 0;
    let simCount = 0;

    chatHistory.forEach((msg) => {
      if (msg.platform === "youtube") ytCount++;
      else if (msg.platform === "tiktok") ttCount++;
      else if (msg.platform === "facebook") fbCount++;
      else simCount++;
    });

    const total = chatHistory.length || 1;
    return {
      ytPercent: Math.round((ytCount / total) * 100),
      ttPercent: Math.round((ttCount / total) * 100),
      fbPercent: Math.round((fbCount / total) * 100),
      simPercent: Math.round((simCount / total) * 100),
      totalMessages: chatHistory.length,
    };
  }, [chatHistory]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-pink-400" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Live Analytics</h2>
        </div>
        <span className="flex items-center gap-1 text-[10px] bg-indigo-500/15 text-indigo-300 font-mono px-2 py-0.5 rounded-full uppercase">
          <TrendingUp className="w-3 h-3 text-indigo-400" />
          Dynamic
        </span>
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Scanned</p>
          <p className="text-2xl font-mono font-bold text-white mt-1">
            {stats.totalMessages}
          </p>
          <span className="text-[9px] text-slate-500">Live comments</span>
        </div>

        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Connections</p>
          <p className="text-2xl font-mono font-bold text-indigo-400 mt-1">
            {activeClients}
          </p>
          <span className="text-[9px] text-slate-500">Active OBS sources</span>
        </div>
      </div>

      {/* Graphical amplitude bars */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Engine Status</span>
          <span className={isSpeaking ? "text-pink-500 animate-pulse font-normal" : "text-slate-400 font-normal"}>
            {isSpeaking ? "SPEAKING LIVE" : "IDLE"}
          </span>
        </label>
        
        {/* Animated simulation of frequency equalizer */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 h-14 flex items-end justify-between gap-1.5 overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => {
            // Give different standard animation delay/height to bars
            const heights = [
              "h-2", "h-5", "h-3", "h-8", "h-4", "h-10", "h-6", "h-12", "h-5",
               "h-9", "h-7", "h-11", "h-4", "h-8", "h-3", "h-6", "h-2", "h-4"
            ];
            
            return (
              <div
                key={i}
                className={`w-full ${heights[i % heights.length]} rounded-t transition-all duration-300 ${
                  isSpeaking
                    ? "bg-gradient-to-t from-indigo-500 to-pink-500 animate-[pulse_0.6s_infinite_alternate]"
                    : "bg-slate-800"
                }`}
                style={{
                  animationDelay: isSpeaking ? `${i * 45}ms` : "0ms"
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Platform connections volume bar chart elements */}
      <div className="space-y-2 flex-grow">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Platform Share</label>
        
        <div className="space-y-2 bg-slate-950/20 p-3 rounded-xl border border-slate-850 text-[10px]">
          {/* TikTok */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-400 font-medium">
              <span>🎵 TikTok</span>
              <span>{stats.ttPercent || 0}%</span>
            </div>
            <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
              <div className="h-full bg-pink-500" style={{ width: `${stats.ttPercent || 0}%` }}></div>
            </div>
          </div>

          {/* YouTube */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-400 font-medium">
              <span>📺 YouTube</span>
              <span>{stats.ytPercent || 0}%</span>
            </div>
            <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${stats.ytPercent || 0}%` }}></div>
            </div>
          </div>

          {/* Facebook */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-400 font-medium">
              <span>👥 Facebook</span>
              <span>{stats.fbPercent || 0}%</span>
            </div>
            <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${stats.fbPercent || 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between text-[9px] text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Filter: Active
        </span>
        <span>Stream-Secure V2</span>
      </div>
    </div>
  );
}
