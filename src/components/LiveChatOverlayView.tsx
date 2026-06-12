import React, { useEffect, useState, useRef } from "react";
import { ChatMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";

export default function LiveChatOverlayView() {
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [params, setParams] = useState({
    fontSize: "18px",
    fontFamily: "font-sans",
    textColor: "#ffffff",
    authorColorMode: "platform",
    customAuthorColor: "#f43f5e",
    useTextShadow: true,
    hidePlatform: false,
    showAvatar: true,
    limit: 8,
    theme: "bubble",
    direction: "bottom-up",
    animate: "slice",
  });

  // Extract config parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      setParams({
        fontSize: search.get("fontSize") || "18px",
        fontFamily: search.get("fontFamily") || "font-sans",
        textColor: decodeURIComponent(search.get("textColor") || "#ffffff"),
        authorColorMode: search.get("authorColorMode") || "platform",
        customAuthorColor: decodeURIComponent(search.get("customAuthorColor") || "#f43f5e"),
        useTextShadow: search.get("useTextShadow") !== "false",
        hidePlatform: search.get("hidePlatform") === "true",
        showAvatar: search.get("showAvatar") !== "false",
        limit: parseInt(search.get("limit") || "8", 10),
        theme: search.get("theme") || "bubble",
        direction: search.get("direction") || "bottom-up",
        animate: search.get("animate") || "slice",
      });
    }
  }, []);

  // Connect to the backend streaming events
  useEffect(() => {
    // Determine API URL prefix based on host origin
    const apiBase = typeof window !== "undefined" ? window.location.origin : "";
    console.log("[OBS Overlay] Initializing connection to:", `${apiBase}/api/chat/events`);
    
    const sse = new EventSource(`${apiBase}/api/chat/events`);

    sse.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        if (raw.type === "chat") {
          const newMsg: ChatMessage = raw.data;
          
          setChats((prev) => {
            let updated = [...prev, newMsg];
            // Sort or limit depending on limit configuration
            if (updated.length > params.limit) {
              updated = updated.slice(-params.limit);
            }
            return updated;
          });
        }
      } catch (err) {
        console.error("[OBS Overlay] Failed to parse message event:", err);
      }
    };

    sse.onerror = (err) => {
      console.warn("[OBS Overlay] SSE connection warning, retrying...", err);
    };

    return () => {
      sse.close();
    };
  }, [params.limit]);

  // CSS Font Helper Mapping
  const getFontFamilyClass = (f: string) => {
    if (f === "font-mono") return "font-mono";
    if (f === "font-serif") return "font-serif font-medium";
    if (f === "font-grotesk") return "font-sans tracking-tight font-extrabold";
    return "font-sans";
  };

  // Entry animation parameters
  const getAnimationVariants = () => {
    if (params.animate === "none") {
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    }
    if (params.animate === "fade") {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.35 },
      };
    }
    // Default or "slice" - sliding beautifully from right side
    return {
      initial: { opacity: 0, x: 35, scale: 0.94 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, y: -10, scale: 0.95 },
      transition: { type: "spring", damping: 14, stiffness: 120 },
    };
  };

  const fontClass = getFontFamilyClass(params.fontFamily);
  const textShadowStyle = params.useTextShadow 
    ? { textShadow: "1.5px 1.5px 2.5px rgba(0,0,0,0.95), -1.5px -1.5px 2.5px rgba(0,0,0,0.95), 0 0 5px rgba(0,0,0,0.85)" } 
    : {};

  const orderOfChats = params.direction === "top-down" ? [...chats].reverse() : chats;

  return (
    <div 
      className={`min-h-screen w-full bg-transparent p-4 flex flex-col justify-end overflow-hidden ${fontClass} select-none`}
      style={{ overflow: "hidden", pointerEvents: "none" }}
    >
      {/* Outer wrapper to force bottom-alignment or top-alignment */}
      <div 
        className={`w-full flex flex-col gap-3.5 max-w-xl mx-auto ${
          params.direction === "top-down" ? "justify-start my-auto" : "justify-end mt-auto"
        }`}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {orderOfChats.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              className="text-center py-6 text-slate-300 font-bold tracking-widest text-[11px] uppercase border border-dashed border-white/10 rounded-xl"
            >
              ⌨️ AWAITING STREAM CHAT EVENTS...
            </motion.div>
          ) : (
            orderOfChats.map((msg) => {
              let badgeColor = "bg-slate-800 text-slate-300";
              let badgeLabel = "💬 Live";
              let nameColor = params.customAuthorColor;

              if (params.authorColorMode === "platform") {
                if (msg.platform === "youtube") {
                  badgeColor = "bg-red-500/20 text-red-300 border border-red-500/10";
                  badgeLabel = "YT";
                  nameColor = "#f87171"; // Red
                } else if (msg.platform === "tiktok") {
                  badgeColor = "bg-pink-500/20 text-pink-300 border border-pink-500/10";
                  badgeLabel = "TK";
                  nameColor = "#f472b6"; // Pink
                } else if (msg.platform === "facebook") {
                  badgeColor = "bg-blue-500/20 text-blue-300 border border-blue-500/10";
                  badgeLabel = "FB";
                  nameColor = "#38bdf8"; // Sky
                }
              }

              return (
                <motion.div
                  key={msg.id}
                  layout
                  {...getAnimationVariants()}
                  className={`flex items-start gap-3 transition duration-155 rounded-xl leading-relaxed ${
                    params.theme === "bubble" ? "bg-slate-950/85 p-3 px-4 border border-white/[0.04] shadow-md max-w-[95%] backdrop-blur-sm" : 
                    params.theme === "card" ? "bg-slate-950/50 p-2.5 border border-white/[0.08]" : "p-0.5"
                  }`}
                  style={{ pointerEvents: "none" }}
                >
                  {/* Photo profile avatar source widget */}
                  {params.showAvatar && (
                    <div className="shrink-0">
                      {msg.avatar ? (
                        <img
                          src={msg.avatar}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full border border-white/10 object-cover shadow"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
                          {msg.author[0]}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Platform label representation details */}
                      {!params.hidePlatform && (
                        <span className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded uppercase shrink-0 ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                      )}

                      {/* Username label rendering */}
                      <span 
                        style={{ color: nameColor, ...textShadowStyle }} 
                        className="font-extrabold text-[12.5px] tracking-wide"
                      >
                        {msg.author}
                      </span>
                    </div>

                    {/* Comment text parsing render */}
                    <p 
                      style={{ 
                        color: params.textColor, 
                        fontSize: params.fontSize, 
                        ...textShadowStyle 
                      }} 
                      className="mt-0.5 whitespace-pre-wrap leading-relaxed font-semibold break-all"
                    >
                      {msg.message}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
