(function () {
  const CONFIG_KEY = "arix_tree_config_v1";
  const LOCAL_IMAGES_KEY = "arix_tree_images_v1";
  const DEFAULT_SHARE_TABLE = "starlight_shares";

  const sponsorKeywords = [
    "赞助",
    "微信支付二维码",
    "欢迎赞助",
    "关注我",
    "小红书",
    "奇米的 AI 笔记",
  ];

  const sponsorAssetPatterns = [
    "/assets/wechat_pay.png",
    "/assets/rednote.png",
    "xhslink.com",
    "m.tb.cn/h.7xpP2os",
  ];

  function textContainsSponsor(node) {
    const text = (node.textContent || "").trim();
    return sponsorKeywords.some((keyword) => text.includes(keyword));
  }

  function hasSponsorAsset(node) {
    const src = node.getAttribute && (node.getAttribute("src") || node.getAttribute("href") || "");
    return sponsorAssetPatterns.some((pattern) => src.includes(pattern));
  }

  function removeNode(node) {
    if (!node || node === document.body || node === document.documentElement) return;
    node.remove();
  }

  function removeSponsorModal(node) {
    const overlay = node.closest(".fixed.inset-0");
    if (overlay && textContainsSponsor(overlay)) {
      removeNode(overlay);
      return true;
    }
    return false;
  }

  function cleanupSponsors() {
    document.querySelectorAll("img, a").forEach((node) => {
      if (hasSponsorAsset(node)) {
        removeNode(node.closest("a") || node);
      }
    });

    document.querySelectorAll("button, a, h3, p, span, div").forEach((node) => {
      if (!textContainsSponsor(node)) return;
      if (removeSponsorModal(node)) return;

      const clickable = node.closest("button, a");
      if (clickable) {
        removeNode(clickable);
        return;
      }

      if (node.children.length === 0 || node.textContent.length < 80) {
        removeNode(node);
      }
    });
  }

  function scheduleCleanup() {
    window.clearTimeout(scheduleCleanup.timer);
    scheduleCleanup.timer = window.setTimeout(cleanupSponsors, 50);
  }

  function encodeConfig(config) {
    const bytes = new TextEncoder().encode(JSON.stringify(config));
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function readJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function buildShareConfig() {
    const config = readJsonStorage(CONFIG_KEY, {});
    const localImages = readJsonStorage(LOCAL_IMAGES_KEY, []);
    const shareConfig = { ...config };

    if (Array.isArray(localImages) && localImages.length > 0) {
      shareConfig.localImages = localImages;
    }

    return shareConfig;
  }

  function buildStaticShareUrl(config) {
    const encoded = encodeURIComponent(encodeConfig(config));
    const baseUrl = new URL(window.__starlightBaseUrl || ".", window.location.href).toString();
    return `${baseUrl}?c=${encoded}`;
  }

  function getShareSettings() {
    const config = window.STARLIGHT_SHARE_CONFIG || {};
    return {
      supabaseUrl: String(config.supabaseUrl || "").replace(/\/+$/, ""),
      anonKey: String(config.anonKey || ""),
      table: String(config.table || DEFAULT_SHARE_TABLE),
      useStaticFallback: config.useStaticFallback !== false,
    };
  }

  function assertSupabaseConfigured() {
    const settings = getShareSettings();
    if (!settings.supabaseUrl || !settings.anonKey) {
      throw new Error("请先在 starlight-share-config.js 填入你自己的 Supabase URL 和 anon key。");
    }
    return settings;
  }

  function randomInviteCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  }

  function restHeaders(settings) {
    return {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.anonKey}`,
      "Content-Type": "application/json",
    };
  }

  async function saveInviteConfig(code, config) {
    const settings = assertSupabaseConfigured();
    const response = await fetch(`${settings.supabaseUrl}/rest/v1/${settings.table}`, {
      method: "POST",
      headers: {
        ...restHeaders(settings),
        Prefer: "return=representation",
      },
      body: JSON.stringify({ code, config }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`邀请码保存失败：${response.status} ${detail}`);
    }
  }

  async function loadInviteConfig(code) {
    const settings = assertSupabaseConfigured();
    const url = `${settings.supabaseUrl}/rest/v1/${settings.table}?code=eq.${encodeURIComponent(code)}&select=config&limit=1`;
    const response = await fetch(url, {
      headers: restHeaders(settings),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`邀请码读取失败：${response.status} ${detail}`);
    }

    const rows = await response.json();
    return rows && rows[0] ? rows[0].config : null;
  }

  function buildInviteShareUrl(code) {
    const url = new URL(window.__starlightBaseUrl || ".", window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("invite", code);
    return url.toString();
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }

  async function copyShareUrl(button) {
    const originalText = button.textContent;

    try {
      const config = buildShareConfig();
      if (!Object.keys(config).length) {
        throw new Error("当前还没有可分享的配置，请先添加照片或调整设置。");
      }

      const settings = getShareSettings();
      let url;
      if (settings.supabaseUrl && settings.anonKey) {
        const code = randomInviteCode();
        await saveInviteConfig(code, config);
        url = buildInviteShareUrl(code);
      } else if (settings.useStaticFallback) {
        url = buildStaticShareUrl(config);
      } else {
        assertSupabaseConfigured();
      }

      if (navigator.share) {
        try {
          await navigator.share({ title: document.title || "StarLight", url });
          button.textContent = "已打开分享";
          return;
        } catch (error) {
          if (error && error.name === "AbortError") return;
        }
      }

      await copyText(url);
      button.textContent = url.includes("invite=") ? "邀请码链接已复制" : "展示链接已复制";
    } catch (error) {
      button.textContent = error instanceof Error ? error.message : "分享失败";
    } finally {
      window.setTimeout(() => {
        button.textContent = originalText;
      }, 3200);
    }
  }

  function buttonBaseStyle(bottom, color, borderColor) {
    return [
      "position:fixed",
      "left:16px",
      `bottom:${bottom}px`,
      "z-index:9999",
      "padding:10px 14px",
      `border:1px solid ${borderColor}`,
      "border-radius:999px",
      "background:rgba(0,0,0,.72)",
      `color:${color}`,
      "font-size:13px",
      "font-weight:700",
      "line-height:1",
      "cursor:pointer",
      "box-shadow:0 10px 30px rgba(0,0,0,.28)",
      "backdrop-filter:blur(10px)",
      "-webkit-backdrop-filter:blur(10px)",
    ].join(";");
  }

  function installLocalShareButton() {
    if (document.getElementById("local-share-button")) return;

    const button = document.createElement("button");
    button.id = "local-share-button";
    button.type = "button";
    button.textContent = "邀请码分享";
    button.title = "保存到你自己的 Supabase，并生成邀请码展示链接";
    button.style.cssText = buttonBaseStyle(16, "#FFD700", "rgba(255,215,0,.55)");

    button.addEventListener("click", () => copyShareUrl(button));
    document.body.appendChild(button);
  }

  function applyCakeShape(button) {
    const originalText = button.textContent;
    const config = readJsonStorage(CONFIG_KEY, {});
    const nextConfig = {
      ...config,
      targetShape: "CUSTOM",
      customShapeText: "\uD83C\uDF82",
      titleText: config.titleText || "Happy Birthday",
      subtitleText: config.subtitleText || "愿望都发光",
      showSubtitle: config.showSubtitle !== false,
    };

    localStorage.setItem(CONFIG_KEY, JSON.stringify(nextConfig));
    button.textContent = "蛋糕已应用";
    window.setTimeout(() => {
      button.textContent = originalText;
      window.location.reload();
    }, 450);
  }

  function installCakeButton() {
    if (document.getElementById("cake-shape-button")) return;

    const button = document.createElement("button");
    button.id = "cake-shape-button";
    button.type = "button";
    button.textContent = "蛋糕图形";
    button.title = "切换到蛋糕图形";
    button.style.cssText = buttonBaseStyle(62, "#ffb3b3", "rgba(255,153,153,.65)");

    button.addEventListener("click", () => applyCakeShape(button));
    document.body.appendChild(button);
  }

  async function hydrateInviteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite") || params.get("code");
    if (!code) return;

    const config = await loadInviteConfig(code);
    if (!config) {
      throw new Error(`邀请码 ${code} 不存在或已失效。`);
    }

    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    if (Array.isArray(config.localImages)) {
      localStorage.setItem(LOCAL_IMAGES_KEY, JSON.stringify(config.localImages));
    } else {
      localStorage.removeItem(LOCAL_IMAGES_KEY);
    }
  }

  window.__starlightShareReady = hydrateInviteFromUrl().catch((error) => {
    window.__starlightInviteError = error instanceof Error ? error.message : String(error);
    console.error("Failed to load invite config", error);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cleanupSponsors, { once: true });
    document.addEventListener("DOMContentLoaded", installLocalShareButton, { once: true });
    document.addEventListener("DOMContentLoaded", installCakeButton, { once: true });
  } else {
    cleanupSponsors();
    installLocalShareButton();
    installCakeButton();
  }

  new MutationObserver(scheduleCleanup).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
