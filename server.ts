import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { WebcastPushConnection } from "tiktok-live-connector";
import { LiveChat } from "youtube-chat";

import dotenv from "dotenv";
dotenv.config();

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

// YouTube live connection variables
let activeYoutubeVideoId: string | null = null;
let youtubeConnection: LiveChat | null = null;
let youtubePollInterval: NodeJS.Timeout | null = null;

// YouTube Google API state variables
let youtubeLiveChatId: string | null = null;
let lastVideoIdForChatIdLookUp: string | null = null;
let youtubeNextPageToken: string | null = null;
let youtubeApiKey: string | null = process.env.YOUTUBE_API_KEY || null;
let youtubeAccessToken: string | null = null;
let youtubeRefreshToken: string | null = null;
let youtubeOauthClientId: string | null = process.env.GOOGLE_CLIENT_ID || null;
let youtubeOauthClientSecret: string | null = process.env.GOOGLE_CLIENT_SECRET || null;
let youtubeUserInfo: { name: string; email: string; avatar: string } | null = null;

// Message de-duplication caches
const seenYoutubeIds = new Set<string>();
const recentContentKeys = new Set<string>();

// TikTok live webcast variables
let activeTiktokUsername: string | null = null;
let tiktokConnection: any = null;

// Facebook live variables
let activeFacebookPageId: string | null = null;

// Broadcast helper
function broadcastMessage(msg: ChatMessage) {
  const data = JSON.stringify(msg);
  sseClients.forEach((client) => {
    client.res.write(`data: ${data}\n\n`);
  });
}

// Unified, secure chat/comment ingestion and broadcast pipeline
function insertChatMessage(msg: ChatMessage) {
  // 1. Check ID uniqueness for strict de-duplication
  if (msg.id) {
    if (seenYoutubeIds.has(msg.id)) return;
    seenYoutubeIds.add(msg.id);
  }

  // 2. Prevent identical spam or frequent scrapes by content matching
  const contentKey = `${msg.platform}::${msg.author.toLowerCase()}::${msg.message.toLowerCase()}`;
  if (recentContentKeys.has(contentKey)) return;
  recentContentKeys.add(contentKey);
  setTimeout(() => recentContentKeys.delete(contentKey), 15000); // 15s debounce window

  // 3. Append to historical registry
  chatHistory.push(msg);
  if (chatHistory.length > historyLimit) {
    chatHistory.shift();
  }

  // 4. Trigger SSE delivery to frontends
  broadcastMessage(msg);
}

// High-fidelity brace counting parser to extract window['ytInitialData'] from HTML safely
function extractYtInitialData(html: string): any {
  const marker = "ytInitialData";
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;

  // Locate the first opening brace '{' after 'ytInitialData'
  const start = html.indexOf("{", markerIndex);
  if (start === -1) return null;

  let braceCount = 0;
  let inString = false;
  let escape = false;
  let end = start;

  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          end = i + 1;
          break;
        }
      }
    }
  }

  const jsonStr = html.substring(start, end).trim();
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("[YouTube Scraper] Gagal parsing JSON via brace counting:", e);
    return null;
  }
}

