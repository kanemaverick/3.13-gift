(function () {
  const CONFIG_KEY = "arix_tree_config_v1";
  const LOCAL_IMAGES_KEY = "arix_tree_images_v1";
  const DEFAULT_SHARE_TABLE = "starlight_shares";
  const SHOW_HELPER_BUTTONS = false;
  const DEFAULT_PHOTO_FILES = [
    "0fde80f37abe71ba2377905bf950b3dd.jpg",
    "1567974fb26b9478060df359672a5d77.jpg",
    "16c801e732b25398ea18b80f741c770a.jpg",
    "268be4804f7515052df5f43a63ee5e63.jpg",
    "29d3e6bb658682036fc2d04abaa196bc.jpg",
    "3430b7c0883c1811e29c4df3e0d189c3.jpg",
    "358d06cf2a8f91efdef36bc3dbe4c557.jpg",
    "3df3748142433cf466eab524be9edbfc.jpg",
    "3ea76a8b6e3bc5f85289a5cf9ad3863d.jpg",
    "469ac0667976cdaa8bebd2916191a5ae.jpg",
    "4e3263a65bb8691178f0c18340a21885.jpg",
    "4f7b2905650fe87dc96cc24c9f183cba.jpg",
    "536518958390734564520463862016b8.jpg",
    "569d95f062442c78318c536fa7a0240d.jpg",
    "5bb04e056ba5b391af72fc001726dfae.jpg",
    "5e04bb6f3d5373f538ffb3d531c9cad9.jpg",
    "5e5fa7d769c2c850afc1058ba9733744.jpg",
    "68ae0ac72e6cf329e891e04ed5be437a.jpg",
    "6f661b61c51d1a539e738df6b2ab24b1.jpg",
    "77c2bc645b61768310dbeec008da164e.jpg",
    "8aa68be347a28ed47a65fc93fbdc0a83.jpg",
    "9beb6ff16392bd7cb99463f8ccf96522.jpg",
    "a2fc07b2f6483da15769c567894c2e92.jpg",
    "a4e387d17e44f77972d386c4027ae969.jpg",
    "afa8c8a06834869288d18d0a318b39aa.jpg",
    "b4a6c28dcd0a0d6a41847791978417ca.jpg",
    "b8c0f9faa3d58f27308053e888be9bd9.jpg",
    "c81d54c5b1c8a91074870f6416cb4504.jpg",
    "cacd181824a652217a14d49e0898074b.jpg",
    "d9d9279f9d6f170a990b9f4a9eea808f.jpg",
    "de568ab23c4fedd05644fe8e91dd0f9e.jpg",
    "f05dd10e7b55842ea2d3971e62a4a958.jpg",
    "f7ed2ef7d23e6ab7a210877fb45cfea9.jpg",
  ];

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

  function writeJsonStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function shouldUseLiteMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get("quality") === "lite" || params.get("lite") === "1";
  }

  function applyLiteDefaults() {
    if (!shouldUseLiteMode()) return;

    const config = readJsonStorage(CONFIG_KEY, {});
    const currentCounts = config.treeCounts || {};
    const currentPerformance = config.performanceConfig || {};
    const nextConfig = {
      ...config,
      treeCounts: {
        needles: Math.min(Number(currentCounts.needles) || 1800, 1800),
        ornaments: Math.min(Number(currentCounts.ornaments) || 250, 250),
        cubes: Math.min(Number(currentCounts.cubes) || 300, 300),
      },
      performanceConfig: {
        ...currentPerformance,
        enablePostProcessing: false,
        bloomIntensity: Math.min(Number(currentPerformance.bloomIntensity) || 0.8, 0.8),
        starsCount: Math.min(Number(currentPerformance.starsCount) || 1200, 1200),
        devicePixelRatio: Math.min(Number(currentPerformance.devicePixelRatio) || 1, 1),
        antialias: false,
      },
      photoSize: Math.min(Number(config.photoSize) || 1.5, 1.5),
    };

    writeJsonStorage(CONFIG_KEY, nextConfig);
  }

  function bundledPhotoUrls() {
    const baseUrl = new URL(window.__starlightBaseUrl || ".", window.location.href);
    return DEFAULT_PHOTO_FILES.map((name) => new URL(`assets/photos/${name}`, baseUrl).toString());
  }

  function applyBundledPhotos() {
    if (!DEFAULT_PHOTO_FILES.length) return;

    const config = readJsonStorage(CONFIG_KEY, {});
    writeJsonStorage(CONFIG_KEY, {
      ...config,
      imageUrls: bundledPhotoUrls(),
    });
    localStorage.removeItem(LOCAL_IMAGES_KEY);
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
  }).finally(() => {
    applyBundledPhotos();
    applyLiteDefaults();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cleanupSponsors, { once: true });
    if (SHOW_HELPER_BUTTONS) {
      document.addEventListener("DOMContentLoaded", installLocalShareButton, { once: true });
      document.addEventListener("DOMContentLoaded", installCakeButton, { once: true });
    }
  } else {
    cleanupSponsors();
    if (SHOW_HELPER_BUTTONS) {
      installLocalShareButton();
      installCakeButton();
    }
  }

  new MutationObserver(scheduleCleanup).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
