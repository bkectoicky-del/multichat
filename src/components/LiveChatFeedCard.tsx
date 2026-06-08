import React, { useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { MessageSquare, Play, Bot, Headphones } from "lucide-react";

interface LiveChatFeedCardProps {
  chatHistory: ChatMessage[];
  onPlaySingleSpeech: (msg: ChatMessage) => void;
}

export default function LiveChatFeedCard({ chatHistory, onPlaySingleSpeech }: LiveChatFeedCardProps) {
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  // Take only the last 30 messages to avoid cluttering the DOM, but keep them scrollable
  const displayedChats = chatHistory.slice(-30);

  // Scroll to bottom dynamically as real-time messages arrive
  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayedChats]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-xl overflow-hidden h-[500px]">
      {/* Header Bar */}
      <div className="p-4 px-5 border-b border-slate-850 bg-slate-900/60 flex items-center justify-between">
        <span className="text-slate-200 font-bold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          Live Chat Feed (30 Terakhir)
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-slate-500 text-xs font-mono">
            {chatHistory.length} messages
          </span>
        </div>
      </div>

      {/* Main chat window feed */}
      <div className="p-4 flex-grow overflow-y-auto bg-slate-950/20 font-sans space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {displayedChats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-slate-400 shadow-md">
              <Bot className="w-10 h-10 text-indigo-400 mx-auto animate-pulse" />
            </div>
            <div>
              <p className="text-slate-350 font-bold text-sm">Menunggu komentar masuk...</p>
              <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
                Kanal konektor telah aktif. Jalankan script browser atau gunakan simulator pesan untuk pengujian.
              </p>
            </div>
          </div>
        ) : (
          displayedChats.map((msg) => {
            let platformBadgeColor = "bg-slate-800 text-slate-300";
            let platformLabel = "💬 Info";
            let authorColor = "text-indigo-400";
            
            if (msg.platform === "youtube") {
              platformBadgeColor = "bg-red-950/60 text-red-300 border border-red-900/20";
              platformLabel = "📺 YouTube";
              authorColor = "text-red-400";
            } else if (msg.platform === "tiktok") {
              platformBadgeColor = "bg-pink-955/60 text-pink-300 border border-pink-900/20";
              platformLabel = "🎵 TikTok";
              authorColor = "text-pink-400";
            } else if (msg.platform === "facebook") {
              platformBadgeColor = "bg-blue-955/60 text-blue-300 border border-blue-900/20";
              platformLabel = "👥 Facebook";
              authorColor = "text-sky-400";
            } else {
              platformBadgeColor = "bg-purple-955/60 text-purple-300 border border-purple-900/20";
              platformLabel = "⚙️ Simulasi";
              authorColor = "text-purple-400";
            }

            return (
              <div
                key={msg.id}
                className="flex items-start justify-between gap-3 p-3 bg-slate-900 hover:bg-slate-850/80 border border-slate-800/85 rounded-xl transition duration-150 animate-fade-in group shadow-sm"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {/* Badge */}
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 select-none ${platformBadgeColor}`}>
                    {platformLabel}
                  </span>
                  
                  {/* Message body */}
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={`${authorColor} font-bold text-xs truncate max-w-[120px]`}>
                        {msg.author}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1 break-words leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                </div>

                {/* Instant Speech Trigger */}
                <button
                  onClick={() => onPlaySingleSpeech(msg)}
                  className="p-1 px-2.5 rounded-lg bg-slate-950 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1 text-[10px] shrink-0 self-center"
                >
                  <Play className="w-3 h-3 text-indigo-400 group-hover:text-white" />
                  Speak
                </button>
              </div>
            );
          })
        )}
        <div ref={feedEndRef} />
      </div>
    </div>
  );
}