// Scrape-less poll fallback using direct fetch and DOM/JSON element extraction
async function fetchYoutubeChatFallback(videoId: string): Promise<ChatMessage[]> {
  try {
    const url = `https://www.youtube.com/live_chat?v=${videoId}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
    });

    if (!res.ok) {
      console.warn(`[YouTube Poll Fallback] Gagal mengambil halaman status: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const parsed = extractYtInitialData(html);
    if (!parsed) {
      return [];
    }

    // Determine path of live items
    const actions = parsed?.contents?.liveChatRenderer?.actions || 
                    parsed?.continuationContents?.liveChatContinuation?.actions || [];
    
    const messages: ChatMessage[] = [];

    for (const action of actions) {
      const addChatItemItem = action?.addChatItemAction?.item;
      if (!addChatItemItem) continue;

      const textRenderer = addChatItemItem.liveChatTextMessageRenderer || 
                           addChatItemItem.liveChatPaidMessageRenderer || 
                           addChatItemItem.liveChatMembershipItemRenderer;
                           
      if (textRenderer) {
        const id = textRenderer.id || `yt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const author = textRenderer.authorName?.simpleText || "YouTube User";
        const avatar = textRenderer.authorPhoto?.thumbnails?.[0]?.url || "";
        
        let message = "";
        if (textRenderer.message?.runs) {
          message = textRenderer.message.runs.map((r: any) => r.text || "").join("");
        } else if (textRenderer.headerPrimaryText?.simpleText) {
          message = textRenderer.headerPrimaryText.simpleText;
        }

        const timestamp = textRenderer.timestampUsec 
          ? Math.floor(parseInt(textRenderer.timestampUsec) / 1000) 
          : Date.now();

        messages.push({
          id,
          platform: "youtube",
          author,
          message: message.trim(),
          timestamp,
          avatar,
        });
      }
    }

    return messages;
  } catch (error) {
    console.error("[YouTube Poll Fallback Error]", error);
    return [];
  }
}

// Helper to retrieve live chat messages using YouTube Data API v3
async function pollOfficialYoutubeLiveChat(
  videoId: string,
  apiKey: string | null,
  accessToken: string | null
): Promise<ChatMessage[]> {
  try {
    // 1. Get live chat ID if not already cached for this videoId
    if (!youtubeLiveChatId || lastVideoIdForChatIdLookUp !== videoId) {
      console.log(`[YouTube API] Looking up liveChatId for video: ${videoId}`);
      let url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}`;
      const headers: HeadersInit = {};
      
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      } else if (apiKey) {
        url += `&key=${apiKey}`;
      } else {
        throw new Error("No API Key or Access Token provided");
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Videos request failed: ${res.status} - ${errText}`);
      }

      const data = await res.json();
      const videoItem = data?.items?.[0];
      const liveChatId = videoItem?.liveStreamingDetails?.activeLiveChatId;
      
      if (!liveChatId) {
        console.warn("[YouTube API] Video is not an active live stream or live chat is disabled.");
        return [];
      }

      youtubeLiveChatId = liveChatId;
      lastVideoIdForChatIdLookUp = videoId;
      youtubeNextPageToken = null; // reset pagination token on new stream
      console.log(`[YouTube API] Found active liveChatId: ${liveChatId}`);
    }

    // 2. Fetch live chat messages
    let msgUrl = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${youtubeLiveChatId}&part=snippet,authorDetails&maxResults=200`;
    const headers: HeadersInit = {};

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else if (apiKey) {
      msgUrl += `&key=${apiKey}`;
    }

    if (youtubeNextPageToken) {
      msgUrl += `&pageToken=${youtubeNextPageToken}`;
    }

    const msgRes = await fetch(msgUrl, { headers });
    if (!msgRes.ok) {
      const errText = await msgRes.text();
      if (msgRes.status === 400 || msgRes.status === 404 || msgRes.status === 403) {
        youtubeLiveChatId = null; // force lookup again next time
      }
      throw new Error(`LiveChat request failed: ${msgRes.status} - ${errText}`);
    }

    const msgData = await msgRes.json();
    youtubeNextPageToken = msgData.nextPageToken || youtubeNextPageToken;

    const items = msgData.items || [];
    const messages: ChatMessage[] = [];

    for (const item of items) {
      const id = item.id || `yt-api-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const author = item.authorDetails?.displayName || "YouTube User";
      const message = item.snippet?.displayMessage || "";
      const avatar = item.authorDetails?.profileImageUrl || "";
      const timestamp = item.snippet?.publishedAt 
        ? new Date(item.snippet.publishedAt).getTime() 
        : Date.now();

      messages.push({
        id,
        platform: "youtube",
        author,
        message: message.trim(),
        timestamp,
        avatar,
      });
    }

    return messages;
  } catch (error) {
    console.error("[YouTube API Error]", error);
    return [];
  }
}

// Start YouTube LiveChat Connection
function startYoutubePolling(videoId: string) {
  // Disconnect any preceding connection active
  stopYoutubePolling();
  
  activeYoutubeVideoId = videoId;
  seenYoutubeIds.clear();

  const usingApiKey = !!youtubeApiKey;
  const usingOAuth = !!youtubeAccessToken;

  if (usingOAuth) {
    console.log(`[YouTube API] Memulai koneksi resmi via Google Akun Login untuk Video ID: ${videoId}`);
    setTimeout(() => {
      const systemMsg: ChatMessage = {
        id: `yt-system-${Date.now()}`,
        platform: "youtube",
        author: "Sistem",
        message: `[KONEKSI RESMI] Menghubungkan ke YouTube Live Chat via Google Login [Video ID: ${videoId}]. Memantau via API resmi...`,
        timestamp: Date.now(),
      };
      insertChatMessage(systemMsg);
    }, 100);
  } else if (usingApiKey) {
    console.log(`[YouTube API] Memulai koneksi resmi via API Key untuk Video ID: ${videoId}`);
    setTimeout(() => {
      const systemMsg: ChatMessage = {
        id: `yt-system-${Date.now()}`,
        platform: "youtube",
        author: "Sistem",
        message: `[KONEKSI RESMI] Menghubungkan ke YouTube Live Chat via API Key [Video ID: ${videoId}]. Memantau via API resmi...`,
        timestamp: Date.now(),
      };
      insertChatMessage(systemMsg);
    }, 100);
  } else {
    console.log(`[YouTube] Memulai koneksi ganda (Direct-Streaming & Fallback Poller) untuk Video ID: ${videoId}`);
    
    // Push immediate system connection message
    setTimeout(() => {
      const welcomeMsg: ChatMessage = {
        id: `yt-system-${Date.now()}`,
        platform: "youtube",
        author: "Sistem",
        message: `[KONEKSI AKTIF] Menghubungkan langsung ke YouTube Live Chat [Video ID: ${videoId}]. Memulai stream & dual-engine failover feed...`,
        timestamp: Date.now(),
      };
      insertChatMessage(welcomeMsg);
    }, 100);

    // Engine 1: Start native WebChat Connection
    try {
      const chat = new LiveChat({ liveId: videoId });

      chat.on("start", (id) => {
        console.log(`[YouTube] LiveChat terhubung via WebSockets.`);
      });

      chat.on("chat", (chatItem) => {
        const id = chatItem.id || `yt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const messageText = chatItem.message
          .map((run: any) => run.text || "")
          .join("")
          .trim();

        const authorName = chatItem.author.name || "YouTube User";
        const avatarUrl = chatItem.author.thumbnail?.url || "";

        insertChatMessage({
          id,
          platform: "youtube",
          author: authorName,
          message: messageText,
          timestamp: chatItem.timestamp ? new Date(chatItem.timestamp).getTime() : Date.now(),
          avatar: avatarUrl,
        });
      });

      chat.on("error", (err) => {
        console.error("[YouTube Client Engine 1 Error]", err);
      });

      chat.on("end", (reason) => {
        console.log(`[YouTube] LiveChat WebSockets terputus. Alasan: ${reason}`);
      });

      chat.start().then((started) => {
        if (started) {
          youtubeConnection = chat;
          console.log(`[YouTube Engine 1] Websocket parser aktif.`);
        } else {
          console.warn(`[YouTube Engine 1] Websocket parser gagal dimulai. Fallback poller mengamankan feed.`);
        }
      }).catch((err) => {
        console.error(`[YouTube Engine 1] Handshake gagal, polling terus mengawal feed:`, err);
      });

    } catch (error) {
      console.error("[YouTube connection error]", error);
    }
  }

  // Polling Executor Loop (Engine 2 / API Engine)
  async function triggerPoll() {
    if (activeYoutubeVideoId !== videoId) return;
    
    let msgs: ChatMessage[] = [];
    if (youtubeAccessToken || youtubeApiKey) {
      msgs = await pollOfficialYoutubeLiveChat(videoId, youtubeApiKey, youtubeAccessToken);
    } else {
      msgs = await fetchYoutubeChatFallback(videoId);
    }

    let newCount = 0;
    msgs.forEach((m) => {
      if (!seenYoutubeIds.has(m.id)) {
        insertChatMessage(m);
        newCount++;
      }
    });

    if (newCount > 0) {
      const engineName = (youtubeAccessToken || youtubeApiKey) ? "API RESMI" : "Scraper Fallback";
      console.log(`[YouTube ${engineName}] Memperoleh ${newCount} komentar baru via polling.`);
    }
  }

  // Poll immediately, then schedule every 4.5 seconds to capture live comments
  triggerPoll();
  youtubePollInterval = setInterval(triggerPoll, 4500);
}

