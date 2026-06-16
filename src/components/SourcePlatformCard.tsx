import React, { useState, useEffect } from "react";
import { Video, HelpCircle, Code, Radio, Key, Settings, AlertCircle, UserCheck, ChevronDown, ChevronUp, LogOut } from "lucide-react";
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

  customApiUrl: string;
  onChangeCustomApiUrl: (val: string) => void;
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

  customApiUrl,
  onChangeCustomApiUrl,
}: SourcePlatformCardProps) {
  const [ytInput, setYtInput] = useState("");
  const [copiedScript, setCopiedScript] = useState(false);

  // Google YouTube API config states
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [hasOAuth, setHasOAuth] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; avatar: string } | null>(null);
  const [showAdvancedYoutube, setShowAdvancedYoutube] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);

  // Sync initial configuration from backend on mount
  useEffect(() => {
    const targetUrl = customApiUrl ? customApiUrl.replace(/\/$/, "") : appUrl;
    fetch(`${targetUrl}/api/chat/youtube/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey) setApiKey(data.apiKey);
        if (data.clientId) setClientId(data.clientId);
        if (data.clientSecret) setClientSecret(data.clientSecret);
        setHasOAuth(data.hasOAuth);
        setUserInfo(data.userInfo);
      })
      .catch((e) => console.error("Gagal sinkronisasi konfigurasi YouTube API:", e));
  }, [appUrl, customApiUrl]);

  // Popup message listeners for Google OAuth callbacks
  useEffect(() => {
    const handleGoogleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "GOOGLE_YOUTUBE_AUTH_SUCCESS") {
        setHasOAuth(true);
        setUserInfo(e.data.userInfo);
      }
    };
    window.addEventListener("message", handleGoogleMessage);
    return () => window.removeEventListener("message", handleGoogleMessage);
  }, []);

  const handleSaveApiKey = async () => {
    setIsSavingApiKey(true);
    const targetUrl = customApiUrl ? customApiUrl.replace(/\/$/, "") : appUrl;
    try {
      const res = await fetch(`${targetUrl}/api/chat/youtube/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (data.success) {
        alert("YouTube API Key disimpan dengan aman di server untuk polling stream!");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan API Key.");
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      alert("Silakan lengkapi Google OAuth Client ID dan Client Secret terlebih dahulu di panel pengaturan bawah.");
      setShowAdvancedYoutube(true);
      return;
    }

    const targetUrl = customApiUrl ? customApiUrl.replace(/\/$/, "") : appUrl;
    try {
      const authUrlRes = await fetch(
        `${targetUrl}/api/auth/google/url?clientId=${encodeURIComponent(clientId.trim())}&clientSecret=${encodeURIComponent(clientSecret.trim())}&appUrl=${encodeURIComponent(targetUrl)}`
      );
      const authUrlData = await authUrlRes.json();
      if (authUrlData.url) {
        const width = 500;
        const height = 650;
        const left = window.screenX + (window.innerWidth - width) / 2;
        const top = window.screenY + (window.innerHeight - height) / 2;
        window.open(authUrlData.url, "google_youtube_auth", `width=${width},height=${height},left=${left},top=${top}`);
      } else {
        alert("Gagal mendapatkan URL otentikasi Google: " + JSON.stringify(authUrlData));
      }
    } catch (e) {
      console.error(e);
      alert("Gagal menginisiasi Google OAuth.");
    }
  };

  const handleGoogleLogout = async () => {
    const targetUrl = customApiUrl ? customApiUrl.replace(/\/$/, "") : appUrl;
    try {
      const res = await fetch(`${targetUrl}/api/chat/youtube/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnect: true }),
      });
      const data = await res.json();
      if (data.success) {
        setHasOAuth(false);
        setUserInfo(null);
        alert("Koneksi Google Account diputuskan.");
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  // Connect-code generator
  const bookmarkletCode = generateBookmarkletCode(customApiUrl || appUrl);
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
        {/* Dynamic Stateful Server Config for Vercel/Static Deployments Fallback */}
        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 space-y-2">
          <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            🔌 SERVER API URL (VERCEL FALLBACK)
          </label>
          <div className="text-[10.5px] text-slate-400 leading-normal">
            Kosongkan bila berjalan di AI Studio. Isi bila di-hosting di Vercel agar data chat terarah ke server container pemrosesan Anda!
          </div>
          <input
            type="text"
            placeholder="Contoh: https://ais-pre-...run.app"
            value={customApiUrl}
            onChange={(e) => onChangeCustomApiUrl(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-medium text-slate-350 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

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
                {hasOAuth ? "Connected (OAuth)" : apiKey ? "Connected (API Key)" : "Direct Streaming"}
              </span>
            ) : (
              <span className="text-[9.5px] font-semibold text-slate-500 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-full uppercase tracking-widest">Offline</span>
            )}
          </div>

          {/* Quick Notice about instant connection (NO Login needed) */}
          {!activeYoutubeVideoId && !hasOAuth && (
            <div className="bg-slate-900/60 border border-slate-805 p-3 rounded-xl">
              <p className="text-[10.5px] text-slate-350 leading-relaxed font-medium">
                💡 <strong className="text-white">Tanpa Login / Setup:</strong> Tempel URL Live Stream Anda di bawah, lalu klik <span className="text-red-400 font-bold">Start Connection</span> untuk membaca chat secara instan tanpa ribet sama sekali!
              </p>
            </div>
          )}

          {/* Connected Google Account HUD indicator */}
          {hasOAuth && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
              {userInfo?.avatar ? (
                <img src={userInfo.avatar} alt="Google Avatar" className="w-6 h-6 rounded-full border border-emerald-500/40" referrerPolicy="no-referrer" />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-400" />
              )}
              <div className="flex-grow min-w-0">
                <div className="text-[10.5px] font-bold text-emerald-400 leading-none truncate">{userInfo?.name || "Connected Google User"}</div>
                <div className="text-[9px] text-slate-400 leading-none mt-1 truncate">{userInfo?.email || "youtube.readonly"}</div>
              </div>
              <button
                type="button"
                onClick={handleGoogleLogout}
                className="p-1 text-slate-500 hover:text-red-400 rounded transition cursor-pointer"
                title="Disconnect Google Account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Connected API Key indicator */}
          {!hasOAuth && apiKey && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[9.5px] font-bold rounded-lg w-max uppercase tracking-wider">
              <Key className="w-3.5 h-3.5" />
              API Key Terpasang
            </div>
          )}

          {/* Direct Input Field */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">YouTube Live ID or URL</label>
            <input
              type="text"
              placeholder="Contoh: https://www.youtube.com/watch?v=xxxx ATAU hanya kode video id"
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
                Start Connection (Direct)
              </button>
            )}
          </div>

          {/* In-Line Beautiful Google Sign-In if Credentials are Pre-configured on Server */}
          {!hasOAuth && !activeYoutubeVideoId && clientId && clientSecret && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
              <div className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                Official OAuth Connection Ready
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Credentials Google terdeteksi di server! Anda dapat login ke akun YouTube Anda langsung dengan 1-klik di bawah ini.
              </p>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-slate-200 hover:text-white font-bold tracking-wide rounded-lg text-xs uppercase border border-slate-800 transition duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-3.5 h-3.5 text-red-500 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.552 0-6.45-2.899-6.45-6.45s2.898-6.45 6.45-6.45c1.614 0 3.081.594 4.218 1.568l3.076-3.076C19.297 2.185 15.973 1 12.24 1 5.48 1 0 6.48 0 13.24s5.48 12.24 12.24 12.24c6.88 0 12.24-5.48 12.24-12.24 0-.82-.073-1.61-.207-2.378l-12.033-.077z" />
                </svg>
                Sign In Dengan Google Account
              </button>
            </div>
          )}

          <div className="border-t border-slate-800/40 my-1"></div>

          {/* Advanced YouTube parameters accordion */}
          <div className="border border-slate-850 rounded-xl bg-slate-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedYoutube(!showAdvancedYoutube)}
              className="w-full flex justify-between items-center px-3 py-1.5 text-left text-[10px] font-bold text-slate-500 hover:text-slate-400 transition duration-150 cursor-pointer"
            >
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Settings className="w-3 h-3 text-slate-500" />
                Dua-Engine, Google Login & API Settings (Opsional)
              </span>
              {showAdvancedYoutube ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {showAdvancedYoutube && (
              <div className="p-3 border-t border-slate-855 bg-slate-950/80 space-y-4">
                {/* Method 1: Google OAuth login */}
                <div className="space-y-2">
                  <label className="text-[9.5px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                    👤 METODE A: GOOGLE OAUTH LOGIN
                  </label>
                  <p className="text-[9.5px] text-slate-400 leading-normal">
                    Lakukan integrasi formal akun Google Anda agar monitoring live stream tidak diblokir YouTube Scrapers detector.
                  </p>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Google Client ID"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-[11px] font-medium text-slate-200 focus:outline-none focus:border-red-500/50"
                    />
                    <input
                      type="password"
                      placeholder="Google Client Secret"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-[11px] font-medium text-slate-200 focus:outline-none focus:border-red-500/50"
                    />
                  </div>
                  {hasOAuth ? (
                    <div className="flex gap-2 items-center justify-between">
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 select-none">
                        ✓ Google Terhubung
                      </span>
                      <button
                        type="button"
                        onClick={handleGoogleLogout}
                        className="py-1 px-3 bg-red-950/30 hover:bg-red-950/50 text-red-400 text-[10px] font-bold rounded cursor-pointer transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-full py-1.5 bg-red-650 hover:bg-red-600 text-white font-bold text-[10.5px] tracking-wide rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      Sign In dengan Google (OAuth)
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-800/60 my-2"></div>

                {/* Method 2: YouTube API Key */}
                <div className="space-y-2">
                  <label className="text-[9.5px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                    ⚡ METODE B: OFFICIAL YOUTUBE API KEY
                  </label>
                  <p className="text-[9.5px] text-slate-400 leading-normal">
                    Metode tercepat! Masukkan YouTube Data API v3 Key Anda untuk memantau live chat langsung dari server secara stabil.
                  </p>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="YouTube API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-grow bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-[11px] font-medium text-slate-200 focus:outline-none focus:border-red-500/50"
                    />
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      disabled={isSavingApiKey}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white font-bold text-[10.5px] rounded-lg transition cursor-pointer font-sans"
                    >
                      {isSavingApiKey ? "..." : "Simpan"}
                    </button>
                  </div>
                </div>

                <div className="p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-[9px] text-slate-400 space-y-1">
                  <div className="font-bold text-slate-300 uppercase flex items-center gap-1 select-none">
                    <AlertCircle className="w-3.5 h-3.5 text-indigo-400" /> BANTUAN GOOGLE API:
                  </div>
                  <p>
                    1. Buka <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google Cloud Console</a>.
                  </p>
                  <p>
                    2. Buat project baru dan aktifkan <strong>"YouTube Data API v3"</strong>.
                  </p>
                  <p>
                    3. Buat API Key (Metode B) ATAU buat Kredensial OAuth CLIENT ID jenis Web Application (Metode A).
                  </p>
                  <p className="font-semibold text-indigo-300">
                    Masukan Redirect URI Google OAuth Anda ke: <code className="bg-slate-900 px-1 py-0.5 rounded text-[8.5px] text-indigo-400 break-all select-all">{customApiUrl || appUrl}/auth/google/callback</code>
                  </p>
                </div>
              </div>
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

          {/* Connection Instructions Tutorial Block */}
          <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1.5 text-[10px] text-slate-400 leading-relaxed">
            <span className="font-bold text-blue-450 uppercase tracking-wider block">📋 PETUNJUK KONEKSI FACEBOOK:</span>
            <ol className="list-decimal list-inside space-y-1 text-[9.5px]">
              <li>Buka siaran langsung Anda di <strong className="text-white">Facebook</strong> (melalui PC/Laptop).</li>
              <li>Masukkan <strong className="text-emerald-400">Username Halaman</strong> atau <strong className="text-emerald-400">User ID Facebook</strong> Anda di kolom bawah.</li>
              <li>Klik <strong className="text-white">Start Connection</strong> untuk mengaktifkan pemantau status.</li>
              <li>Buka tab siaran langsung Facebook Anda lalu klik tombol <strong className="text-indigo-400">OMNISTREAM LINKER</strong> di bilah bookmark browser Anda untuk mentransfer chat secara real-time!</li>
            </ol>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Facebook Page Username / ID</label>
            <input
              type="text"
              placeholder="Contoh: bke.cto.icky atau ID_Halaman"
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
      <div className="p-4 bg-indigo-500/5 border border-indigo-500/25 rounded-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-indigo-500/10 pb-2">
          <div className="flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">🌟 KANAL LINKER (BOOKMARKLET)</span>
          </div>
          <button
            onClick={handleCopyConsoleCode}
            className="text-[9.5px] font-bold text-indigo-300 hover:text-white bg-indigo-500/15 border border-indigo-500/20 px-2 py-1 rounded-lg transition cursor-pointer"
          >
            {copiedScript ? "Script disalin!" : "Salin Script"}
          </button>
        </div>

        <div className="text-center bg-slate-950/60 p-4 rounded-xl border border-indigo-500/10 space-y-3">
          <p className="text-[10px] text-slate-400 font-medium">
            Tarik tombol di bawah ini ke bilah bookmark browser Anda (Bookmarks Bar). Tanpa extension atau buka Developer Console!
          </p>

          <a
            href={bookmarkletCode}
            onClick={(e) => {
              // Standard fallback alert to guide dragging
              e.preventDefault();
              alert("Seret tombol ini ke Bookmarks Bar browser Anda (tekan Ctrl+Shift+B jika belum muncul), lalu buka Youtube Live Chat dan klik bookmark tersebut!");
            }}
            className="inline-flex w-full items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-650 hover:to-pink-650 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl shadow-lg cursor-grab active:cursor-grabbing select-none transition-all duration-200 hover:scale-[1.01]"
          >
            ⭐ OMNISTREAM LINKER ⭐
          </a>

          <p className="text-[9px] text-indigo-400 font-semibold italic animate-pulse">
            ← Seret tombol ini ke Bookmarks Bar Anda (Ctrl + Shift + B) →
          </p>
        </div>

        <div className="space-y-2.5 text-[10.5px] leading-relaxed text-slate-400 bg-slate-950/20 p-3 rounded-xl border border-slate-900">
          <p className="font-bold text-slate-300 border-b border-slate-900 pb-1 flex items-center gap-1 text-[10px] uppercase">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> Cara Koneksi Seamless 1-Klik:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>Aktifkan Bookmarks Bar (Tekan <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded font-mono text-[9px]">Ctrl+Shift+B</code> atau <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded font-mono text-[9px]">⌘+Shift+B</code>).</li>
            <li><strong>Seret tombol "OMNISTREAM LINKER"</strong> di atas ke Bookmarks Bar browser Anda.</li>
            <li>Buka halaman <strong>YouTube Live Chat</strong> (Pop-out chat dari YouTube Studio/Video sangat direkomendasikan!).</li>
            <li><strong>Klik Bookmark tersebut!</strong> Banner sukses & HUD panel mini akan muncul di sudut kanan bawah. Komentar akan otomatis mengalir ke dashboard ini secara real-time!</li>
          </ol>
        </div>
      </div>


    </div>
  );
}
