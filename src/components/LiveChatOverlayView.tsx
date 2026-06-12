import React, { useEffect, useState, useRef } from "react";
import { ChatMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";

export default function LiveChatOverlayView() {
  const [chats, setChats] = useState<ChatMessage[]>([]);

  // Synchronously initialize params from URL parameters on first execution
  const [params] = useState(() => {
    let initialParams = {
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
      animate: "slide-left",
      playTts: false,
      animDuration: 0.40,
    };

    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      initialParams = {
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
        animate: search.get("animate") || "slide-left",
        playTts: search.get("playTts") === "true",
        animDuration: parseFloat(search.get("animDuration") || "0.40"),
      };
    }
    return initialParams;
  });

  // Use a Ref to hold volatile values so that SSE listener doesn't need to rebuild or restart
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // Fetch initial chat history on mount to instantly populate the OBS Browser Source HUD
  useEffect(() => {
    const apiBase = typeof window !== "undefined" ? window.location.origin : "";
    fetch(`${apiBase}/api/chat/history`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.history && Array.isArray(data.history)) {
          // Keep only the latest according to specified limits
          setChats(data.history.slice(-paramsRef.current.limit));
        }
      })
      .catch((err) => console.error("[OBS Overlay] Error loading history:", err));
  }, []);

  // Connect to the backend streaming SSE events
  useEffect(() => {
    const apiBase = typeof window !== "undefined" ? window.location.origin : "";
    console.log("[OBS Overlay] Persistent SSE Connection established to:", `${apiBase}/api/chat/events`);
    
    const sse = new EventSource(`${apiBase}/api/chat/events`);

    sse.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        
        // Skip system events
        if (raw.type === "connected" || raw.type === "stats") {
          return;
        }

        // Validate that it's a ChatMessage with author and message content
        if (raw && raw.author && raw.message) {
          const newMsg: ChatMessage = raw;
          
          setChats((prev) => {
            const updated = [...prev, newMsg];
            // Enforce sliding window limits of the config
            if (updated.length > paramsRef.current.limit) {
              return updated.slice(-paramsRef.current.limit);
            }
            return updated;
          });

          // Perform local speaking TTS inside OBS only if playTts query parameter is explicitly true
          if (paramsRef.current.playTts && typeof window !== "undefined" && window.speechSynthesis) {
            const utterText = `${newMsg.author} berkata ${newMsg.message}`;
            const utterance = new SpeechSynthesisUtterance(utterText);
            utterance.lang = "id-ID";
            // Find local Indonesian voice
            const voices = window.speechSynthesis.getVoices();
            const idVoice = voices.find((v) => {
              const l = v.lang.toLowerCase().replace("_", "-");
              return l === "id-id" || l === "id" || l.startsWith("id-");
            });
            if (idVoice) utterance.voice = idVoice;
            window.speechSynthesis.speak(utterance);
          }
        }
      } catch (err) {
        console.error("[OBS Overlay] Failed to parse message event:", err);
      }
    };

    sse.onerror = (err) => {
      console.warn("[OBS Overlay] SSE connection warning, automatically retrying...", err);
    };

    return () => {
      sse.close();
    };
  }, []); // Run exactly once on mount so that the connection is incredibly stable and persistent!

  // CSS Font Helper Mapping
  const getFontFamilyClass = (f: string) => {
    if (f === "font-mono") return "font-mono";
    if (f === "font-serif") return "font-serif font-medium";
    if (f === "font-grotesk") return "font-sans tracking-tight font-extrabold";
    return "font-sans";
  };

  // Advanced Entry, Layout, & Exit animations mimicking Social Stream Ninja configs
  const getAnimationVariants = () => {
    const anim = params.animate;
    const dur = params.animDuration || 0.40;
    
    if (anim === "none") {
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.05 }
      };
    }
    
    if (anim === "fade") {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: dur }
      };
    }

    if (anim === "slide-left") {
      // Slide from left to right
      return {
        initial: { opacity: 0, x: -80, scale: 0.95 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: -40, scale: 0.90, transition: { duration: dur * 0.7 } },
        transition: { type: "tween", ease: "easeOut", duration: dur }
      };
    }

    if (anim === "slide-right") {
      // Slide from right to left
      return {
        initial: { opacity: 0, x: 80, scale: 0.95 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: 40, scale: 0.90, transition: { duration: dur * 0.7 } },
        transition: { type: "tween", ease: "easeOut", duration: dur }
      };
    }

    if (anim === "slide-up") {
      // Slide meluncur vertically from bottom up
      return {
        initial: { opacity: 0, y: 55, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -45, scale: 0.90, transition: { duration: dur * 0.7 } },
        transition: { type: "tween", ease: "easeOut", duration: dur }
      };
    }

    if (anim === "zoom-pop") {
      // Pop zoom in bounce entry
      return {
        initial: { opacity: 0, scale: 0.35 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.65, y: -20, transition: { duration: dur * 0.7 } },
        transition: { type: "spring", damping: 14, stiffness: 155, duration: dur }
      };
    }

    // Default slide slice
    return {
      initial: { opacity: 0, x: 35, scale: 0.94 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: dur * 0.7 } },
      transition: { type: "tween", ease: "easeOut", duration: dur },
    };
  };

  const fontClass = getFontFamilyClass(params.fontFamily);
  
  // Custom enhanced text shadow to guarantee 100% legibility in OBS overlays
  const textShadowStyle = params.useTextShadow 
    ? { textShadow: "2px 2px 3px rgba(0,0,0,1), -2px -2px 3px rgba(0,0,0,1), 2px -2px 3px rgba(0,0,0,1), -2px 2px 3px rgba(0,0,0,1), 0 0 5px rgba(0,0,0,0.95)" } 
    : {};

  // Sort chats chronologically: Newest chat at bottom pushes up, or top falls down
  const orderOfChats = params.direction === "top-down" ? [...chats].reverse() : chats;

  // Render a specific theme's styles and classes
  const getThemeClass = (themeName: string, platform: string) => {
    switch (themeName) {
      case "transparent":
        // 100% transparent overlay with no borders or backgrounds whatsoever!
        return "bg-transparent p-1 max-w-full border-none shadow-none";

      case "glass":
        // Premium frosted glassmorphism style
        return "bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-3 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-[95%]";

      case "social-ninja":
        // Dynamic side-colored social stream ninja style
        if (platform === "youtube") {
          return "bg-gradient-to-r from-red-950/75 to-slate-900/40 border-l-4 border-red-500 rounded-lg p-3 px-4 shadow-lg max-w-[95%]";
        }
        if (platform === "tiktok") {
          return "bg-gradient-to-r from-pink-950/75 to-slate-900/40 border-l-4 border-pink-500 rounded-lg p-3 px-4 shadow-lg max-w-[95%]";
        }
        if (platform === "facebook") {
          return "bg-gradient-to-r from-blue-950/75 to-slate-900/40 border-l-4 border-blue-500 rounded-lg p-3 px-4 shadow-lg max-w-[95%]";
        }
        return "bg-gradient-to-r from-slate-900/80 to-slate-900/40 border-l-4 border-slate-500 rounded-lg p-3 px-4 shadow-lg max-w-[95%]";

      case "neon-glow":
        // Glowing futuristic neon border outline
        let neonBorderColor = "border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.35)]";
        if (platform === "youtube") neonBorderColor = "border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.35)]";
        if (platform === "tiktok") neonBorderColor = "border-pink-500 shadow-[0_0_12px_rgba(244,114,182,0.35)]";
        if (platform === "facebook") neonBorderColor = "border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.35)]";
        return `bg-black/95 border-[1.5px] ${neonBorderColor} rounded-xl p-3 px-4 max-w-[95%]`;

      case "side-border":
        // Minimalist side color accents
        let sideColor = "border-l-indigo-500";
        if (platform === "youtube") sideColor = "border-l-red-500";
        if (platform === "tiktok") sideColor = "border-l-pink-500";
        if (platform === "facebook") sideColor = "border-l-blue-450";
        return `bg-slate-950/95 border border-slate-900 border-l-[5px] ${sideColor} rounded-r-xl p-3 px-4 max-w-[95%] shadow-md`;

      case "card":
        // Modern thinbordered square cards
        return "bg-slate-950/60 p-3 border border-white/[0.08] rounded-xl max-w-[95%] shadow-sm";

      case "bubble":
      default:
        // Deep obsidian slate bubble background
        return "bg-slate-950/85 p-3.5 px-4.5 border border-white/[0.03] rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.6)] max-w-[95%] backdrop-blur-xs";
    }
  };

  return (
    <div 
      className={`min-h-screen w-full bg-transparent p-4 flex flex-col justify-end overflow-hidden ${fontClass} select-none`}
      style={{ overflow: "hidden", pointerEvents: "none" }}
    >
      {/* Complete and aggressive document background transparency overrides for OBS Studio */}
      <style>{`
        html, body, #root, #root > div {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>

      {/* Main outer Flex column to layout chats smoothly - aligned correctly to bottom or top */}
      <div 
        className={`w-full flex flex-col gap-3.5 max-w-xl mx-auto ${
          params.direction === "top-down" ? "justify-start my-auto" : "justify-end mt-auto"
        }`}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {orderOfChats.length === 0 ? (
            <motion.div
              key="overlay-awaiting-handshake"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              className="text-center py-6 text-slate-300 font-extrabold tracking-widest text-[11px] uppercase border border-dashed border-white/10 rounded-xl"
            >
              ⌨️ AWAITING LIVE CHAT MESSAGES...
            </motion.div>
          ) : (
            orderOfChats.map((msg) => {
              let badgeColor = "bg-slate-800 text-slate-300";
              let badgeLabel = "Live";
              let nameColor = params.customAuthorColor;

              if (params.authorColorMode === "platform") {
                if (msg.platform === "youtube") {
                  badgeColor = "bg-red-500/20 text-red-300 border border-red-500/10";
                  badgeLabel = "YT";
                  nameColor = "#f87171"; // Vibrant light red
                } else if (msg.platform === "tiktok") {
                  badgeColor = "bg-pink-500/20 text-pink-300 border border-pink-500/10";
                  badgeLabel = "TK";
                  nameColor = "#f472b6"; // Vibrant light pink
                } else if (msg.platform === "facebook") {
                  badgeColor = "bg-blue-500/20 text-blue-300 border border-blue-500/10";
                  badgeLabel = "FB";
                  nameColor = "#38bdf8"; // Vibrant sky blue
                }
              }

              const cardThemeClass = getThemeClass(params.theme, msg.platform);

              return (
                <motion.div
                  key={msg.id}
                  layout
                  {...getAnimationVariants()}
                  className={`flex items-start gap-3 leading-relaxed ${cardThemeClass}`}
                  style={{ pointerEvents: "none" }}
                >
                  {/* Photo profile avatar source widget */}
                  {params.showAvatar && (
                    <div className="shrink-0 mt-0.5">
                      {msg.avatar ? (
                        <img
                          src={msg.avatar}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full border border-white/10 object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300 shadow">
                          {msg.author[0]}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Platform label representation details */}
                      {!params.hidePlatform && (
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase shrink-0 tracking-wide ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                      )}

                      {/* Username label rendering */}
                      <span 
                        style={{ color: nameColor, ...textShadowStyle }} 
                        className="font-extrabold text-[13px] tracking-wide"
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
                      className="mt-0.5 whitespace-pre-wrap leading-relaxed font-bold break-all"
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
