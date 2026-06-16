import { ChatMessage, SpeechSettings } from "./types";

/**
 * Helper to identify if a comment belongs to a follower, subscriber, or contributor
 */
export function isSenderFollowerOrSubscriber(msg: ChatMessage): boolean {
  const text = (msg.message || "").toLowerCase();
  const author = (msg.author || "").toLowerCase();
  
  if (author === "sistem") return true;

  if (msg.platform === "tiktok") {
    return (
      text.includes("hadiah") ||
      text.includes("mengirimkan") ||
      text.includes("follow") ||
      text.includes("follback") ||
      text.includes("menyukai") ||
      text.includes("share") ||
      text.includes("mawar") ||
      text.includes("kopi") ||
      text.includes("mahkota") ||
      text.includes("pesawat") ||
      text.includes("jantung") ||
      text.includes("terima kasih")
    );
  }
  
  if (msg.platform === "youtube") {
    return (
      text.includes("super chat") ||
      text.includes("superchat") ||
      text.includes("sebesar") ||
      text.includes("subscriber") ||
      text.includes("subscribe") ||
      text.includes("membership") ||
      text.includes("member") ||
      text.includes("mabar") ||
      text.includes("rp")
    );
  }
  
  if (msg.platform === "facebook") {
    return (
      text.includes("share") ||
      text.includes("membagikan") ||
      text.includes("cod") ||
      text.includes("inbox") ||
      text.includes("pengikut") ||
      text.includes("bantu share") ||
      text.includes("up")
    );
  }

  return (
    text.includes("share") ||
    text.includes("follow") ||
    text.includes("subs") ||
    text.includes("hadiah")
  );
}

/**
 * Validates and formats chat messages for Text-To-Speech according to user configurations
 */