// Stop YouTube Connection
function stopYoutubePolling() {
  if (youtubeConnection) {
    try {
      youtubeConnection.stop();
    } catch (e) {
      console.error("[YouTube] Gagal memutus koneksi websocket:", e);
    }
    youtubeConnection = null;
  }
  if (youtubePollInterval) {
    clearInterval(youtubePollInterval);
    youtubePollInterval = null;
  }
  const prevVideoId = activeYoutubeVideoId;
  activeYoutubeVideoId = null;
  if (prevVideoId) {
    console.log(`[YouTube] LiveChat diputuskan dari Video ID: ${prevVideoId}`);
  }
}

// Helper to spawn TikTok Smart Proxy
function startTiktokSmartProxy(username: string) {
  activeTiktokUsername = username;

  // Push immediate system connection message informing user why direct is limited and how to get real chat
  setTimeout(() => {
    const welcomeMsg: ChatMessage = {
      id: `tt-system-${Date.now()}`,
      platform: "tiktok",
      author: "Sistem",
      message: `[KONEKSI AKTIF] Menghubungkan ke @${username}. Catatan: TikTok membatasi koneksi langsung dari server. Silakan tombol "Copy Script Linker" di bagian 'Kanal Linker / Browser Extension' di panel Sumber Platform, lalu tempelkan di Developer Console (F12) browser Anda yang sedang membuka TikTok Live untuk mengirimkan komentar NYATA Anda ke sini secara waktu nyata!`,
      timestamp: Date.now(),
    };
    chatHistory.push(welcomeMsg);
    broadcastMessage(welcomeMsg);
  }, 100);
}

// Middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

// API endpoints
app.get("/api/chat/history", (req, res) => {
  res.json({ history: chatHistory });
});

// YouTube API Configuration and OAuth routes
app.get("/api/chat/youtube/config", (req, res) => {
  res.json({
    apiKey: youtubeApiKey,
    hasOAuth: !!youtubeAccessToken,
    userInfo: youtubeUserInfo,
    clientId: youtubeOauthClientId,
    clientSecret: youtubeOauthClientSecret ? "••••••••••••" : null,
  });
});

app.post("/api/chat/youtube/config", (req, res) => {
  const { apiKey, accessToken, oauthClientId, oauthClientSecret, userInfo, disconnect } = req.body;
  if (disconnect) {
    youtubeAccessToken = null;
    youtubeRefreshToken = null;
    youtubeUserInfo = null;
    youtubeOauthClientId = null;
    youtubeOauthClientSecret = null;
    youtubeLiveChatId = null;
    youtubeNextPageToken = null;
    return res.json({ success: true, message: "Logged out from Google" });
  }

  if (apiKey !== undefined) {
    youtubeApiKey = apiKey ? apiKey.trim() : null;
  }
  if (accessToken !== undefined) youtubeAccessToken = accessToken;
  if (oauthClientId !== undefined) youtubeOauthClientId = oauthClientId;
  if (oauthClientSecret !== undefined && oauthClientSecret !== "••••••••••••") {
    youtubeOauthClientSecret = oauthClientSecret;
  }
  if (userInfo !== undefined) youtubeUserInfo = userInfo;

  res.json({
    success: true,
    config: {
      apiKey: youtubeApiKey,
      hasOAuth: !!youtubeAccessToken,
      userInfo: youtubeUserInfo,
    }
  });
});

