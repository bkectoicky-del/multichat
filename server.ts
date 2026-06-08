import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";

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
const seenYoutubeIds = new Set<string>();

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

// Start polling API
function startYoutubePolling(videoId: string) {
  if (youtubePollInterval) {
    clearInterval(youtubePollInterval);
  }
  
  activeYoutubeVideoId = videoId;
  seenYoutubeIds.clear();
  console.log(`[YouTube] Started polling for videoId: ${videoId}`);

  // Fetch immediately
  fetchYoutubeChat(videoId).then((msgs) => {
    msgs.forEach((m) => {
      seenYoutubeIds.add(m.id);
      chatHistory.push(m);
      if (chatHistory.length > historyLimit) chatHistory.shift();
    });
  });

  // Poll every 4 seconds
  youtubePollInterval = setInterval(async () => {
    if (!activeYoutubeVideoId) return;
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
      console.log(`[YouTube] Pulled ${newCount} new chat messages.`);
    }
  }, 4000);
}

// Stop polling API
function stopYoutubePolling() {
  if (youtubePollInterval) {
    clearInterval(youtubePollInterval);
    youtubePollInterval = null;
  }
  activeYoutubeVideoId = null;
  console.log("[YouTube] Stopped polling.");
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
