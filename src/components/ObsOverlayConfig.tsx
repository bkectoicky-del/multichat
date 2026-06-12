import React, { useState, useEffect } from "react";
import { Copy, Check, Tv, Sliders, Eye, Settings2, HelpCircle } from "lucide-react";

interface ObsOverlayConfigProps {
  appUrl: string;
}

export default function ObsOverlayConfig({ appUrl }: ObsOverlayConfigProps) {
  // Config states
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontFamily, setFontFamily] = useState<string>("font-sans");
  const [textColor, setTextColor] = useState<string>("#ffffff");
  const [authorColorMode, setAuthorColorMode] = useState<"platform" | "solid" | "neon">("platform");
  const [customAuthorColor, setCustomAuthorColor] = useState<string>("#f43f5e");
  const [useTextShadow, setUseTextShadow] = useState<boolean>(true);
  const [hidePlatform, setHidePlatform] = useState<boolean>(false);
  const [showAvatar, setShowAvatar] = useState<boolean>(true);
  const [maxChats, setMaxChats] = useState<number>(8);
  const [layoutStyle, setLayoutStyle] = useState<"minimal" | "card" | "bubble">("bubble");
  const [direction, setDirection] = useState<"bottom-up" | "top-down">("bottom-up");
  const [animationSpeed, setAnimationSpeed] = useState<"none" | "slice" | "fade">("slice");
  const [playTts, setPlayTts] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);

  // Generate URL based on state
  const getGeneratedUrl = () => {
    // We can use pathname "/overlay" or query parameter "overlay=true"
    const params = new URLSearchParams();
    params.set("fontSize", `${fontSize}px`);
    params.set("fontFamily", fontFamily);
    params.set("textColor", encodeURIComponent(textColor));
    params.set("authorColorMode", authorColorMode);
    if (authorColorMode !== "platform") {
      params.set("customAuthorColor", encodeURIComponent(customAuthorColor));
    }
    params.set("useTextShadow", String(useTextShadow));
    params.set("hidePlatform", String(hidePlatform));
    params.set("showAvatar", String(showAvatar));
    params.set("limit", String(maxChats));
    params.set("theme", layoutStyle);
    params.set("direction", direction);
    params.set("animate", animationSpeed);
    params.set("playTts", String(playTts));

    return `${appUrl}/overlay?${params.toString()}`;
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(getGeneratedUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Mock messages for preview simulator
  const mockPrevMessages = [
    {
      id: "preview-1",
      platform: "youtube" as const,
      author: "Yura_Gaming",
      message: "Halo bang! Overlaynya bersih banget nih, mantap 👍",
      timestamp: Date.now() - 15000,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=60"
    },
    {
      id: "preview-2",
      platform: "tiktok" as const,
      author: "Adit_Subagja",
      message: "TTS nya lancar jaya ya, suara bahasa indonesianya makin luwes sekarang!",
      timestamp: Date.now() - 8000,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=60"
    },
    {
      id: "preview-3",
      platform: "facebook" as const,
      author: "Siti Rahma K.",
      message: "Izin share live ya bang biar rame penontonnya!",
      timestamp: Date.now() - 3000,
      avatar: ""
    }
  ];

  const getFontFamilyClass = (f: string) => {
    if (f === "font-mono") return "font-mono";
    if (f === "font-serif") return "font-serif font-medium";
    if (f === "font-grotesk") return "font-sans tracking-tight font-extrabold";
    return "font-sans";
  };

  return (
    <div id="obs-overlay-config-container" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Title Header */}
      <div className="p-4 px-5 border-b border-slate-850 bg-slate-900/60 flex items-center justify-between">
        <span className="text-slate-200 font-bold text-sm flex items-center gap-2">
          <Tv className="w-4 h-4 text-pink-400" />
          Integrasi OBS Studio & Overlay HUD
        </span>
        <span className="px-2.5 py-0.5 bg-pink-500/10 text-pink-400 text-[10px] rounded-full border border-pink-500/20 font-bold uppercase tracking-wider animate-pulse">
          Transparent Ready
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
        
        {/* Left column: Parameters and Customizer (6 Cols) */}
        <div className="p-5 lg:col-span-6 space-y-5">
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-slate-350 uppercase tracking-widest flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Sesuaikan Desain Chat Overlay
            </h3>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Atur tampilan, ukuran tulisan, dan efek chat agar seimbang dengan layout streaming Anda di OBS.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Font Family Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Jenis Font (Keluarga)</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none transition duration-150"
              >
                <option value="font-sans">Inter (Modern Sans)</option>
                <option value="font-grotesk">Space Grotesk (Tech Extra Bold)</option>
                <option value="font-mono">JetBrains Mono (Sleek Hacker Code)</option>
                <option value="font-serif">Merriweather (Literary Serif)</option>
              </select>
            </div>

            {/* Font Size Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ukuran Huruf Chat</label>
                <span className="text-[10px] font-mono font-bold text-indigo-400">{fontSize}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="36"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Text Color Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Warna Teks Pesan</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-7 bg-slate-950 border border-slate-800 rounded cursor-pointer"
                />
                <input
                  type="text"
                  maxLength={7}
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Author Color Configuration */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Warna Nama Pengirim</label>
              <select
                value={authorColorMode}
                onChange={(e) => setAuthorColorMode(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none transition duration-150"
              >
                <option value="platform">Sesuai Platform (Merah/Pink/Biru)</option>
                <option value="solid">Satu Warna Tetap di Bawah</option>
                <option value="neon">Glow Neon Putih Berwarna</option>
              </select>
            </div>

            {/* Custom Author Color Colorpicker when solid is chosen */}
            {authorColorMode === "solid" && (
              <div className="space-y-1.5 col-span-1 border-t border-slate-850 pt-2 transition duration-150 animate-fade-in">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Warna Nama Spesifik</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={customAuthorColor}
                    onChange={(e) => setCustomAuthorColor(e.target.value)}
                    className="w-8 h-7 bg-slate-950 border border-slate-800 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    maxLength={7}
                    value={customAuthorColor}
                    onChange={(e) => setCustomAuthorColor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Layout Themes Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tipe Balon Chat (Tema)</label>
              <select
                value={layoutStyle}
                onChange={(e) => setLayoutStyle(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none transition duration-150"
              >
                <option value="bubble">Batu Slate / Bubble (Ada Background Halus)</option>
                <option value="card">Modern Card Box (Kotak Minimalis Bergaris)</option>
                <option value="minimal">Zero-Border (Teks Tanpa Balon / Klasik OBS)</option>
              </select>
            </div>

            {/* Alignments Orientation config */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Arah Muncul Chat</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none transition duration-150"
              >
                <option value="bottom-up">Bawah ke Atas (Baru di Bawah, Dorong ke Atas)</option>
                <option value="top-down">Atas ke Bawah (Baru di Atas, Dorong ke Bawah)</option>
              </select>
            </div>

            {/* Limit visible overlay chats count to prevent dom overflow */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Limit Chat di Layar</label>
              <select
                value={maxChats}
                onChange={(e) => setMaxChats(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none transition duration-150"
              >
                <option value={5}>Maksimal 5 Chat Terlihat</option>
                <option value={8}>Maksimal 8 Chat Terlihat</option>
                <option value={12}>Maksimal 12 Chat Terlihat</option>
                <option value={15}>Maksimal 15 Chat Terlihat</option>
                <option value={20}>Maksimal 20 Chat Terlihat</option>
              </select>
            </div>

            {/* Animation speeds layout */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Animasi Masuk</label>
              <select
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/60 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none transition duration-150"
              >
                <option value="slice">Smooth Slide & Fade (Rekomendasi)</option>
                <option value="fade">Hanya Fade-In Efek Lembut</option>
                <option value="none">Tanpa Animasi (Instan/CPU Ringan)</option>
              </select>
            </div>
          </div>

          {/* Swithces Option Row */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-850">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useTextShadow}
                onChange={(e) => setUseTextShadow(e.target.checked)}
                className="rounded text-indigo-600 bg-slate-950 border-slate-800 w-4 h-4 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] text-slate-350 font-medium">Beri Bayangan Teks (Mudah Dibaca)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hidePlatform}
                onChange={(e) => setHidePlatform(e.target.checked)}
                className="rounded text-indigo-600 bg-slate-950 border-slate-800 w-4 h-4 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] text-slate-350 font-medium">Sembunyikan Badge Platform</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAvatar}
                onChange={(e) => setShowAvatar(e.target.checked)}
                className="rounded text-indigo-600 bg-slate-950 border-slate-800 w-4 h-4 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] text-slate-350 font-medium">Tampilkan Foto Profil (Avatar)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none border border-slate-800/40 p-1 px-2 rounded-lg bg-slate-950/20">
              <input
                type="checkbox"
                checked={playTts}
                onChange={(e) => setPlayTts(e.target.checked)}
                className="rounded text-pink-600 bg-slate-950 border-slate-800 w-4 h-4 focus:ring-0 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-[11px] text-pink-450 font-bold">Aktifkan TTS di OBS</span>
                <span className="text-[8.5px] text-slate-500 font-medium">(Rekomendasi: Matikan/Uncheck)</span>
              </div>
            </label>
          </div>

          {/* Output Link Generation Section */}
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-400">🔗 Link Browser Source OBS</span>
              {copied && (
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-fade-in flex items-center gap-1">
                  <Check className="w-3 h-3" /> Berhasil Disalin!
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={getGeneratedUrl()}
                className="w-full bg-slate-900 border border-slate-800 focus:outline-none rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 truncate"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold leading-none rounded-lg text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Interactive Overlay Simulator (6 Cols) */}
        <div className="p-5 lg:col-span-6 bg-slate-900/30 flex flex-col gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-slate-350 uppercase tracking-widest flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-pink-400" />
              Live Preview Simulator (Transparent Check)
            </h3>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Ini adalah simulasi tampilan di OBS Studio dengan background catur hitam (simbol transparansi).
            </p>
          </div>

          {/* Simulated Screen with Checkerboard Transparent Background pattern CSS */}
          <div className="relative flex-grow min-h-[220px] rounded-2xl border border-dashed border-slate-800/80 overflow-hidden flex flex-col p-4 justify-end shrink-0" 
            style={{ 
              backgroundImage: "radial-gradient(#1e293b 1px, transparent 0), radial-gradient(#1e293b 1px, transparent 0)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 8px 8px"
            }}
          >
            {/* Absolute Transparent Banner Label */}
            <div className="absolute top-3 right-3 text-[8.5px] bg-slate-950/80 text-slate-500 px-2 py-0.5 rounded border border-slate-800 font-mono tracking-widest pointer-events-none">
              TRANSPARENT BACKGROUND STAGE
            </div>

            {/* Cascade chat items container */}
            <div className={`space-y-3 w-full flex flex-col justify-end ${direction === "top-down" ? "flex-col-reverse" : "flex-col"}`}>
              {mockPrevMessages.map((msg) => {
                let badgeColor = "bg-slate-800 text-slate-300";
                let badgeLabel = "💬 Info";
                let nameColor = customAuthorColor;

                if (authorColorMode === "platform") {
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
                } else if (authorColorMode === "neon") {
                  nameColor = "#e2e8f0"; // Near White with Glow style outline
                }

                const fontClass = getFontFamilyClass(fontFamily);
                const textShadowStyle = useTextShadow ? { textShadow: "1px 1px 3px rgba(0,0,0,0.95), -1px -1px 3px rgba(0,0,0,0.95), 0 0 5px rgba(0,0,0,0.8)" } : {};
                const authorGlowStyle = authorColorMode === "neon" ? "shadow-[0_0_8px_rgba(255,255,255,0.25)] border-[0.5px] border-slate-100/10" : "";

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 transition duration-150 rounded-xl leading-relaxed ${fontClass} ${
                      layoutStyle === "bubble" ? "bg-slate-950/85 p-2.5 px-3.5 border border-slate-900 shadow-md max-w-[90%]" : 
                      layoutStyle === "card" ? "bg-slate-950/40 p-2 border border-slate-800" : "p-0.5"
                    }`}
                  >
                    {/* User profile picture/avatar if enabled */}
                    {showAvatar && (
                      <div className="shrink-0">
                        {msg.avatar ? (
                          <img
                            src={msg.avatar}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full border border-slate-800 object-cover shadow"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-950 border border-indigo-800/80 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                            {msg.author[0]}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Platform Badge representation */}
                        {!hidePlatform && (
                          <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                        )}

                        {/* Author display */}
                        <span 
                          style={{ color: nameColor, ...textShadowStyle }} 
                          className={`font-extrabold text-[12px] ${authorColorMode === "neon" ? "bg-slate-950 px-1.5 py-0.5 rounded text-white" : ""}`}
                        >
                          {msg.author}
                        </span>
                      </div>

                      {/* Chat text contents */}
                      <p 
                        style={{ color: textColor, fontSize: `${fontSize - 2}px`, ...textShadowStyle }} 
                        className="mt-0.5 whitespace-pre-wrap leading-relaxed font-medium break-all"
                      >
                        {msg.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick instructions HUD */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="text-[10.5px] font-bold text-slate-350 uppercase tracking-wide flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              Cara Penggunaan di OBS Studio:
            </div>
            <ol className="text-[10px] text-slate-450 space-y-1 list-decimal list-inside pl-1 leading-relaxed">
              <li>Lakukan <span className="text-white font-bold">Copy</span> alamat tautan/link di atas.</li>
              <li>Buka <span className="text-white font-bold">OBS Studio</span> milik Anda.</li>
              <li>Di bagian <span className="text-white font-bold">Sources</span>, klik tombol <span className="text-indigo-400 font-bold">+</span> lalu pilih <span className="text-red-400 font-bold">Browser</span>.</li>
              <li>Beri nama (misal: "Icky Live Chat Overlay"), lalu klik OK.</li>
              <li>Tempel (Paste) link di bagian input <span className="text-white font-bold">URL</span>.</li>
              <li>Set <span className="text-white font-bold">Width</span> ke <span className="text-pink-400 font-bold">420</span> dan <span className="text-white font-bold">Height</span> ke <span className="text-pink-400 font-bold">600</span> (sesuai rasio overlay live milik Anda).</li>
              <li>Centang opsi <span className="text-slate-350 italic">"Refresh browser when scene becomes active"</span> agar menyala otomatis. Klik OK!</li>
            </ol>
          </div>
        </div>

      </div>
    </div>
  );
}
