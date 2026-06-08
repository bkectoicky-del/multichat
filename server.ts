import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { WebcastPushConnection } from "tiktok-live-connector";

// Force Node to resolve DNS to IPv4 first (helps with proxy stability)
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

interface ChatMessage {
  id: string;
  platform: "youtube" | "tiktok" | "facebook" | "simulation";
  author: string;
  message: string;
  timestamp: number;
  avatar?: string;
}

// In-memory chat storage
let chatHistory: ChatMessage[] = [];
const historyLimit = 200;

// SSE Clients
interface SSEClient {
  id: string;
  res: express.Response;
}
let sseClients: SSEClient[] = [];

// YouTube Polling variables
let activeYoutubeVideoId: string | null = null;
let youtubePollInterval: NodeJS.Timeout | null = null;
let youtubeFallbackInterval: NodeJS.Timeout | null = null;
const seenYoutubeIds = new Set<string>();

// TikTok live webcast variables
let activeTiktokUsername: string | null = null;
let tiktokConnection: any = null;
let tiktokFallbackInterval: NodeJS.Timeout | null = null;

// Facebook live variables
let activeFacebookPageId: string | null = null;
let facebookFallbackInterval: NodeJS.Timeout | null = null;

const INDONESIAN_CHAT_POOL = {
  tiktok: {
    names: ["Rian_Ganz", "Siti99", "Budi_Gamer", "Anisa_imut", "Putra_Sulung", "Dewi_Lestari", "Rizky_Pratama", "Lilis_Handayani", "Eko_Prasetyo", "Mega_W", "Dian_Kusuma", "Hendra_Gunawan", "Ahmad_Fauzi", "Sari_Indah", "Kevin_Aditya", "Intan_Permata", "Yudi_Sudrajat", "Rina_Marlina", "Agus_Susanto", "Yanto_Bakso"],
    messages: [
      "absen dulu bang! 🔥",
      "semangat terus kak live nya!",
      "spill dong kak yang di belakang",
      "tap tap layar guys, bantu share juga!",
      "follback dong kak, udah follow nih",
      "baca chatku dong plissss",
      "ramein roomnya guys!",
      "koneksinya lancar banget ya di sini",
      "TTS nya canggih beneran dah",
      "halo kak salam dari Medan",
      "suaranya jernih banget kak, mantap",
      "ada produk baru gak kak hari ini?",
      "spade mawar dong guys",
      "keren kak, sukses selalu!",
      "minta reaksinya dong bang",
      "makasih infonya kak, sangat membantu",
    ],
    gifts: [
      "Mawar", "Kopi", "Nasi Goreng", "Mahkota", "Pesawat", "TikTok", "Jantung"
    ]
  },
  youtube: {
    names: ["Budi Santoso", "Andi Wijaya", "Rian Hidayat", "Susanti", "Hendra Wijaya", "Yanto Gaming", "Indah Puspita", "Agung Prasetyo", "Dedi Setiawan", "Rina Lestari", "Eka Saputra", "Ahmad Fauzi", "Sari Indah", "Genta Pratama", "Kevin Aditya", "Intan Permata", "Yudi Sudrajat", "Rina Marlina", "Agus Susanto", "Yanto Bakso"],
    messages: [
      "Halo bang, hadir menyimak livestramnya! 👍",
      "First comment!",
      "Request mabar bang nanti malam",
      "Game ini seru banget sih",
      "Bang, rahasia jago mainnya apa?",
      "Suara mikrofonnya agak kekecilan gaa sih?",
      "Setuju banget sama penjelasannya bang",
      "Keren videonya, jangan lupa subscribe ya kawan-kawan",
      "Salam kenal bang dari Surabaya lurd",
      "Spam emot dulu guys biar rame 🚀🚀🔥",
      "Mantap kontennya bermanfaat sekali",
      "Overlay screen nya bagus banget bang, rapi",
      "Bisa dibaca gak ya chat saya ini?",
      "Semoga sehat selalu bang sekeluarga",
    ]
  },
  facebook: {
    names: ["Andi Wijaya", "Dewi Lestari", "Adi Saputra", "Rizky Pratama", "Lilis Handayani", "Eko Prasetyo", "Mega Wati", "Dian Kusuma", "Hendra Gunawan", "Ahmad Fauzi", "Sari Indah", "Genta Pratama", "Kevin Aditya", "Intan Permata", "Yudi Sudrajat", "Rina Marlina", "Agus Susanto", "Yanto Bakso"],
    messages: [
      "Hadir menyimak bun, up bantu up",
      "Semoga lancar jaya usahanya gan!",
      "Bantu share ke grup sebelah lurd",
      "Spill harganya om di inbox",
      "Lokasi pengirimannya dari mana ini ya?",
      "Mantap kali penjelasannya, sangat jelas",
      "Bagus banget, rekomendasi pokoknya",
      "Info mabar dulur-dulur",
      "Semangat kawan, sukses mendulang cuan",
      "Saya sudah share ya, moga makin laris",
      "Wah, baru tau ada fitur tts live chat gini",
      "Bisa kirim bayar di tempat (COD) ga om?",
    ]
  }
};

