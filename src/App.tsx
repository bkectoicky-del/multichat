import React, { useEffect, useState, useRef } from "react";
import { ChatMessage, SpeechSettings } from "./types";
import { formatSpeechText } from "./utils";
import Header from "./components/Header";
import { VoiceSettingsCard, SafetySettingsCard } from "./components/SettingsPanel";
import SourcePlatformCard from "./components/SourcePlatformCard";
import LiveChatFeedCard from "./components/LiveChatFeedCard";
import LiveAnalyticsCard from "./components/LiveAnalyticsCard";
import OBSOverlayView from "./components/OBSOverlayView";
import { Radio, LayoutDashboard } from "lucide-react";

export default function App() {
  const [isOverlayRoute, setIsOverlayRoute] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeClients, setActiveClients] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpokenText, setCurrentlySpokenText] = useState("");
  const [activeYoutubeVideoId, setActiveYoutubeVideoId] = useState<string | null>(null);

  // Dynamic hosted application URL
  const [appUrl, setAppUrl] = useState("http://localhost:3000");

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
    playLocal: true,
    playOverlay: true,
  });

  const sseRef = useRef<EventSource | null>(null);
  const dashboardSpeechQueueRef = useRef<ChatMessage[]>([]);
  const isDashboardSpeakingRef = useRef<boolean>(false);

  // Handle routing based on pathname
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
      if (window.location.pathname === "/overlay" || window.location.hash.includes("/overlay")) {
        setIsOverlayRoute(true);
      }
    }
  }, []);

  // Fetch initial configs, settings, and full chat log history
  useEffect(() => {
    if (isOverlayRoute) return;

    // Load persisted configurations
    const saved = localStorage.getItem("live_tts_settings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved tts configurations", e);
      }
    }

    // Fetch message history log
    fetch("/api/chat/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.history) {
          setChatHistory(data.history);
        }
      })
      .catch((err) => console.error("Error fetching chat history logs:", err));
  }, [isOverlayRoute]);

  // Persists changes to Settings
  const handleSettingsChange = (newSettings: SpeechSettings) => {
    setSettings(newSettings);
    localStorage.setItem("live_tts_settings", JSON.stringify(newSettings));
  };

  // Run Dashboard Local TTS Speech Queue (only plays when playLocal is checked)
  const processDashboardSpeechQueue = () => {
    if (isDashboardSpeakingRef.current || dashboardSpeechQueueRef.current.length === 0) {
      return;
    }

    const nextMsg = dashboardSpeechQueueRef.current.shift();
    if (!nextMsg) return;

    if (!settings.playLocal) {
      processDashboardSpeechQueue();
      return;
    }

    const textToSpeak = formatSpeechText(nextMsg, settings);
    if (!textToSpeak) {
      processDashboardSpeechQueue();
      return;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      isDashboardSpeakingRef.current = true;
      setIsSpeaking(true);
      setCurrentlySpokenText(nextMsg.message);

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find((v) => v.voiceURI === settings.voiceURI);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      utterance.onend = () => {
        isDashboardSpeakingRef.current = false;
        setIsSpeaking(false);
        setCurrentlySpokenText("");
        processDashboardSpeechQueue();
      };

      utterance.onerror = () => {
        isDashboardSpeakingRef.current = false;
        setIsSpeaking(false);
        setCurrentlySpokenText("");
        processDashboardSpeechQueue();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      isDashboardSpeakingRef.current = false;
      processDashboardSpeechQueue();
    }
  };

  // Connect to SSE stream
  useEffect(() => {
    if (isOverlayRoute) return;

    console.log("[Dashboard] Initializing Event Source listener...");
    const sse = new EventSource("/api/chat/events");
    sseRef.current = sse;

    sse.onopen = () => {
      setIsConnected(true);
    };

    sse.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "connected") {
          console.log("[Dashboard] SSE Handshake Complete:", msg.id);
          if (msg.clientCount !== undefined) {
            setActiveClients(msg.clientCount);
          }
          return;
        }

        if (msg.type === "stats") {
          setActiveClients(msg.clientCount);
          return;
        }

        // Appends to list
        setChatHistory((prev) => {
          const updated = [...prev, msg];
          if (updated.length > 200) updated.shift();
          return updated;
        });

        // Trigger local TTS speech queue
        if (settings.playLocal && settings.enabledPlatforms[msg.platform]) {
          dashboardSpeechQueueRef.current.push(msg);
          processDashboardSpeechQueue();
        }
      } catch (err) {
        console.error("Failed to parse incoming streaming event", err);
      }
    };

    sse.onerror = (err) => {
      console.error("[Dashboard] EventSource disconnected", err);
      setIsConnected(false);
    };

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [isOverlayRoute, settings]);

  // Repeated voice triggered manually from row action
  const handlePlaySingleSpeech = (msg: ChatMessage) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      
      const textToSpeak = formatSpeechText(msg, settings) || `${msg.author} berkata ${msg.message}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find((v) => v.voiceURI === settings.voiceURI);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      setIsSpeaking(true);
      setCurrentlySpokenText(msg.message);

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentlySpokenText("");
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentlySpokenText("");
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Start polling YouTube
  const handleStartYoutubePoll = (videoId: string) => {
    fetch("/api/chat/youtube/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActiveYoutubeVideoId(data.activeVideoId);
        }
      })
      .catch((e) => console.error("Error starting YouTube poller:", e));
  };

  // Stop polling YouTube
  const handleStopYoutubePoll = () => {
    fetch("/api/chat/youtube/stop", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActiveYoutubeVideoId(null);
        }
      })
      .catch((e) => console.error("Error stopping YouTube poller:", e));
  };

  // Simulate comment injection
  const handleSimulateMessage = (
    author: string,
    message: string,
    platform: "tiktok" | "youtube" | "facebook" | "simulation"
  ) => {
    fetch("/api/chat/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, message, platform }),
    }).catch((e) => console.error("Error triggering simulation chat message", e));
  };

  // Clear Chat History Logs
  const handleClearHistory = () => {
    fetch("/api/chat/clear", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setChatHistory([]);
        }
      })
      .catch((e) => console.error("Error clearing logs history database", e));
  };

  // ---- ROUTING FOR TRANSPARENT OVERLAY SOURCE FOR OBS STUDIO ----
  if (isOverlayRoute) {
    return <OBSOverlayView appUrl={appUrl} />;
  }

  // ---- ROUTING FOR STREAMER CONTROL DASHBOARD ----
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 selection:bg-indigo-500/30 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation / Mode alerts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 font-sans">
              Streamer Workspace Panel
            </span>
          </div>

          <a
            href="/overlay"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 p-1.5 px-3 bg-pink-950/40 text-pink-300 hover:text-white border border-pink-900/60 rounded-lg text-xs font-semibold cursor-pointer transition hover:bg-pink-900/40"
          >
            <Radio className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
            Buka Overlay di Tab Baru
          </a>
        </div>

        {/* Global Stats and Action Header */}
        <Header
          isConnected={isConnected}
          activeClients={activeClients}
          overlayUrl={`${appUrl}/overlay`}
          isSpeaking={isSpeaking}
          currentSpokenText={currentlySpokenText}
          onClearHistory={handleClearHistory}
        />

        {/* Workspace Layout Columns arranged in high-density Bento Grid style */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Bento Cell 1: Platforms connector & Simulator (Colspan 4) */}
          <div className="md:col-span-4 flex flex-col gap-5">
            <SourcePlatformCard
              appUrl={appUrl}
              activeYoutubeVideoId={activeYoutubeVideoId}
              onStartYoutubePoll={handleStartYoutubePoll}
              onStopYoutubePoll={handleStopYoutubePoll}
              onSimulateMessage={handleSimulateMessage}
            />
          </div>

          {/* Bento Cell 2: Live Chat Cascade Logs Feed (Colspan 5) */}
          <div className="md:col-span-5 flex flex-col">
            <LiveChatFeedCard
              chatHistory={chatHistory}
              onPlaySingleSpeech={handlePlaySingleSpeech}
            />
          </div>

          {/* Bento Cell 3: Audio settings, limits, and live chart metrics (Colspan 3) */}
          <div className="md:col-span-3 flex flex-col gap-5">
            <LiveAnalyticsCard
              chatHistory={chatHistory}
              activeClients={activeClients}
              isSpeaking={isSpeaking}
            />

            <VoiceSettingsCard
              settings={settings}
              onChangeSettings={handleSettingsChange}
            />

            <SafetySettingsCard
              settings={settings}
              onChangeSettings={handleSettingsChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
