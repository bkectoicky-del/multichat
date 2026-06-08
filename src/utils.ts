import { ChatMessage, SpeechSettings } from "./types";

/**
 * Validates and formats chat messages for Text-To-Speech according to user configurations
 */
export function formatSpeechText(msg: ChatMessage, settings: SpeechSettings): string | null {
  // 1. Check if platform is enabled
  if (!settings.enabledPlatforms[msg.platform]) {
    return null;
  }

  // 2. Check minimum length
  if (msg.message.trim().length < settings.minMessageLength) {
    return null;
  }

  // 3. Filter ignored keywords (case-insensitive)
  const containsIgnored = settings.ignoredKeywords.some((keyword) => {
    const cleanWord = keyword.trim().toLowerCase();
    return cleanWord && msg.message.toLowerCase().includes(cleanWord);
  });
  if (containsIgnored) {
    return null;
  }

  // 4. Format the final read string
  let output = settings.nicknameReadFormat;
  const authorName = settings.readUsername ? msg.author : "Seseorang";
  
  // Replace variables
  output = output.replace(/{name}/gi, authorName);
  output = output.replace(/{message}/gi, msg.message);

  return output.trim();
}

/**
 * Generates the Bookmarklet script injected with the actual hosted server URL.
 */
export function generateBookmarkletCode(appUrl: string): string {
  const targetUrl = `${appUrl}/api/chat/external`;

  // The code inside runs on TikTok Live, Facebook Live, or YouTube Live page inside the streamer's browser.
  const scriptContent = `
(function() {
  const SERVER_URL = "${targetUrl}";
  console.log("%c[Live Stream Reader Linker Activated]%c Connects to: " + SERVER_URL, "color: #ff0055; font-weight: bold; font-size: 14px", "color: #33ff33");

  let lastSentMessages = new Set();
  let observer = null;

  function sendToServer(author, message, platform) {
    const hash = author + "::" + message;
    if (lastSentMessages.has(hash)) return;
    lastSentMessages.add(hash);
    
    // Clear set cache periodically to avoid excessive memory
    if (lastSentMessages.size > 200) {
      lastSentMessages.clear();
    }

    console.log("[" + platform.toUpperCase() + "] Sending:", author, "->", message);
    
    fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: "ext-" + Date.now() + "-" + Math.floor(Math.random() * 100000),
        platform: platform,
        author: author,
        message: message,
        avatar: ""
      })
    })
    .then(r => r.json())
    .catch(err => console.error("Error pushing chat message:", err));
  }

  // Detect which platform page is currently loaded
  let platform = "tiktok";
  if (window.location.host.includes("facebook.com")) {
    platform = "facebook";
  } else if (window.location.host.includes("youtube.com")) {
    platform = "youtube";
  }

  console.log("Detected platform as: " + platform.toUpperCase());

  function parseAndSendNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    // --- TIKTOK LIVE DOM MATCHING ---
    if (platform === "tiktok") {
      // General selectors or text lookups
      // TikTok typically obfuscates classes, but let's locate spans containing nicknames or message contents.
      const nickEl = node.querySelector('[class*="Nickname"]') || 
                     node.querySelector('[class*="nickname"]') || 
                     node.querySelector('[data-e2e="chat-username"]') ||
                     node.querySelector('.nickname') ||
                     node.querySelector('.username');
                     
      const msgEl = node.querySelector('[class*="comment"]') || 
                    node.querySelector('[class*="Comment"]') || 
                    node.querySelector('[data-e2e="chat-message"]') ||
                    node.querySelector('.comment') ||
                    node.querySelector('.text');

      if (nickEl && msgEl) {
        const nick = nickEl.textContent.replace(/\\s*:\\s*$/, "").trim();
        const text = msgEl.textContent.trim();
        if (nick && text) {
          sendToServer(nick, text, "tiktok");
        }
      } else {
        // Fallback for flat structure or text chunks
        const textContent = node.textContent || "";
        if (textContent.includes(":")) {
          const parts = textContent.split(":");
          const nick = parts[0].trim();
          const text = parts.slice(1).join(":").trim();
          if (nick.length > 0 && nick.length < 30 && text.length > 0) {
            sendToServer(nick, text, "tiktok");
          }
        }
      }
    }

    // --- FACEBOOK LIVE DOM MATCHING ---
    if (platform === "facebook") {
      const msgTextEl = node.querySelector('span[dir="auto"]') || node.querySelector('.comment-text') || node;
      const authorEl = node.querySelector('a[role="link"]') || node.querySelector('strong') || node.querySelector('.comment-author');
      
      if (authorEl && msgTextEl) {
        const author = authorEl.textContent.trim();
        const message = msgTextEl.textContent.replace(author, "").trim();
        if (author && message) {
          sendToServer(author, message, "facebook");
        }
      }
    }

    // --- YOUTUBE LIVE (Fallback / Studio Page scraper) ---
    if (platform === "youtube") {
      const authorEl = node.querySelector("#author-name") || node.querySelector(".author");
      const messageEl = node.querySelector("#message") || node.querySelector(".message");
      if (authorEl && messageEl) {
        sendToServer(authorEl.textContent.trim(), messageEl.textContent.trim(), "youtube");
      }
    }
  }

  // Find chat scrolling containers dynamically to bind MutationObserver
  function findChatContainer() {
    if (platform === "tiktok") {
      return document.querySelector('[class*="chat-container"]') || 
             document.querySelector('[class*="ChatMessageContainer"]') ||
             document.querySelector('.tiktok-room-chat-item-container') ||
             document.querySelector('ul.chat-container') ||
             document.querySelector('.room-chat-box') ||
             document.querySelector('.chat-list') ||
             document.body;
    }
    if (platform === "facebook") {
      return document.querySelector('[role="log"]') || 
             document.querySelector('.comments-container') ||
             document.querySelector('.comment-list') ||
             document.body;
    }
    return document.body;
  }

  const container = findChatContainer();
  console.log("Observing chat container:", container);

  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        // Parse the node itself
        parseAndSendNode(node);
        
        // Also look inside for sub-nodes
        if (node.querySelectorAll) {
          // TikTok
          const items = node.querySelectorAll('[class*="item"]') || [];
          items.forEach(item => parseAndSendNode(item));
        }
      });
    });
  });

  observer.observe(container, {
    childList: true,
    subtree: true
  });

  alert("Live stream connector linked successfully! Chats from this page will now automatically play TTS on your overlay.");
})();
  `;

  // Return standard javascript bookmarklet string
  return `javascript:${encodeURIComponent(scriptContent.replace(/\s+/g, " "))}`;
}
