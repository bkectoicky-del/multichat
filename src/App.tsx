import React, { useEffect, useState, useRef } from "react";
import { ChatMessage, SpeechSettings } from "./types";
import { formatSpeechText } from "./utils";
import Header from "./components/Header";
import { VoiceSettingsCard, SafetySettingsCard } from "./components/SettingsPanel";
import SourcePlatformCard from "./components/SourcePlatformCard";
import LiveChatFeedCard from "./components/LiveChatFeedCard";
import LiveAnalyticsCard from "./components/LiveAnalyticsCard";
import { LayoutDashboard } from "lucide-react";

export default function App() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpokenText, setCurrentlySpokenText] = useState("");
  const [activeYoutubeVideoId, setActiveYoutubeVideoId] = useState<string | null>(null);

  // Dynamic hosted application URL
  const [appUrl, setAppUrl] = useState("http://localhost:3000");

  // Custom Toast Notifications
  interface NotificationToast {
    id: string;
    type: "success" | "info" | "error";
    platform: "tiktok" | "youtube" | "facebook" | "system";
    title: string;
    message: string;
  }
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  const showNotification = (
    type: "success" | "info" | "error",
    platform: "tiktok" | "youtube" | "facebook" | "system",
    title: string,
    message: string
  ) => {
    const newToast: NotificationToast = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      platform,
      title,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  };

  // Platform connection states
  const [tiktokUsername, setTiktokUsername] = useState("@streaming_pro");
  const [isTiktokConnected, setIsTiktokConnected] = useState(false);
  const [isTiktokConnecting, setIsTiktokConnecting] = useState(false);

  const [facebookPageId, setFacebookPageId] = useState("page_live_12");
  const [isFacebookConnected, setIsFacebookConnected] = useState(false);
  const [isFacebookConnecting, setIsFacebookConnecting] = useState(false);

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
    filterTtsMode: "all",
  });

  const [customApiUrl, setCustomApiUrl] = useState<string>(() => {
    return localStorage.getItem("live_tts_custom_api_url") || "";
  });

  const handleCustomApiUrlChange = (val: string) => {
    setCustomApiUrl(val);
    localStorage.setItem("live_tts_custom_api_url", val);
  };

  const apiBase = customApiUrl ? customApiUrl.replace(/\/$/, "") : "";

  const sseRef = useRef<EventSource | null>(null);
  const dashboardSpeechQueueRef = useRef<ChatMessage[]>([]);
  const isDashboardSpeakingRef = useRef<boolean>(false);
  const lastSpokenTimestampRef = useRef<number>(Date.now());

  // Set host origin URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }
  }, []);

  // Fetch initial configs, settings, and full chat log history
  useEffect(() => {
    // Load persisted configurations
    const saved = localStorage.getItem("live_tts_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          enabledPlatforms: {
            youtube: true,
            tiktok: true,
            facebook: true,
            ...(prev.enabledPlatforms || {}),
            ...(parsed.enabledPlatforms || {}),
          },
          filterTtsMode: parsed.filterTtsMode || "all",
        }));
      } catch (e) {
        console.error("Failed to load saved tts configurations", e);
      }
    }

    // Fetch message history log
    fetch(apiBase + "/api/chat/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.history) {
          setChatHistory(data.history);
        }
      })
      .catch((err) => console.error("Error fetching chat history logs:", err));

    // Fetch active YouTube connection status
    fetch(apiBase + "/api/chat/youtube/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.connected && data.videoId) {
          setActiveYoutubeVideoId(data.videoId);
        } else {
          setActiveYoutubeVideoId(null);
        }
      })
      .catch((err) => console.error("Error syncing active YouTube status:", err));

    // Fetch active TikTok connection status
    fetch(apiBase + "/api/chat/tiktok/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.connected && data.username) {
          setIsTiktokConnected(true);
          setTiktokUsername(data.username);
        } else {
          setIsTiktokConnected(false);
        }
      })
      .catch((err) => console.error("Error syncing active TikTok status:", err));

    // Fetch active Facebook connection status
    fetch(apiBase + "/api/chat/facebook/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.connected && data.pageId) {
          setIsFacebookConnected(true);
          setFacebookPageId(data.pageId);
        } else {
          setIsFacebookConnected(false);
        }
      })
      .catch((err) => console.error("Error syncing active Facebook status:", err));
  }, [apiBase]);

  // Persists changes to Settings
  const handleSettingsChange = (newSettings: SpeechSettings) => {
    setSettings(newSettings);
    localStorage.setItem("live_tts_settings", JSON.stringify(newSettings));
  };

  // Toggles local TTS from master switch (Header)
  const handleTogglePlayLocal = () => {
    const nextState = !settings.playLocal;
    
    // Clear speech backlog and stop ongoing voice speaks when toggled
    dashboardSpeechQueueRef.current = [];
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      isDashboardSpeakingRef.current = false;
      setIsSpeaking(false);
      setCurrentlySpokenText("");
    }
    
    handleSettingsChange({
      ...settings,
      playLocal: nextState,
    });
    
    showNotification(
      "info",
      "system",
      nextState ? "Auto-TTS Diaktifkan" : "Auto-TTS Dimatikan",
      nextState 
        ? "Komentar live baru akan disuarakan secara otomatis." 
        : "TTS disenyapkan. Klik tombol 'Speak' di sebelah komentar untuk membaca secara manual."
    );
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
      utterance.lang = "id-ID";

      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (!selectedVoice) {
        // Fallback: Cari suara asli Bahasa Indonesia (id-ID) terbaik dari browser
        selectedVoice = voices.find((v) => {
          const l = v.lang.toLowerCase().replace("_", "-");
          return l === "id-id" || l === "id" || l.startsWith("id-");
        });
      }
      
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
    console.log("[Dashboard] Initializing Event Source listener to:", apiBase + "/api/chat/events");
    const sse = new EventSource(apiBase + "/api/chat/events");
    sseRef.current = sse;

    sse.onopen = () => {
      setIsConnected(true);
    };

    sse.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "connected") {
          console.log("[Dashboard] SSE Handshake Complete:", msg.id);
          return;
        }

        if (msg.type === "stats") {
          return;
        }

        // Appends to list
        setChatHistory((prev) => {
          const updated = [...prev, msg];
          if (updated.length > 200) updated.shift();
          return updated;
        });

        // Trigger local TTS speech queue (only play if the message is newer than the last manually spoken timestamp mark)
        const isMsgNewer = msg.timestamp >= lastSpokenTimestampRef.current;
        if (settings.playLocal && settings.enabledPlatforms[msg.platform] && isMsgNewer) {
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
  }, [settings, apiBase]);

  // Repeated voice triggered manually from row action
  const handlePlaySingleSpeech = (msg: ChatMessage) => {
    // Empty the automatic queue to prevent read-from-start or backlog read congestion
    dashboardSpeechQueueRef.current = [];
    isDashboardSpeakingRef.current = false;
    
    // Set the latest timestamp mark to this message's timestamp so only subsequent newer chats are auto-spoken
    lastSpokenTimestampRef.current = msg.timestamp;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      
      const textToSpeak = formatSpeechText(msg, settings) || `${msg.author} berkata ${msg.message}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "id-ID";

      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (!selectedVoice) {
        // Fallback: Cari suara asli Bahasa Indonesia (id-ID) terbaik dari browser
        selectedVoice = voices.find((v) => {
          const l = v.lang.toLowerCase().replace("_", "-");
          return l === "id-id" || l === "id" || l.startsWith("id-");
        });
      }
      
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
    showNotification("info", "youtube", "Menghubungkan YouTube", "Memulai polling server untuk YouTube Live Chat...");
    fetch(apiBase + "/api/chat/youtube/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActiveYoutubeVideoId(data.activeVideoId);
          showNotification(
            "success",
            "youtube",
            "YouTube Terhubung",
            `Berhasil terhubung ke YouTube Video ID: ${data.activeVideoId}!`
          );
          appendSystemMessage(
            "Sistem",
            `[KONEKSI AKTIF] Mulai memantau YouTube Live Chat Video ID: ${data.activeVideoId}`,
            "youtube"
          );
        } else {
          showNotification("error", "youtube", "Koneksi Gagal", "Gagal memproses YouTube Video ID.");
        }
      })
      .catch((e) => {
        console.error("Error starting YouTube poller:", e);
        showNotification("error", "youtube", "Koneksi Gagal", "Terjadi kesalahan jaringan.");
      });
  };

  // Stop polling YouTube
  const handleStopYoutubePoll = () => {
    fetch(apiBase + "/api/chat/youtube/stop", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActiveYoutubeVideoId(null);
          showNotification("info", "youtube", "YouTube Terputus", "Polling live chat YouTube dihentikan.");
        }
      })
      .catch((e) => console.error("Error stopping YouTube poller:", e));
  };

  // TikTok actual connection triggers
  const handleConnectTiktok = () => {
    if (!tiktokUsername.trim()) {
      showNotification("error", "tiktok", "Gagal Menghubungkan", "Masukkan username TikTok terlebih dahulu!");
      return;
    }
    setIsTiktokConnecting(true);
    fetch(apiBase + "/api/chat/tiktok/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: tiktokUsername }),
    })
      .then((res) => res.json())
      .then((data) => {
        setIsTiktokConnecting(false);
        if (data.success) {
          setIsTiktokConnected(true);
          showNotification(
            "success",
            "tiktok",
            "TikTok Terhubung",
            `Berhasil terhubung ke siaran live @${data.username}!`
          );
          appendSystemMessage(
            "Sistem",
            `[KONEKSI AKTIF] Berhasil terhubung ke live stream TikTok @${data.username}. Memulai monitoring live chat...`,
            "tiktok"
          );
        } else {
          setIsTiktokConnected(false);
          showNotification(
            "error",
            "tiktok",
            "Gagal Menghubungkan",
            data.error || "Gagal menghubungi akun TikTok ini. Pastikan akun sedang LIVE!"
          );
        }
      })
      .catch((e) => {
        console.error("Error connecting to TikTok live:", e);
        setIsTiktokConnecting(false);
        setIsTiktokConnected(false);
        showNotification("error", "tiktok", "Koneksi Gagal", "Terjadi kesalahan jaringan.");
      });
  };

  const handleDisconnectTiktok = () => {
    fetch(apiBase + "/api/chat/tiktok/disconnect", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setIsTiktokConnected(false);
        showNotification("info", "tiktok", "TikTok Terputus", "Koneksi ke TikTok live chat dihentikan.");
      })
      .catch((e) => {
        console.error("Error disconnecting TikTok:", e);
        setIsTiktokConnected(false);
        showNotification("info", "tiktok", "TikTok Terputus", "Koneksi dihentikan.");
      });
  };

  // Facebook connection triggers
  const handleConnectFacebook = () => {
    if (!facebookPageId.trim()) {
      showNotification("error", "facebook", "Gagal Menghubungkan", "Masukkan Page ID Facebook terlebih dahulu!");
      return;
    }
    setIsFacebookConnecting(true);
    fetch(apiBase + "/api/chat/facebook/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: facebookPageId }),
    })
      .then((res) => res.json())
      .then((data) => {
        setIsFacebookConnecting(false);
        if (data.success) {
          setIsFacebookConnected(true);
          showNotification(
            "success",
            "facebook",
            "Facebook Terhubung",
            `Berhasil terhubung ke Facebook Live Page ID: ${data.pageId}!`
          );
        } else {
          setIsFacebookConnected(false);
          showNotification("error", "facebook", "Koneksi Gagal", "Gagal menghubungkan ke Facebook Live Page.");
        }
      })
      .catch((e) => {
        console.error("Error connecting Facebook:", e);
        setIsFacebookConnecting(false);
        setIsFacebookConnected(false);
        showNotification("error", "facebook", "Koneksi Gagal", "Terjadi kesalahan jaringan.");
      });
  };

  const handleDisconnectFacebook = () => {
    fetch(apiBase + "/api/chat/facebook/disconnect", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setIsFacebookConnected(false);
        showNotification("info", "facebook", "Facebook Terputus", "Koneksi ke Facebook live chat dihentikan.");
      })
      .catch((e) => {
        console.error("Error disconnecting Facebook:", e);
        setIsFacebookConnected(false);
        showNotification("info", "facebook", "Facebook Terputus", "Koneksi dihentikan.");
      });
  };

  // Local system connection logs helper
  const appendSystemMessage = (
    author: string,
    message: string,
    platform: "tiktok" | "youtube" | "facebook" | "system"
  ) => {
    const sysMsg: ChatMessage = {
      id: `sys-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      platform: platform as any,
      author,
      message,
      timestamp: Date.now(),
    };
    setChatHistory((prev) => {
      const updated = [...prev, sysMsg];
      if (updated.length > 200) updated.shift();
      return updated;
    });
  };

  // Clear Chat History Logs
  const handleClearHistory = () => {
    fetch(apiBase + "/api/chat/clear", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setChatHistory([]);
        }
      })
      .catch((e) => console.error("Error clearing logs history database", e));
  };

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
        </div>

        {/* Global Stats and Action Header */}
        <Header
          isConnected={isConnected}
          isSpeaking={isSpeaking}
          currentSpokenText={currentlySpokenText}
          onClearHistory={handleClearHistory}
          playLocal={settings.playLocal}
          onTogglePlayLocal={handleTogglePlayLocal}
        />

        {/* Workspace Layout Columns arranged in high-density Bento Grid style */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Bento Cell 1: Platforms connector (Colspan 4) */}
          <div className="md:col-span-4 flex flex-col gap-5">
            <SourcePlatformCard
              appUrl={appUrl}
              activeYoutubeVideoId={activeYoutubeVideoId}
              onStartYoutubePoll={handleStartYoutubePoll}
              onStopYoutubePoll={handleStopYoutubePoll}

              tiktokUsername={tiktokUsername}
              setTiktokUsername={setTiktokUsername}
              isTiktokConnected={isTiktokConnected}
              isTiktokConnecting={isTiktokConnecting}
              onConnectTiktok={handleConnectTiktok}
              onDisconnectTiktok={handleDisconnectTiktok}

              facebookPageId={facebookPageId}
              setFacebookPageId={setFacebookPageId}
              isFacebookConnected={isFacebookConnected}
              isFacebookConnecting={isFacebookConnecting}
              onConnectFacebook={handleConnectFacebook}
              onDisconnectFacebook={handleDisconnectFacebook}

              customApiUrl={customApiUrl}
              onChangeCustomApiUrl={handleCustomApiUrlChange}
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

      {/* Floating high-density Toast Notification Panel */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let bgColor = "bg-slate-900 border-slate-800";
          let iconColor = "text-indigo-400";
          let platformBadge = "";
          if (toast.platform === "tiktok") {
            platformBadge = "🎵 TikTok";
          } else if (toast.platform === "facebook") {
            platformBadge = "👥 Facebook";
          } else if (toast.platform === "youtube") {
            platformBadge = "📽️ YouTube";
          } else {
            platformBadge = "⚙️ Sistem";
          }

          if (toast.type === "success") {
            bgColor = "bg-slate-900/95 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
            iconColor = "text-emerald-400";
          } else if (toast.type === "error") {
            bgColor = "bg-slate-900/95 border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.15)]";
            iconColor = "text-pink-500";
          } else if (toast.type === "info") {
            bgColor = "bg-slate-900/95 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]";
            iconColor = "text-blue-400";
          }

          return (
            <div
              key={toast.id}
              className={`p-4 rounded-xl border flex gap-3 pointer-events-auto shadow-2xl transition duration-300 ${bgColor}`}
            >
              <div className="flex-grow">
                <div className="flex items-center gap-1.5 justify-between">
                  <h4 className={`text-xs font-bold leading-none ${iconColor}`}>{toast.title}</h4>
                  <span className="text-[9px] bg-slate-800/85 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-widest">{platformBadge}</span>
                </div>
                <p className="text-[11px] text-slate-350 mt-1.5 leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-500 hover:text-slate-300 transition text-sm font-bold ml-1 self-start pointer-events-auto cursor-pointer"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
