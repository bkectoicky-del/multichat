import React, { useEffect, useState, useRef } from "react";
import { ChatMessage, SpeechSettings } from "../types";
import { formatSpeechText } from "../utils";
import { Radio, Headphones, Volume2 } from "lucide-react";

interface OBSOverlayViewProps {
  appUrl: string;
}

export default function OBSOverlayView({ appUrl }: OBSOverlayViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeBubble, setActiveBubble] = useState<ChatMessage | null>(null);
  const [settings, setSettings] = useState<SpeechSettings>({
    voiceURI: "",
    rate: 1.0,
    pitch: 1.0,
    volume: 0.9,
    readUsername: true,
    minMessageLength: 0,
    ignoredKeywords: [],
    nicknameReadFormat: "{name} berkata {message}",
    enabledPlatforms: {
      youtube: true,
      tiktok: true,
      facebook: true,
      simulation: true,
    },
    filterSystemMessages: true,
    playLocal: false,
    playOverlay: true,
  });

  const speechQueueRef = useRef<ChatMessage[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const sseRef = useRef<EventSource | null>(null);

  // Sync settings from localStorage if available (shared between dashboard and overlay)
  useEffect(() => {
    const saved = localStorage.getItem("live_tts_settings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }

    // Periodically poll localStorage for dashboard setting changes
    const interval = setInterval(() => {
      const currentSaved = localStorage.getItem("live_tts_settings");
      if (currentSaved) {
        try {
          setSettings(JSON.parse(currentSaved));
        } catch (e) {}
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Process next voice in queue
  const processNextInQueue = () => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) {
      if (speechQueueRef.current.length === 0) {
        // Clear active visual card after voice completes
        setTimeout(() => {
          setActiveBubble(null);
        }, 3000);
      }
      return;
    }

    const nextMsg = speechQueueRef.current.shift();
    if (!nextMsg) return;

    // Check if TTS is enabled for Overlay
    if (!settings.playOverlay) {
      processNextInQueue();
      return;
    }

    const textToSpeak = formatSpeechText(nextMsg, settings);
    if (!textToSpeak) {
      // Skipped by settings filters
      processNextInQueue();
      return;
    }

    // Trigger Speech Translation
    if (typeof window !== "undefined" && window.speechSynthesis) {
      isSpeakingRef.current = true;
      setActiveBubble(nextMsg);

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      // Load current voice
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      utterance.onend = () => {
        isSpeakingRef.current = false;
        processNextInQueue();
      };

      utterance.onerror = (e) => {
        console.error("Speech Synthesis error:", e);
        isSpeakingRef.current = false;
        processNextInQueue();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Speech synthesis not supported
      console.warn("Speech synthesis is not supported on this device/overlay.");
      setActiveBubble(nextMsg);
      setTimeout(() => {
        processNextInQueue();
      }, 3000);
    }
  };

  // SSE Stream Listening
  useEffect(() => {
    const customUrl = localStorage.getItem("live_tts_custom_api_url") || "";
    const resolvedBase = customUrl ? customUrl.replace(/\/$/, "") : appUrl;
    const sseUrl = `${resolvedBase}/api/chat/events`;
    console.log("[Overlay] Connecting SSE:", sseUrl);

    const sse = new EventSource(sseUrl);
    sseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const rawData = JSON.parse(event.data);
        if (rawData.type === "connected") {
          console.log("[Overlay] Connected payload confirmed:", rawData.id);
          return;
        }

        const msg = rawData as ChatMessage;

        // Only process chats matching the platform filter
        if (settings.enabledPlatforms[msg.platform]) {
          // Add to state list (show up to last 4 messages on screen overlay)
          setMessages((prev) => {
            const updated = [...prev, msg];
            if (updated.length > 4) updated.shift();
            return updated;
          });

          // Queue for live Text-To-Speech
          speechQueueRef.current.push(msg);
          processNextInQueue();
        }
      } catch (err) {
        console.error("Failed to parse event", err);
      }
    };

    sse.onerror = (err) => {
      console.error("[Overlay] SSE connection error:", err);
    };

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [settings, appUrl]);

  return (
    <div className="fixed inset-0 bg-transparent text-white font-sans flex flex-col justify-end p-8 pointer-events-none select-none">
      {/* Visual active speech bubble notification widget */}
      <div className="w-full max-w-md mx-auto space-y-4">
        {activeBubble && (
          <div className="animate-[slide-up_0.3s_ease] bg-slate-900/95 border-2 border-pink-500 rounded-2xl p-4 shadow-2xl flex items-start gap-3 select-none">
            {/* Platform color marker */}
            <div className={`p-2 rounded-xl text-xs font-bold uppercase shrink-0 ${
              activeBubble.platform === "youtube"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : activeBubble.platform === "tiktok"
                ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                : activeBubble.platform === "facebook"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
            }`}>
              {activeBubble.platform === "youtube" && "📺 YT"}
              {activeBubble.platform === "tiktok" && "🎵 TT"}
              {activeBubble.platform === "facebook" && "👥 FB"}
              {activeBubble.platform === "simulation" && "⚙️ TS"}
            </div>

            <div className="min-w-0 flex-1">
              <span className={`font-bold block text-sm ${
                activeBubble.platform === "youtube"
                  ? "text-red-300"
                  : activeBubble.platform === "tiktok"
                  ? "text-pink-300"
                  : activeBubble.platform === "facebook"
                  ? "text-sky-300"
                  : "text-purple-300"
              }`}>
                {activeBubble.author}
              </span>
              <p className="text-slate-100 text-sm font-medium mt-0.5 leading-relaxed leading-normal">
                {activeBubble.message}
              </p>
            </div>
            
            {/* Visual voice animated EQ */}
            <div className="flex items-center gap-1 mt-1">
              <span className="h-3 w-0.5 bg-pink-500 animate-[bounce_0.6s_infinite]"></span>
              <span className="h-5 w-0.5 bg-pink-400 animate-[bounce_0.4s_infinite_delay-100ms]"></span>
              <span className="h-2 w-0.5 bg-pink-500 animate-[bounce_0.5s_infinite_delay-200ms]"></span>
            </div>
          </div>
        )}

        {/* Little Watermark shown only during testing outside OBS to help guide the user */}
        {messages.length === 0 && (
          <div className="text-center p-6 bg-slate-950/80 rounded-xl border border-dashed border-slate-800 text-slate-400 max-w-sm mx-auto">
            <Radio className="w-6 h-6 text-pink-500 animate-pulse mx-auto mb-2" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">OBS Overlay Terkoneksi</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Tampilan transparan siap digunakan. Setiap teks pesan live chat baru otomatis dibacakan suara di sini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
