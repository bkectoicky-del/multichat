import React, { useRef, useEffect, useState } from "react";
import { ChatMessage } from "../types";
import { MessageSquare, Play, Bot, Maximize2, Minimize2, ArrowDown, Sparkles } from "lucide-react";

interface LiveChatFeedCardProps {
  chatHistory: ChatMessage[];
  onPlaySingleSpeech: (msg: ChatMessage) => void;
}

export default function LiveChatFeedCard({ chatHistory, onPlaySingleSpeech }: LiveChatFeedCardProps) {
  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const [autoScroll, setAutoScroll] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Take only the last 30 messages to avoid cluttering the DOM, but keep them scrollable
  const displayedChats = chatHistory.slice(-30);

  // Scroll to bottom dynamically as real-time messages arrive
  useEffect(() => {
    if (autoScroll && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [displayedChats, autoScroll]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      // If the scroll is within 60px of the bottom, keep autoScroll active
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;
      if (isAtBottom && !autoScroll) {
        setAutoScroll(true);
      } else if (!isAtBottom && autoScroll) {
         // User scrolled up manually
         setAutoScroll(false);
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Outer container css layout based on fullscreen mode
  const containerClasses = isFullscreen
    ? "fixed inset-0 z-[100] bg-slate-950 p-6 flex flex-col w-full h-full"
    : "bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-xl overflow-hidden h-[500px]";

  return (
    <div className={containerClasses}>
      {/* Header Bar */}
      <div className="p-4 px-5 border-b border-slate-850 bg-slate-900/60 flex items-center justify-between">
        <span className="text-slate-200 font-bold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          Live Chat Feed (30 Terakhir)
          {isFullscreen && (
            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] rounded border border-indigo-500/30 uppercase font-mono font-bold animate-pulse">
              Fullscreen Mode
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
          {/* Active status indicator badge */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 px-2.5 py-1 rounded-lg border border-slate-850">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-slate-500 text-xs font-mono">
              {chatHistory.length}
            </span>
          </div>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Chat Feed"}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-indigo-400 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Minimize</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main chat window feed section with relative position for the floating pill */}
      <div className="relative flex-grow flex flex-col min-h-0">
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="p-4 flex-grow overflow-y-auto bg-slate-950/20 font-sans space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent min-h-0"
        >
          {displayedChats.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-slate-400 shadow-md">
                <Bot className="w-10 h-10 text-indigo-400 mx-auto animate-pulse" />
              </div>
              <div>
                <p className="text-slate-350 font-bold text-sm">Menunggu komentar masuk...</p>
                <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
                  Kanal konektor telah aktif. Jalankan script browser atau koneksikan langsung stream Anda untuk memantau chat.
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
                platformLabel = "⚙️ Sistem";
                authorColor = "text-purple-400";
              }

              return (
                <div
                  key={msg.id}
                  className="flex items-start justify-between gap-3 p-3 bg-slate-900 hover:bg-slate-850/80 border border-slate-800/85 rounded-xl transition duration-155 animate-fade-in group shadow-sm"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Badge */}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 select-none ${platformBadgeColor}`}>
                      {platformLabel}
                    </span>
                    
                    {/* Message body */}
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`${authorColor} font-bold text-xs truncate max-w-[150px]`}>
                          {msg.author}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 break-words leading-relaxed font-sans">
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

        {/* Auto-scroll suspended floating pill */}
        {!autoScroll && displayedChats.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
            <button
              onClick={() => {
                setAutoScroll(true);
                if (feedEndRef.current) {
                  feedEndRef.current.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs py-1.5 px-4 rounded-full border border-indigo-550/60 shadow-xl flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all text-center whitespace-nowrap"
            >
              <ArrowDown className="w-3.5 h-3.5 text-indigo-300" />
              Resume Auto Scroll
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