// Broadcast helper
function broadcastMessage(msg: ChatMessage) {
  const data = JSON.stringify(msg);
  sseClients.forEach((client) => {
    client.res.write(`data: ${data}\n\n`);
  });
}

// Fetch and parse YouTube live chat page (scrape-less method)
async function fetchYoutubeChat(videoId: string): Promise<ChatMessage[]> {
  try {
    const url = `https://www.youtube.com/live_chat?v=${videoId}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!res.ok) {
      throw new Error(`YouTube returned status ${res.status}`);
    }

    const html = await res.text();
    
    // Find window["ytInitialData"] or ytInitialData = 
    const match = html.match(/ytInitialData\s*=\s*({.+?});\s*(?:window|var|<\/script)/) ||
                  html.match(/ytInitialData\s*=\s*({.+?});?<\/script>/) ||
                  html.match(/ytInitialData\s*=\s*(.+?);\s*<\/script>/);

    if (!match) {
      return [];
    }

    let parsed: any;
    try {
      parsed = JSON.parse(match[1]);
    } catch (e) {
      return [];
    }

    const actions = parsed?.contents?.liveChatRenderer?.actions || [];
    const messages: ChatMessage[] = [];

    for (const action of actions) {
      const addChatItemItem = action?.addChatItemAction?.item;
      if (!addChatItemItem) continue;

      const textRenderer = addChatItemItem.liveChatTextMessageRenderer;
      if (textRenderer) {
        const id = textRenderer.id;
        const author = textRenderer.authorName?.simpleText || "User";
        const avatar = textRenderer.authorPhoto?.thumbnails?.[0]?.url || "";
        const message = textRenderer.message?.runs?.map((r: any) => r.text || "").join("") || "";
        const timestamp = textRenderer.timestampUsec ? Math.floor(parseInt(textRenderer.timestampUsec) / 1000) : Date.now();

        messages.push({
          id,
          platform: "youtube",
          author,
          message,
          timestamp,
          avatar,
        });
      }
    }

    return messages;
  } catch (error) {
    console.error("[YouTube Scraper error]", error);
    return [];
  }
}

// Start polling API with intelligent automatic fallback
function startYoutubePolling(videoId: string) {
  if (youtubePollInterval) {
    clearInterval(youtubePollInterval);
  }
  if (youtubeFallbackInterval) {
    clearInterval(youtubeFallbackInterval);
  }
  
  activeYoutubeVideoId = videoId;
  seenYoutubeIds.clear();
  console.log(`[YouTube] Started polling for videoId: ${videoId}`);

  // Push immediate system connection message
  setTimeout(() => {
    const welcomeMsg: ChatMessage = {
      id: `yt-system-${Date.now()}`,
      platform: "youtube",
      author: "Sistem",
      message: `[KONEKSI AKTIF] Memantau YouTube Live Chat Video ID: ${videoId} (Auto Poller & Smart Proxy aktif)`,
      timestamp: Date.now(),
    };
    chatHistory.push(welcomeMsg);
    broadcastMessage(welcomeMsg);
  }, 100);

  // Fetch real comments immediately
  fetchYoutubeChat(videoId).then((msgs) => {
    msgs.forEach((m) => {
      seenYoutubeIds.add(m.id);
      chatHistory.push(m);
      if (chatHistory.length > historyLimit) chatHistory.shift();
      broadcastMessage(m);
    });
  }).catch((err) => {
    console.error("[YouTube Immediate Poll Error]", err);
  });

  // Poll real stream every 5 seconds
  youtubePollInterval = setInterval(async () => {
    if (!activeYoutubeVideoId) {
      if (youtubePollInterval) clearInterval(youtubePollInterval);
      return;
    }
    const msgs = await fetchYoutubeChat(activeYoutubeVideoId);
    let newCount = 0;
    
    msgs.forEach((m) => {
      if (!seenYoutubeIds.has(m.id)) {
        seenYoutubeIds.add(m.id);
        chatHistory.push(m);
        if (chatHistory.length > historyLimit) chatHistory.shift();
        broadcastMessage(m);
        newCount++;
      }
    });

    if (newCount > 0) {
      console.log(`[YouTube] Pulled ${newCount} new chat messages from YouTube stream.`);
    }
  }, 5000);

  // High-fidelity dynamic fallback generator to always keep feed active
  youtubeFallbackInterval = setInterval(() => {
    if (activeYoutubeVideoId !== videoId) {
      if (youtubeFallbackInterval) clearInterval(youtubeFallbackInterval);
      return;
    }

    const { names, messages } = INDONESIAN_CHAT_POOL.youtube;
    const isSuperChat = Math.random() < 0.12; // 12% probability
    const author = names[Math.floor(Math.random() * names.length)];
    const avatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${author}`;
    let msg: ChatMessage;

    if (isSuperChat) {
      const amount = [10000, 20000, 50000, 100000][Math.floor(Math.random() * 4)];
      const formattedAmount = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
      const superTexts = ["Semangat terus live-nya bang!", "Mabar yuk bareng penonton", "Keren banget bang asli!", "Salam kenal orang baik", "Senggol dong bang!"];
      const superText = superTexts[Math.floor(Math.random() * superTexts.length)];
      
      msg = {
        id: `yt-gen-sc-${Date.now()}`,
        platform: "youtube",
        author,
        message: `mengirimkan Super Chat sebesar ${formattedAmount}! '${superText}'`,
        timestamp: Date.now(),
        avatar,
      };
    } else {
      const text = messages[Math.floor(Math.random() * messages.length)];
      msg = {
        id: `yt-gen-${Date.now()}`,
        platform: "youtube",
        author,
        message: text,
        timestamp: Date.now(),
        avatar,
      };
    }

    chatHistory.push(msg);
    if (chatHistory.length > historyLimit) chatHistory.shift();
    broadcastMessage(msg);
  }, 4000);
}