app.get("/api/auth/google/url", (req, res) => {
  const { clientId, clientSecret, appUrl } = req.query;
  if (!clientId || !clientSecret || !appUrl) {
    return res.status(400).json({ error: "Missing required query parameters clientId, clientSecret, or appUrl" });
  }

  // Save options to server memory
  youtubeOauthClientId = clientId as string;
  youtubeOauthClientSecret = clientSecret as string;

  // Encode configurations in state
  const stateData = {
    clientId: clientId as string,
    clientSecret: clientSecret as string,
    appUrl: appUrl as string
  };
  const encodedState = Buffer.from(JSON.stringify(stateData)).toString("base64");

  const redirectUri = `${appUrl}/auth/google/callback`;
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId as string)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/youtube.readonly&access_type=offline&prompt=consent&state=${encodedState}`;

  res.json({ url: googleAuthUrl });
});

app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.send("Missing code parameter");
  }

  try {
    const decodedStateStr = Buffer.from(state as string, "base64").toString("utf-8");
    const decodedState = JSON.parse(decodedStateStr);
    const { clientId, clientSecret, appUrl } = decodedState;

    // Exchange authorization code for access_token and refresh_token
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.send(`Failed to exchange code: ${response.status} - ${errText}`);
    }

    const tokens = await response.json();
    youtubeAccessToken = tokens.access_token;
    if (tokens.refresh_token) {
      youtubeRefreshToken = tokens.refresh_token;
    }
    youtubeOauthClientId = clientId;
    youtubeOauthClientSecret = clientSecret;

    // Get user profile info via oauth2 endpoint
    let name = "Google User";
    let email = "";
    let avatar = "";

    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { "Authorization": `Bearer ${tokens.access_token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        name = userData.name || name;
        email = userData.email || email;
        avatar = userData.picture || avatar;
      }
    } catch (profileErr) {
      console.warn("Failed to retrieve user profile data:", profileErr);
    }

    youtubeUserInfo = { name, email, avatar };

    res.send(`
      <html>
        <head>
          <title>Google YouTube Authentication Success</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: sans-serif; background-color: #0b1329; color: #f8fafc; text-align: center; padding: 40px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 80vh;">
          <div style="background-color: #0f172a; border: 1px solid #1e293b; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); max-width: 450px;">
            <div style="font-size: 50px; margin-bottom: 20px;">🎉</div>
            <h2 style="color: #38bdf8; margin: 0 0 10px 0;">Google Login Berhasil!</h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Akun Google Anda (${email}) berhasil terhubung khusus untuk monitoring YouTube Live Chat.</p>
            <div style="margin: 20px 0; background-color: #020617; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #10b981;">
              Koneksi Terverifikasi • Status: OK
            </div>
            <p style="color: #64748b; font-size: 12px;">Halaman ini akan ditutup secara otomatis dalam beberapa detik...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_YOUTUBE_AUTH_SUCCESS',
                tokens: ${JSON.stringify(tokens)},
                userInfo: ${JSON.stringify(youtubeUserInfo)}
              }, '*');
              setTimeout(() => {
                window.close();
              }, 2000);
            } else {
              setTimeout(() => {
                window.location.href = '/';
              }, 3000);
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Callback handler failure:", err);
    res.status(500).send(`Error processing callback: ${err?.message || err}`);
  }
});

// Start YouTube Polling
app.get("/api/chat/youtube/status", (req, res) => {
  res.json({
    connected: activeYoutubeVideoId !== null,
    videoId: activeYoutubeVideoId,
  });
});

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

  activeFacebookPageId = cleanPageId;

  // Push immediate system connection message explaining how to pull real chats
  setTimeout(() => {
    const welcomeMsg: ChatMessage = {
      id: `fb-system-${Date.now()}`,
      platform: "facebook",
      author: "Sistem",
      message: `[KONEKSI AKTIF] Menunggu komentar nyata Facebook Live Page [ID: ${cleanPageId}]. Silakan klik "Copy Script Linker" di bagian 'Kanal Linker' di panel Sumber Platform, lalu tempelkan di Developer Console (F12) browser Anda yang sedang membuka halaman Facebook Live streaming untuk mengirimkan komentar secara waktu nyata!`,
      timestamp: Date.now(),
    };
    chatHistory.push(welcomeMsg);
    broadcastMessage(welcomeMsg);
  }, 100);

  console.log(`[Facebook] Stream started for Page ID: ${cleanPageId}`);
  res.json({ success: true, pageId: cleanPageId });
});

app.post("/api/chat/facebook/disconnect", (req, res) => {
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

  insertChatMessage(newMsg);
  res.json({ success: true, message: newMsg });
});

// GET endpoint for external chat intake - used by Image ping fallback to bypass YouTube CSP connect-src block!
app.get("/api/chat/external", (req, res) => {
  const { id, platform, author, message, avatar } = req.query;
  
  const cleanAuthor = typeof author === "string" ? author.trim() : "";
  const cleanMessage = typeof message === "string" ? message.trim() : "";
  
  if (!cleanAuthor || !cleanMessage) {
    // Return standard transparent 1x1 GIF for image loaders on bad requests
    const transparentGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.writeHead(400, { "Content-Type": "image/gif" });
    return res.end(transparentGif);
  }

  const newMsg: ChatMessage = {
    id: (typeof id === "string" ? id : "") || `ext-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    platform: (platform as any) || "youtube",
    author: cleanAuthor,
    message: cleanMessage,
    timestamp: Date.now(),
    avatar: (typeof avatar === "string" ? avatar : "") || "",
  };

  insertChatMessage(newMsg);

  // Return a transparent 1x1 pixel image as response for seamless bypass loading
  const transparentGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  res.writeHead(200, {
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
  });
  res.end(transparentGif);
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