export function formatSpeechText(msg: ChatMessage, settings: SpeechSettings): string | null {
  // 1. Check if platform is enabled
  if (!settings.enabledPlatforms[msg.platform]) {
    return null;
  }

  // 2. Check follower filter mode if enabled
  if (settings.filterTtsMode === "only_contributors" && !isSenderFollowerOrSubscriber(msg)) {
    return null;
  }

  // 3. Check minimum length
  if (msg.message.trim().length < settings.minMessageLength) {
    return null;
  }

  // 4. Filter ignored keywords (case-insensitive)
  const containsIgnored = settings.ignoredKeywords.some((keyword) => {
    const cleanWord = keyword.trim().toLowerCase();
    return cleanWord && msg.message.toLowerCase().includes(cleanWord);
  });
  if (containsIgnored) {
    return null;
  }

  // 5. Format the final read string
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

  /* The code inside runs on TikTok Live, Facebook Live, or YouTube Live page inside the streamer's browser. */
  const scriptContent = `
(function() {
  const SERVER_URL = "${targetUrl}";
  console.log("%c[OmniStream Linker Activated]%c Target: " + SERVER_URL, "color: #818cf8; font-weight: bold; font-size: 14px", "color: #34d399");

  let processedHashes = new Set();
  let sentCount = 0;
  let observer = null;

  /* Detect which platform page is currently loaded */
  let platform = "tiktok";
  if (window.location.host.includes("facebook.com")) {
    platform = "facebook";
  } else if (window.location.host.includes("youtube.com")) {
    platform = "youtube";
  }

  /* Set the target document context */
  let doc = document;
  if (platform === "youtube") {
    const iframe = document.querySelector("iframe#chatframe") || document.querySelector("iframe[src*='live_chat']");
    if (iframe) {
      try {
        if (iframe.contentDocument) {
          doc = iframe.contentDocument;
          console.log("[OmniStream YouTube] Terhubung dengan dokumen iframe chat.");
        }
      } catch (e) {
        console.warn("[OmniStream YouTube] Tidak dapat mengakses iframe. Memantau dari body utama.", e);
      }
    }
  }

  /* UI HUD Builder */
  function createHUD() {
    const existing = doc.getElementById("omnistream-hud");
    if (existing) existing.remove();

    const hud = doc.createElement("div");
    hud.id = "omnistream-hud";
    hud.style.position = "fixed";
    hud.style.bottom = "20px";
    hud.style.right = "20px";
    hud.style.zIndex = "100000";
    hud.style.background = "#0f172a";
    hud.style.border = "2px solid #4f46e5";
    hud.style.borderRadius = "16px";
    hud.style.padding = "12px 18px";
    hud.style.color = "#ffffff";
    hud.style.fontFamily = "system-ui, -apple-system, sans-serif";
    hud.style.fontSize = "12px";
    hud.style.boxShadow = "0 10px 30px rgba(0,0,0,0.6), 0 0 15px rgba(79, 70, 229, 0.4)";
    hud.style.display = "flex";
    hud.style.flexDirection = "column";
    hud.style.gap = "4px";
    hud.style.minWidth = "180px";
    hud.style.pointerEvents = "auto";

    hud.innerHTML = \`
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155;padding-bottom:6px;margin-bottom:4px;">
        <div style="display:flex;align-items:center;gap:6px;font-weight:bold;color:#fff;">
          <span style="width:8px;height:8px;background:#10b981;border-radius:50%;display:inline-block;box-shadow:0 0 8px #10b981;"></span>
          <span>OMNISTREAM ACTIVE</span>
        </div>
        <button id="omnistream-hud-close" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-weight:bold;font-size:12px;padding:0 2px;">×</button>
      </div>
      <div style="font-size:11px;color:#94a3b8;">Platfrom: <strong style="color:#e2e8f0;text-transform:uppercase;">\${platform}</strong></div>
      <div style="font-size:11px;color:#94a3b8;">Komentar Terkirim: <strong id="omnistream-count" style="color:#38bdf8;font-size:13px;font-family:monospace;">0</strong></div>
    \`;

    const styleEl = doc.createElement("style");
    styleEl.innerHTML = \`
      #omnistream-hud button:hover { color: #f43f5e !important; }
    \`;
    doc.head.appendChild(styleEl);

    doc.body.appendChild(hud);

    doc.getElementById("omnistream-hud-close").addEventListener("click", () => {
      hud.remove();
    });
  }

  function updateHUDCounter() {
    const el = doc.getElementById("omnistream-count");
    if (el) el.textContent = sentCount;
  }

  function sendToServer(author, message, plat) {
    const cleanAuthor = author.replace(/\\\\s*:\\\\s*$/, "").trim();
    const cleanMessage = message.trim();
    if (!cleanAuthor || !cleanMessage) return;

    const msgId = "ext-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
    let fetchSuccess = false;

    /* Channel A: Direct POST fetch */
    fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: msgId,
        platform: plat,
        author: cleanAuthor,
        message: cleanMessage,
        avatar: ""
      })
    })
    .then(r => {
      if (r.ok) {
        fetchSuccess = true;
        sentCount++;
        updateHUDCounter();
      } else {
        throw new Error("HTTP error " + r.status);
      }
    })
    .catch(err => {
      console.warn("[OmniStream] Direct POST failed or blocked by CSP. Falling back to GET Image-load CSP bypass...", err);
      
      /* Channel B: GET Image load bypass for Youtube/CSP environments */
      try {
        const img = new Image();
        img.onload = function() {
          if (!fetchSuccess) {
            sentCount++;
            updateHUDCounter();
            fetchSuccess = true;
          }
        };
        img.onerror = function(e) {
          console.error("[OmniStream] Image CSP bypass failed as well:", e);
        };
        img.src = SERVER_URL + "?id=" + encodeURIComponent(msgId) + 
                  "&platform=" + encodeURIComponent(plat) + 
                  "&author=" + encodeURIComponent(cleanAuthor) + 
                  "&message=" + encodeURIComponent(cleanMessage) + 
                  "&t=" + Date.now();
      } catch (ex) {
        console.error("[OmniStream] CSP bypass crash:", ex);
      }
    });
  }
  /* Helper to parse Facebook nodes recursively with superior accuracy */
  function parseAndSendFacebookNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
    
    const authorSelector = 'a, strong, [class*="author"], [class*="name"], [class*="nick"], [class*="user"], .comment-author';
    const authorLinks = Array.from(node.querySelectorAll(authorSelector));
    if (node.matches && (
      node.matches('a') || 
      node.matches('strong') || 
      node.matches('[class*="author"]') || 
      node.matches('[class*="name"]') || 
      node.matches('[class*="nick"]') || 
      node.matches('[class*="user"]') || 
      node.matches('.comment-author')
    )) {
      authorLinks.push(node);
    }
    
    authorLinks.forEach(authorEl => {
      const author = authorEl.textContent ? authorEl.textContent.trim() : "";
      if (!author || author.length < 2 || author.length > 50) return;
      
      const blocklist = /^(Balas|Reply|Replies|Like|Sukai|Suka|Share|Bagikan|Follow|Ikuti|View|Lihat|More|Lainnya|Sebelumnya|Write|Tulis|Comment|Komentar|Send|Kirim|Cancel|Batal|Hide|Sembunyikan|Report|Laporkan|Active|Aktif|Online|Offline|Live|Stream|Joined|Join|Gabung|Membagikan|Sponsor|Promoted|Iklan|Ad)$/i;
      if (blocklist.test(author)) return;
      
      const nameLower = author.toLowerCase();
      if (
        nameLower.includes("komentar") || nameLower.includes("comment") || nameLower.includes("balas") || 
        nameLower.includes("reply") || nameLower.includes("lihat") || nameLower.includes("view") || 
        nameLower.includes("lainnya") || nameLower.includes("bagikan") || nameLower.includes("share") || 
        nameLower.includes("suka") || nameLower.includes("like") || nameLower.includes("balasan") ||
        nameLower.includes("replies")
      ) {
        return;
      }
      
      let container = authorEl.parentElement;
      let depth = 0;
      let msg = "";
      
      while (container && depth < 4 && container !== doc.body) {
        const potentialMsgs = Array.from(container.querySelectorAll('span[dir="auto"], span, div'));
        for (const el of potentialMsgs) {
          if (authorEl.contains(el) || el === authorEl) continue;
          
          const text = el.textContent ? el.textContent.trim() : "";
          if (text && text !== author && !author.includes(text) && text.length > 0) {
            if (el.getAttribute('dir') === 'auto' || el.tagName === 'SPAN') {
              msg = text;
              break;
            }
          }
        }
        if (msg) break;
        container = container.parentElement;
        depth++;
      }
      
      if (!msg && authorEl.parentElement) {
        const parentText = authorEl.parentElement.textContent || "";
        const cleanText = parentText.replace(author, "").replace(/^\s*:\s*/, "").trim();
        if (cleanText && cleanText.length > 0) {
          msg = cleanText;
        }
      }
      
      if (author && msg) {
        let cleanMsg = msg.replace(/\b(Balas|Reply|Ikuti|Follow)\b/gi, "").trim();
        const msgLower = cleanMsg.toLowerCase();
        if (
          msgLower === "balas" || msgLower === "reply" || msgLower === "like" || msgLower === "sukai" || msgLower === "suka" ||
          msgLower === "share" || msgLower === "bagikan" || msgLower === "kirim" || msgLower === "send" ||
          msgLower === "tulis komentar..." || msgLower === "write a comment..." || msgLower.startsWith("lihat ") || msgLower.startsWith("view ") ||
          msgLower.includes("balasan") || msgLower.includes("replies")
        ) return;

        if (cleanMsg) {
          const key = author + "::" + cleanMsg;
          if (!processedHashes.has(key)) {
            processedHashes.add(key);
            sendToServer(author, cleanMsg, "facebook");
          }
        }
      }
    });
  }

  /* Parser for live chat rows based on active platform selectors */
  function processNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (platform === "youtube") {
      const authorEl = node.querySelector("#author-name") || node.querySelector(".author") || node.querySelector(".yt-live-chat-author-chip");
      const messageEl = node.querySelector("#message") || node.querySelector(".message") || node.querySelector("#content");
      if (authorEl && messageEl) {
        const id = node.id || node.getAttribute("id") || "";
        const author = authorEl.textContent.trim();
        const msg = messageEl.textContent.trim();
        const key = id || (author + "::" + msg);

        if (!processedHashes.has(key)) {
          processedHashes.add(key);
          sendToServer(author, msg, "youtube");
        }
      }
    }

    if (platform === "tiktok") {
      const nickEl = node.querySelector('[class*="Nickname"]') || 
                     node.querySelector('[class*="nickname"]') || 
                     node.querySelector('[data-e2e="chat-username"]') ||
                     node.nickname;
                      
      const msgEl = node.querySelector('[class*="comment"]') || 
                    node.querySelector('[class*="Comment"]') || 
                    node.querySelector('[data-e2e="chat-message"]') ||
                    node.querySelector('.text');

      if (nickEl && msgEl) {
        const author = nickEl.textContent.trim();
        const msg = msgEl.textContent.trim();
        const key = author + "::" + msg;

        if (!processedHashes.has(key)) {
          processedHashes.add(key);
          sendToServer(author, msg, "tiktok");
        }
      }
    }

    if (platform === "facebook") {
      parseAndSendFacebookNode(node);
    }
  }

  /* Chat lists container discovery */
  function findChatContainer() {
    if (platform === "tiktok") {
      return doc.querySelector('[class*="chat-container"]') || 
             doc.querySelector('[class*="ChatMessageContainer"]') ||
             doc.querySelector('.tiktok-room-chat-item-container') ||
             doc.querySelector('ul.chat-container') ||
             doc.body;
    }
    if (platform === "facebook") {
      return doc.querySelector('[role="log"]') || 
             doc.querySelector('[id*="live_comments"]') ||
             doc.querySelector('[class*="comments"]') ||
             doc.querySelector('[class*="comment_"]') ||
             doc.querySelector('.comments-container') ||
             doc.querySelector('.comment-list') ||
             doc.body;
    }
    if (platform === "youtube") {
      return doc.querySelector("#items.yt-live-chat-item-list-renderer") || 
             doc.querySelector("yt-live-chat-item-list-renderer") ||
             doc.querySelector("#chat-messages") ||
             doc.body;
    }
    return doc.body;
  }

  /* Batch scan fallback */
  function performPeriodicScan() {
    if (platform === "youtube") {
      const items = doc.querySelectorAll("yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer, yt-live-chat-membership-item-renderer");
      items.forEach(node => processNode(node));
    } else if (platform === "tiktok") {
      const items = doc.querySelectorAll('[class*="ChatMessageContainer"] > div, .tiktok-room-chat-item-container > div, ul.chat-container li');
      items.forEach(node => processNode(node));
    } else if (platform === "facebook") {
      const authorLinks = doc.querySelectorAll('a, strong, [class*="author"], [class*="name"], [class*="nick"], [class*="user"], .comment-author');
      authorLinks.forEach(authorEl => {
        const parent = authorEl.parentElement;
        if (parent) {
          parseAndSendFacebookNode(parent);
        }
      });
    }
  }

  createHUD();
  const container = findChatContainer();
  console.log("[OmniStream] Watching chat container:", container);

  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        processNode(node);
        if (node.querySelectorAll) {
          if (platform === "youtube") {
            node.querySelectorAll("yt-live-chat-text-message-renderer, yt-live-chat-paid-message-renderer").forEach(n => processNode(n));
          } else if (platform === "tiktok") {
            node.querySelectorAll("div").forEach(n => processNode(n));
          } else if (platform === "facebook") {
            const authorEls = node.querySelectorAll('a, strong, [class*="author"], [class*="name"], [class*="nick"], [class*="user"], .comment-author');
            authorEls.forEach(authorEl => {
              if (authorEl.parentElement) {
                parseAndSendFacebookNode(authorEl.parentElement);
              }
            });
          }
        }
      });
    });
  });

  observer.observe(container, {
    childList: true,
    subtree: true
  });

  setInterval(performPeriodicScan, 1200);

  /* Splash success banner notification */
  const banner = doc.createElement("div");
  banner.id = "omnistream-banner";
  banner.style.position = "fixed";
  banner.style.top = "10px";
  banner.style.left = "50%";
  banner.style.transform = "translateX(-50%)";
  banner.style.zIndex = "100001";
  banner.style.background = "#10b981";
  banner.style.color = "white";
  banner.style.fontWeight = "bold";
  banner.style.padding = "8px 16px";
  banner.style.borderRadius = "8px";
  banner.style.boxShadow = "0 4px 12px rgba(16,185,129,0.3)";
  banner.style.fontFamily = "system-ui, sans-serif";
  banner.style.fontSize = "12px";
  banner.textContent = "OmniStream Live Connector Berhasil Terpasang! HUD Aktif di Kanan Bawah.";
  doc.body.appendChild(banner);
  setTimeout(() => banner.remove(), 4000);
})();
  `;

  return `javascript:${encodeURIComponent(scriptContent.replace(/\s+/g, " "))}`;
}