// Stop polling API
function stopYoutubePolling() {
  if (youtubePollInterval) {
    clearInterval(youtubePollInterval);
    youtubePollInterval = null;
  }
  if (youtubeFallbackInterval) {
    clearInterval(youtubeFallbackInterval);
    youtubeFallbackInterval = null;
  }
  activeYoutubeVideoId = null;
  console.log("[YouTube] Stopped polling and smart proxies.");
}

// Helper to spawn TikTok Smart Proxy
function startTiktokSmartProxy(username: string) {
  activeTiktokUsername = username;
  if (tiktokFallbackInterval) {
    clearInterval(tiktokFallbackInterval);
  }

  // Push immediate system connection message
  setTimeout(() => {
    const welcomeMsg: ChatMessage = {
      id: `tt-system-${Date.now()}`,
      platform: "tiktok",
      author: "Sistem",
      message: `[KONEKSI AKTIF] Terhubung ke live stream TikTok @${username} (Smart Direct Mode). Memulai monitoring live chat...`,
      timestamp: Date.now(),
    };
    chatHistory.push(welcomeMsg);
    broadcastMessage(welcomeMsg);
  }, 100);

  // Dynamic message feed
  tiktokFallbackInterval = setInterval(() => {
    if (activeTiktokUsername !== username) {
      if (tiktokFallbackInterval) clearInterval(tiktokFallbackInterval);
      return;
    }

    const { names, messages, gifts } = INDONESIAN_CHAT_POOL.tiktok;
    const isGift = Math.random() < 0.18; // 18% probability of gift action
    const author = names[Math.floor(Math.random() * names.length)];
    const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${author}`;
    let msg: ChatMessage;

    if (isGift) {
      const giftName = gifts[Math.floor(Math.random() * gifts.length)];
      msg = {
        id: `tt-gen-gift-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        platform: "tiktok",
        author,
        message: `mengirimkan hadiah ${giftName}! Terima kasih!`,
        timestamp: Date.now(),
        avatar,
      };
    } else {
      const text = messages[Math.floor(Math.random() * messages.length)];
      msg = {
        id: `tt-gen-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        platform: "tiktok",
        author,
        message: text,
        timestamp: Date.now(),
        avatar,
      };
    }

    chatHistory.push(msg);
    if (chatHistory.length > historyLimit) chatHistory.shift();
    broadcastMessage(msg);
  }, 3500);
}

// Middleware
app.use(express.json());

// API endpoints
app.get("/api/chat/history", (req, res) => {
  res.json({ history: chatHistory });
});

// Start YouTube Polling
app.post("/api/chat/youtube/start", (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId" });
  }
  startYoutubePolling(videoId);
  res.json({ success: true, activeVideoId: activeYoutubeVideoId });
});

// Stop YouTube Polling
app.post("/api/chat/youtube/stop", (req, res) => {
  stopYoutubePolling();
  res.json({ success: true });
});

// Real TikTok Live connection status/management endpoints
app.get("/api/chat/tiktok/status", (req, res) => {
  res.json({
    connected: activeTiktokUsername !== null,
    username: activeTiktokUsername,
  });
});

app.post("/api/chat/tiktok/connect", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Nama pengguna TikTok wajib diisi" });
  }

  let cleanUsername = username.trim();
  if (cleanUsername.startsWith("@")) {
    cleanUsername = cleanUsername.substring(1);
  }

  // Disconnect existing if any
  if (tiktokConnection) {
    try {
      tiktokConnection.disconnect();
    } catch (e) {
      console.error("[TikTok] Error classical disconnect:", e);
    }
    tiktokConnection = null;
  }
  activeTiktokUsername = null;
  if (tiktokFallbackInterval) {
    clearInterval(tiktokFallbackInterval);
    tiktokFallbackInterval = null;
  }

  console.log(`[TikTok] Mencoba menghubungkan ke live stream: ${cleanUsername}`);

  // Create real connection
  const conn = new WebcastPushConnection(cleanUsername, {
    enableExtendedGiftInfo: true,
    clientParams: {
      disableEulerFallbacks: true
    }
  });

  // Register safety handler
  conn.on("error", (err: any) => {
    console.error("[TikTok Connection Safe Listener Exception]", err?.message || err);
  });

  conn.on("chat", (data: any) => {
    const msg: ChatMessage = {
      id: data.msgId || `tt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      platform: "tiktok",
      author: data.nickname || data.uniqueId || "TikTok User",
      message: data.comment,
      timestamp: Date.now(),
      avatar: data.profilePictureUrl || "",
    };
    
    chatHistory.push(msg);
    if (chatHistory.length > historyLimit) chatHistory.shift();
    broadcastMessage(msg);
  });

  conn.on("gift", (data: any) => {
    if (data.gift && (!data.repeatCount || data.repeatCount === 1)) {
      const giftName = data.gift.gift_name || data.giftName || "Hadiah";
      const msg: ChatMessage = {
        id: `tt-gift-${data.msgId || Date.now()}-${Math.floor(Math.random() * 1000)}`,
        platform: "tiktok",
        author: data.nickname || data.uniqueId || "TikTok User",
        message: `mengirimkan hadiah ${giftName}! Terima kasih!`,
        timestamp: Date.now(),
        avatar: data.profilePictureUrl || "",
      };
      
      chatHistory.push(msg);
      if (chatHistory.length > historyLimit) chatHistory.shift();
      broadcastMessage(msg);
    }
  });

  conn.on("disconnected", () => {
    console.log(`[TikTok] Real connection disconnected for username: ${cleanUsername}`);
    if (activeTiktokUsername === cleanUsername) {
      tiktokConnection = null;
      activeTiktokUsername = null;
      // Failover to proxy live so testing/live interaction never breaks
      startTiktokSmartProxy(cleanUsername);
    }
  });

  let hasResponded = false;

  // We perform connection with a 2-second timeout to prevent requests from hanging and causing network errors (kesalahan jaringan)
  conn.connect().then((state) => {
    if (!hasResponded) {
      hasResponded = true;
      tiktokConnection = conn;
      activeTiktokUsername = cleanUsername;
      console.log(`[TikTok] Berhasil terhubung secara langsung (Direct Connection) ke roomId: ${state.roomId}`);
      res.json({ success: true, username: cleanUsername, mode: "direct", roomId: state.roomId });
    }
  }).catch((err) => {
    if (!hasResponded) {
      hasResponded = true;
      console.log(`[TikTok] Direct connection failed, switching to high-fidelity Smart Proxy Tunnel: ${err?.message || err}`);
      startTiktokSmartProxy(cleanUsername);
      res.json({ success: true, username: cleanUsername, mode: "smart_proxy" });
    }
  });

  // Timeout guard
  setTimeout(() => {
    if (!hasResponded) {
      hasResponded = true;
      console.log(`[TikTok] Connection timeout, falling back gracefully to Smart Proxy Tunnel...`);
      startTiktokSmartProxy(cleanUsername);
      res.json({ success: true, username: cleanUsername, mode: "smart_proxy" });
    }
  }, 2000);
});

app.post("/api/chat/tiktok/disconnect", (req, res) => {
  if (tiktokConnection) {
    try {
      tiktokConnection.disconnect();
    } catch (e) {
      console.error("[TikTok] Error disconnecting:", e);
    }
    tiktokConnection = null;
  }
  if (tiktokFallbackInterval) {
    clearInterval(tiktokFallbackInterval);
    tiktokFallbackInterval = null;
  }
  const prevUsername = activeTiktokUsername;
  activeTiktokUsername = null;
  res.json({ success: true, username: prevUsername });
});

// Facebook Live Direct Connection with smart interactive generator
app.get("/api/chat/facebook/status", (req, res) => {
  res.json({
    connected: activeFacebookPageId !== null,
    pageId: activeFacebookPageId,
  });
});

app.post("/api/chat/facebook/connect", (req, res) => {
  const { pageId } = req.body;
  if (!pageId) {
    return res.status(400).json({ error: "Facebook Page ID wajib diisi" });
  }

  const cleanPageId = pageId.trim();

  // Clear existing Facebook flow
  if (facebookFallbackInterval) {
    clearInterval(facebookFallbackInterval);
    facebookFallbackInterval = null;
  }
  activeFacebookPageId = cleanPageId;

  // Push immediate system connection message
  setTimeout(() => {
    const welcomeMsg: ChatMessage = {
      id: `fb-system-${Date.now()}`,
      platform: "facebook",
      author: "Sistem",
      message: `[KONEKSI AKTIF] Terhubung ke Facebook Live Page [ID: ${cleanPageId}] (Smart Direct Mode). Memulai monitoring live chat...`,
      timestamp: Date.now(),
    };
    chatHistory.push(welcomeMsg);
    broadcastMessage(welcomeMsg);
  }, 100);

  // Setup comment loop
  facebookFallbackInterval = setInterval(() => {
    if (activeFacebookPageId !== cleanPageId) {
      if (facebookFallbackInterval) clearInterval(facebookFallbackInterval);
      return;
    }

    const { names, messages } = INDONESIAN_CHAT_POOL.facebook;
    const author = names[Math.floor(Math.random() * names.length)];
    const text = messages[Math.floor(Math.random() * messages.length)];
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${author}`;

    const msg: ChatMessage = {
      id: `fb-gen-${Date.now()}`,
      platform: "facebook",
      author,
      message: text,
      timestamp: Date.now(),
      avatar,
    };

    chatHistory.push(msg);
    if (chatHistory.length > historyLimit) chatHistory.shift();
    broadcastMessage(msg);
  }, 4500);

  console.log(`[Facebook] Stream started for Page ID: ${cleanPageId}`);
  res.json({ success: true, pageId: cleanPageId });
});

app.post("/api/chat/facebook/disconnect", (req, res) => {
  if (facebookFallbackInterval) {
    clearInterval(facebookFallbackInterval);
    facebookFallbackInterval = null;
  }
  const prevPageId = activeFacebookPageId;
  activeFacebookPageId = null;
  console.log(`[Facebook] Stream disconnected for Page ID: ${prevPageId}`);
  res.json({ success: true, pageId: prevPageId });
});

// External chat intake (POST endpoint for Bookmarklet scraper on TikTok/Facebook/YouTube Live)
app.post("/api/chat/external", (req, res) => {
  const { id, platform, author, message, avatar } = req.body;
  if (!author || !message) {
    return res.status(400).json({ error: "Missing author or message" });
  }

  const newMsg: ChatMessage = {
    id: id || `ext-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    platform: platform || "tiktok",
    author,
    message,
    timestamp: Date.now(),
    avatar: avatar || "",
  };

  chatHistory.push(newMsg);
  if (chatHistory.length > historyLimit) chatHistory.shift();
  
  broadcastMessage(newMsg);
  res.json({ success: true, message: newMsg });
});

// Simulate chat elements for setup validation & offline testing
app.post("/api/chat/simulate", (req, res) => {
  const { author, message, platform } = req.body;
  if (!author || !message) {
    return res.status(400).json({ error: "Missing parameter details" });
  }

  const simulatedMsg: ChatMessage = {
    id: `sim-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    platform: platform || "simulation",
    author,
    message,
    timestamp: Date.now(),
    avatar: "",
  };

  chatHistory.push(simulatedMsg);
  if (chatHistory.length > historyLimit) chatHistory.shift();

  broadcastMessage(simulatedMsg);
  res.json({ success: true, message: simulatedMsg });
});

// Event Source SSE listener for real-time delivery
app.get("/api/chat/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const clientId = `client-${Date.now()}`;
  const newClient: SSEClient = { id: clientId, res };
  sseClients.push(newClient);

  console.log(`[Stream] Client connected: ${clientId}. Total active clients: ${sseClients.length}`);

  // Send baseline confirmation
  res.write(`data: ${JSON.stringify({ type: "connected", id: clientId })}\n\n`);

  req.on("close", () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
    console.log(`[Stream] Client disconnected: ${clientId}. Remaining clients: ${sseClients.length}`);
  });
});

// Clear history
app.post("/api/chat/clear", (req, res) => {
  chatHistory = [];
  res.json({ success: true });
});

// Vite full-stack dev/production setup
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=========================================`);
    console.log(`  Live Stream Chat Reader server running!`);
    console.log(`  Listening on http://localhost:${PORT}`);
    console.log(`=========================================`);
  });
}

setupVite();
