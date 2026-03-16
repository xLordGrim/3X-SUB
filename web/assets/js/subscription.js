(function () {
  "use strict";
  const VERSION = "v2.0.13";
  const STATE = {
    theme: localStorage.getItem("xui_theme") || "dark",
    lang: localStorage.getItem("xui_lang") || "en",
    subUrl: "",
    raw: null,
  };
  const I18N = {
    en: {
      title: "My Subscription",
      limit: "Data Limit",
      used: "Used",
      rem: "Remaining",
      exp: "Expires",
      nodes: "Configuration Links",
      copy: "Copy Link",
      qr: "QR Code",
      online: "Online",
      offline: "Offline",
      unlimited: "Unlimited",
      refresh: "Refresh Status",
      upload: "Upload",
      download: "Download",
      copied: "Copied!",
    },
    cn: {
      title: "我的订阅",
      limit: "流量限制",
      used: "已用",
      rem: "剩余",
      exp: "到期时间",
      nodes: "配置链接",
      copy: "复制链接",
      qr: "二维码",
      online: "在线",
      offline: "离线",
      unlimited: "不限流量",
      refresh: "刷新状态",
      upload: "上传",
      download: "下载",
      copied: "已复制!",
    },
    fa: {
      title: "اشتراک من",
      limit: "محدودیت داده",
      used: "استفاده شده",
      rem: "باقی‌مانده",
      exp: "انقضا",
      nodes: "لینک‌های اتصال",
      copy: "کپی لینک",
      qr: "کد QR",
      online: "آنلاین",
      offline: "آفلاین",
      unlimited: "نامحدود",
      refresh: "بروزرسانی وضعیت",
      upload: "آپلود",
      download: "دانلود",
      copied: "کپی شد!",
    },
  };
  function t(key) {
    return I18N[STATE.lang][key] || key;
  }
  const getEl = (id) => document.getElementById(id);
  const mkEl = (tag, cls, html) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html) el.innerHTML = html;
    return el;
  };
  function cleanupName(raw) {
    if (!raw) return "User";
    try {
      let name = decodeURIComponent(raw);
      name = name.replace(/^(⛔️|N\/A|\s|-)+/i, "");
      name = name.replace(/-\s*\d+(\.\d+)?\s*([GMKT]B|[dhmy]|min|mo).*$/i, "");
      name = name.replace(
        /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2700}-\u{27BF}\u{1F680}-\u{1F6FF}\u{24C2}-\u{1F251}].*$/u,
        "",
      );
      return name.trim() || "User";
    } catch (e) {
      return raw;
    }
  }
  function getStatusInfo() {
    const now = Date.now();
    const total = STATE.raw.total || 0;
    const used = (STATE.raw.up || 0) + (STATE.raw.down || 0);
    const expired = STATE.raw.expire > 0 && now > STATE.raw.expire;
    const depleted = total > 0 && used >= total;
    let state = "active",
      colorVar = "--usage-active",
      label = "Active";
    if (expired) {
      state = "warn";
      colorVar = "var(--usage-expired)";
      label = "Expired";
    } else if (depleted) {
      state = "depleted";
      colorVar = "var(--usage-depleted)";
      label = "Limited";
    } else if (total === 0) {
      state = "unlimited";
      colorVar = "var(--accent)";
      label = "Active";
    } else {
      state = "active";
      colorVar = "var(--usage-active)";
      label = "Active";
    }
    const pct = total === 0 ? 0 : Math.min(100, (used / total) * 100);
    return {
      active: !expired && !depleted,
      expired,
      depleted,
      label,
      color: colorVar,
      pct,
      used,
      total,
      state,
    };
  }
  function init() {
    document.documentElement.classList.add("premium-theme");
    document.body.classList.add("premium-theme");
    renderLoader();
    if (!STATE.raw) {
      const dataEl = getEl("subscription-data");
      if (!dataEl) return;
      STATE.raw = {
        sid:
          dataEl.getAttribute("data-email") ||
          dataEl.getAttribute("data-sid") ||
          "User",
        total: parseInt(dataEl.getAttribute("data-totalbyte") || 0),
        up: parseInt(dataEl.getAttribute("data-uploadbyte") || 0),
        down: parseInt(dataEl.getAttribute("data-downloadbyte") || 0),
        expire: parseInt(dataEl.getAttribute("data-expire") || 0) * 1000,
        subUrl: dataEl.getAttribute("data-sub-url") || "",
        lastOnline: parseInt(dataEl.getAttribute("data-lastonline") || 0),
        isp: "Detecting...",
        location: "Detecting...",
        serverIp: dataEl.getAttribute("data-ip") || "Self",
      };
      STATE.subUrl = STATE.raw.subUrl;
    }
    if (!document.querySelector('link[href*="premium.css"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = `./assets/css/premium.css?v=${VERSION}`;
      document.head.appendChild(css);
    }
    renderApp();
    applyTheme();
    startStatsPolling();
    if (!window.statusLoop) {
      window.statusLoop = setInterval(updateStatus, 60000);
    }
    if (!window.networkBg) {
      window.networkBg = new NeuralNetwork();
    }
  }
  function renderApp() {
    const old = getEl("app-root");
    if (old) old.remove();
    const app = mkEl("div", "app-container");
    app.id = "app-root";
    app.appendChild(renderHeader());
    const grid = mkEl("div", "dashboard-grid");
    grid.appendChild(renderUsageCard());
    grid.appendChild(renderInfoCard());
    grid.appendChild(renderNodesList());
    grid.appendChild(renderStatsGrid());
    grid.appendChild(renderInfrastructureSection());
    app.appendChild(grid);
    const footer = mkEl("div", "custom-footer");
    const footerText = "Powered with ❤️ by 3𝕏 SUB";
    footer.innerHTML = `<div class="footer-glitch-wrap" data-text="${footerText}">Powered with <span class="heart-pulse">❤️</span> by&nbsp;<a class="footer-link" href="https://github.com/xLordgrim/3X-SUB/" target="_blank" rel="noopener noreferrer">3𝕏 SUB</a></div>`;
    app.appendChild(footer);
    app.appendChild(renderQRModal());
    app.appendChild(renderToast());
    document.body.appendChild(app);
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.body.classList.add("ready");
        hideLoader();
        const bar = getEl("prog-bar");
        if (bar) {
          const s = getStatusInfo();
          setTimeout(() => {
            bar.style.transform = `translateX(-${100 - s.pct}%)`;
          }, 400);
        }
        
        // Trigger Counting Animations
        setTimeout(() => {
          startCounters();
        }, 300);
      }, 600);
    });
  }
  function renderHeader() {
    const h = mkEl("header", "dashboard-header");
    let dispName = STATE.raw.sid;
    const linksEl = getEl("subscription-links");
    const links = linksEl ? linksEl.value.split("\n").filter(Boolean) : [];
    if (!STATE.raw.sid.includes("@") && links.length > 0) {
      if (links[0].includes("#")) {
        dispName = links[0].split("#")[1];
      }
    }
    dispName = cleanupName(dispName);
    const s = getStatusInfo();
    const profile = mkEl("div", "user-profile");
    profile.innerHTML = `<div class="avatar">${dispName.substring(0, 1).toUpperCase()}</div><div class="user-text-group"><div class="dashboard-title">User Dashboard</div><div class="user-main-row"><div class="username-display" data-text="${dispName}">${dispName}</div><div class="status-indicator-wrap"><span class="status-text-inline" style="color: ${s.color}">${s.label}</span><div class="status-dot-inline" style="background:${s.color}; box-shadow: 0 0 10px ${s.color}; border-color: ${s.color}44;"></div></div></div></div>`;
    const ctrls = mkEl("div", "controls");
    ctrls.style.position = "relative";
    ctrls.style.zIndex = "200";
    const themeBtn = mkEl("div", "icon-btn");
    themeBtn.innerHTML =
      STATE.theme === "dark"
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    themeBtn.onclick = (e) => {
      themeBtn.style.animation =
        "bounce 0.6s cubic-bezier(0.68,-0.55,0.265,1.55)";
      setTimeout(() => {
        themeBtn.style.animation = "";
      }, 600);
      toggleTheme(e);
    };
    themeBtn.id = "theme-btn";
    ctrls.appendChild(themeBtn);
    h.appendChild(profile);
    h.appendChild(ctrls);
    return h;
  }
  function renderUsageCard() {
    const card = mkEl("div", "span-8 usage-overview");
    const s = getStatusInfo();
    const limitHtml = s.total === 0 ? `<span class="glitch-text" data-text="${t("unlimited")}">${t("unlimited")}</span>` : formatBytes(s.total);
    card.innerHTML = `<div class="usage-header"><span class="usage-title">Data Usage Metrics</span><span class="usage-title">${s.pct.toFixed(1)}%</span></div><div class="usage-big-number" id="usage-val">0 B</div><div class="progress-container"><div class="progress-bar ${s.total === 0 ? "unlimited-bar" : ""}" id="prog-bar" style="transform:translateX(${s.total === 0 ? "0" : "-100%"});"><div class="bloom"></div></div></div><div class="usage-sub">${t("limit")}: ${limitHtml}</div>`;
    return card;
  }
  function renderInfoCard() {
    const card = mkEl("div", "span-4 stat-mini-grid");
    let remText = "∞";
    if (STATE.raw.total > 0) {
      const left = STATE.raw.total - (STATE.raw.up + STATE.raw.down);
      remText = formatBytes(left < 0 ? 0 : left);
    }
    const rem = mkEl("div", "stat-mini");
    rem.innerHTML = `<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-rem)"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg></div><div class="stat-value" id="rem-val">${STATE.raw.total > 0 ? "0 B" : remText}</div><div class="stat-label">${t("rem")}</div>`;
    let expText = "∞";
    if (STATE.raw.expire > 0) {
      const diff = STATE.raw.expire - Date.now();
      if (diff < 0) expText = "Expired";
      else expText = Math.ceil(diff / (1000 * 60 * 60 * 24)) + "d";
    }
    const exp = mkEl("div", "stat-mini");
    exp.innerHTML = `<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-exp)"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div><div class="stat-value">${expText}</div><div class="stat-label">${t("exp")}</div>`;
    const up = mkEl("div", "stat-mini");
    up.innerHTML = `<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-up)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></div><div class="stat-value" id="up-total-val">0 B</div><div class="stat-label">${t("upload")}</div>`;
    const down = mkEl("div", "stat-mini");
    down.innerHTML = `<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-down)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></div><div class="stat-value" id="down-total-val">0 B</div><div class="stat-label">${t("download")}</div>`;
    const lastOnline = mkEl("div", "stat-mini");
    let lastOnlineText = "Never";
    if (STATE.raw.lastOnline > 0) {
      const now = Date.now(),
        diff = now - STATE.raw.lastOnline,
        minutes = Math.floor(diff / (1000 * 60)),
        hours = Math.floor(diff / (1000 * 60 * 60)),
        days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (minutes < 1) lastOnlineText = "Just now";
      else if (minutes < 60) lastOnlineText = minutes + "m ago";
      else if (hours < 24) lastOnlineText = hours + "h ago";
      else lastOnlineText = days + "d ago";
    }
    lastOnline.innerHTML = `<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--status-online)"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div><div class="stat-value">${lastOnlineText}</div><div class="stat-label">Last Online</div>`;
    card.appendChild(up);
    card.appendChild(down);
    card.appendChild(rem);
    card.appendChild(exp);
    card.appendChild(lastOnline);
    return card;
  }
  function renderNodesList() {
    const wrap = mkEl("div", "span-12");
    wrap.innerHTML = `<div class="nodes-header"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Configuration Links</div>`;
    const grid = mkEl("div", "node-grid");
    const links =
      getEl("subscription-links")?.value.split("\n").filter(Boolean) || [];
    links.forEach((link, i) => {
      grid.appendChild(renderNode(link, i));
    });
    wrap.appendChild(grid);
    return wrap;
  }
  function renderNode(link, idx) {
    let proto = link.split("://")[0].toUpperCase(),
      name = "Node " + (idx + 1);
    try {
      if (link.includes("#")) {
        name = cleanupName(link.split("#")[1]);
      } else if (proto === "VMESS") {
        const b = JSON.parse(atob(link.replace("vmess://", "")));
        if (b.ps) name = cleanupName(b.ps);
      }
    } catch (e) {}
    const card = mkEl("div", "node-card");
    card.style.animationDelay = 0.3 + idx * 0.04 + "s";
    card.innerHTML = `<div class="node-info"><span class="proto-badge">${proto}</span><span class="node-name">${name}</span></div><div class="node-actions" style="display:flex; gap:8px;"><div class="icon-btn-mini" id="btn-copy-${idx}" title="Copy Config"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></div><div class="icon-btn-mini" id="btn-qr-${idx}" title="Show QR"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></div></div>`;
    card.querySelector(`#btn-copy-${idx}`).onclick = (e) => {
      e.stopPropagation();
      copy(link);
    };
    card.querySelector(`#btn-qr-${idx}`).onclick = (e) => {
      e.stopPropagation();
      showQR(link, name);
    };
    return card;
  }
  function renderInfrastructureSection() {
    const wrap = mkEl("div", "span-12");
    wrap.innerHTML = `<div class="nodes-header" style="margin-top:20px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19L19 19C20.1046 19 21 18.1046 21 17C21 15.8954 20.1046 15 19 15L18.1 15C17.55 12.15 15.05 10 12 10C9.6 10 7.55 11.35 6.55 13.35C4.55 13.7 3 15.45 3 17.5C3 19.433 4.567 21 6.5 21L7.5 21"></path></svg> Infrastructure Insights</div>`;
    const grid = mkEl("div", "infra-grid");
    const hosting = mkEl("div", "infra-card");
    hosting.innerHTML = `<div class="infra-icon" id="infra-isp-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-isp)"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg></div><div class="infra-details"><div class="infra-value" id="infra-isp">${STATE.raw.isp}</div><div class="infra-label">Provider</div></div>`;
    const locCard = mkEl("div", "infra-card");
    locCard.innerHTML = `<div class="infra-icon" id="infra-loc-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-loc)"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg></div><div class="infra-details"><div class="infra-value" id="infra-loc">${STATE.raw.location}</div><div class="infra-label">Region</div></div>`;
    const ping = mkEl("div", "infra-card");
    ping.innerHTML = `<div class="infra-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-ping)"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg></div><div class="infra-details"><div class="infra-value" id="ping-value">Check Latency</div><div class="infra-label">Client to Server</div></div><div class="ping-action-wrap"><div class="ping-dot" id="ping-dot"></div><div class="icon-btn-mini" id="btn-ping" title="Check Ping"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg></div></div>`;
    ping.querySelector("#btn-ping").onclick = () => checkPing();
    grid.appendChild(hosting);
    grid.appendChild(locCard);
    grid.appendChild(ping);
    wrap.appendChild(grid);
    return wrap;
  }
  function renderStatsGrid() {
    const wrap = mkEl("div", "span-12");
    wrap.innerHTML = `<div class="nodes-header"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> Server Monitor</div>`;
    const grid = mkEl("div", "stats-grid-horizontal");
    grid.id = "stats-grid";
    const cpuCard = mkEl("div", "stat-card-mini");
    cpuCard.innerHTML = `<div class="stat-mini-icon" style="color:var(--theme-cpu)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg></div><div class="stat-mini-content"><div class="stat-mini-label">CPU Usage</div><div class="stat-mini-value"><span id="cpu-val">0</span>%</div></div>`;
    const ramCard = mkEl("div", "stat-card-mini");
    ramCard.innerHTML = `<div class="stat-mini-icon" style="color:var(--theme-ram)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h16M4 18h16M8 2v20M12 2v20M16 2v20"/></svg></div><div class="stat-mini-content"><div class="stat-mini-label">Memory</div><div class="stat-mini-value"><span id="ram-val">0</span>%</div></div>`;
    const uploadCard = mkEl("div", "stat-card-mini");
    uploadCard.innerHTML = `<div class="stat-mini-icon" style="color:var(--theme-up)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></div><div class="stat-mini-content"><div class="stat-mini-label">Upload</div><div class="stat-mini-value" id="upload-val">0 KB/s</div></div>`;
    const downloadCard = mkEl("div", "stat-card-mini");
    downloadCard.innerHTML = `<div class="stat-mini-icon" style="color:var(--theme-down)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="8 12 12 16 16 12"/><line x1="12" y1="16" x2="12" y2="3"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></div><div class="stat-mini-content"><div class="stat-mini-label">Download</div><div class="stat-mini-value" id="download-val">0 KB/s</div></div>`;
    grid.appendChild(cpuCard);
    grid.appendChild(ramCard);
    grid.appendChild(uploadCard);
    grid.appendChild(downloadCard);
    wrap.appendChild(grid);
    return wrap;
  }
  function startStatsPolling() {
    if (window.statsPollingActive) return;
    window.statsPollingActive = true;
    const formatSpeed = (kbps) =>
      kbps >= 1024 ? (kbps / 1024).toFixed(1) + " MB/s" : kbps + " KB/s";
    const poll = async () => {
      try {
        const res = await fetch("assets/css/status.json?t=" + Date.now());
        if (res.ok) {
          const data = await res.json();
          const cpuEl = getEl("cpu-val"),
            ramEl = getEl("ram-val");
          if (cpuEl) cpuEl.textContent = data.cpu || 0;
          if (ramEl) ramEl.textContent = data.ram || 0;
          const uploadEl = getEl("upload-val"),
            downloadEl = getEl("download-val");
          if (uploadEl) uploadEl.textContent = formatSpeed(data.net_out || 0);
          if (downloadEl)
            downloadEl.textContent = formatSpeed(data.net_in || 0);
          if (data.isp) {
            const ispEl = getEl("infra-isp");
            if (ispEl) ispEl.textContent = data.isp;
            if (STATE.raw) STATE.raw.isp = data.isp;
          }
          if (data.region) {
            const locEl = getEl("infra-loc");
            if (locEl) locEl.textContent = data.region;
            if (STATE.raw) STATE.raw.location = data.region;
          }
          applyTheme();
        }
      } catch (e) {}
      setTimeout(poll, 2000);
    };
    poll();
  }
  function checkPing() {
    const valEl = getEl("ping-value"),
      dot = getEl("ping-dot"),
      btn = getEl("btn-ping");
    if (!valEl || !btn || btn.classList.contains("loading")) return;
    btn.classList.add("loading");
    dot.className = "ping-dot pinging";
    valEl.className = "infra-value";
    valEl.textContent = "Testing...";
    const startTime = Date.now();
    fetch(window.location.href, { method: "HEAD", cache: "no-cache" })
      .then(() => {
        const latency = Date.now() - startTime;
        valEl.textContent = latency + "ms";
        btn.classList.remove("loading");
        btn.style.animation = "";
        dot.classList.remove("pinging", "success", "warn", "error");
        valEl.classList.remove("text-green", "text-yellow", "text-red");
        if (latency < 150) {
          dot.classList.add("success");
          valEl.classList.add("text-green");
        } else if (latency < 400) {
          dot.classList.add("warn");
          valEl.classList.add("text-yellow");
        } else {
          dot.classList.add("error");
          valEl.classList.add("text-red");
        }
        showToast("Latency: " + latency + "ms");
      })
      .catch(() => {
        valEl.textContent = "Error";
        btn.classList.remove("loading");
        btn.style.animation = "";
        dot.classList.remove("pinging");
        dot.classList.add("error");
        valEl.classList.add("text-red");
      });
  }
  function renderQRModal() {
    const overlay = mkEl("div", "modal-overlay");
    overlay.id = "qr-modal";
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    };
    overlay.style.opacity = "0";
    overlay.style.visibility = "hidden";
    overlay.style.pointerEvents = "none";
    const content = mkEl("div", "qr-modal");
    content.innerHTML = `<div class="qr-header"><div class="qr-spacer"></div><h3 id="qr-title">${t("qr")}</h3><div class="qr-close" onclick="document.getElementById('qr-modal').classList.remove('open')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div></div><div class="qr-container"><canvas id="qr-canv"></canvas><div class="qr-scan-line"></div></div><div class="qr-footer">Scan this QR code to import configuration</div>`;
    overlay.appendChild(content);
    setTimeout(() => {
      const loadQR = () =>
        new QRious({
          element: getEl("qr-canv"),
          value: STATE.subUrl,
          size: 250,
        });
      if (window.QRious) loadQR();
      else {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js";
        s.onload = loadQR;
        document.body.appendChild(s);
      }
    }, 100);
    return overlay;
  }
  function showQR(val, title) {
    const modal = getEl("qr-modal"),
      canv = getEl("qr-canv"),
      titleEl = getEl("qr-title");
    if (titleEl) titleEl.textContent = title || t("qr");
    if (window.QRious) {
      requestAnimationFrame(() => {
        new QRious({ element: canv, value: val, size: 250 });
        modal.style.opacity = "";
        modal.style.visibility = "";
        modal.style.pointerEvents = "";
        modal.classList.add("open");
      });
    }
  }
  function renderLoader() {
    const loader = mkEl("div", "preloader");
    loader.id = "app-loader";
    loader.innerHTML = `<div class="loader-content"><div class="loader-spinner"></div><div class="loader-text">USER DASHBOARD</div></div>`;
    document.body.appendChild(loader);
  }
  function hideLoader() {
    const loader = getEl("app-loader");
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => {
        loader.remove();
        document.body.style.overflow = "";
        document.body.style.overflowY = "auto";
        document.body.style.height = "auto";
      }, 800);
    }
  }
  function renderToast() {
    const toastEl = mkEl("div", "premium-toast");
    toastEl.id = "toast";
    toastEl.style.top = "max(24px, env(safe-area-inset-top) + 24px)";
    toastEl.innerText = t("copied");
    return toastEl;
  }
  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024,
      sizes = ["B", "KB", "MB", "GB", "TB"],
      i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
  
  function animateBytes(elId, endBytes, duration = 1200) {
    const el = getEl(elId);
    if (!el || endBytes <= 0) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo for dramatic slowdown at the end
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentBytes = Math.floor(easeProgress * endBytes);
      el.textContent = formatBytes(currentBytes);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = formatBytes(endBytes);
      }
    };
    window.requestAnimationFrame(step);
  }
  
  function startCounters() {
    const s = getStatusInfo();
    animateBytes("usage-val", s.used);
    
    if (STATE.raw.total > 0) {
      const left = STATE.raw.total - s.used;
      animateBytes("rem-val", left < 0 ? 0 : left);
    }
    
    animateBytes("up-total-val", STATE.raw.up);
    animateBytes("down-total-val", STATE.raw.down);
  }
  function copy(txt) {
    if (!txt) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(txt)
        .then(() => showToast(t("copied")))
        .catch(() => {
          fallbackCopy(txt, () => showToast(t("copied")));
        });
    } else {
      fallbackCopy(txt, () => showToast(t("copied")));
    }
  }
  function fallbackCopy(txt, cb) {
    const textArea = document.createElement("textarea");
    textArea.value = txt;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      if (cb) cb();
    } catch (e) {}
    document.body.removeChild(textArea);
  }
  class NeuralNetwork {
    constructor() {
      if (document.getElementById("canvas-bg")) {
        this.canvas = document.getElementById("canvas-bg");
        this.ctx = this.canvas.getContext("2d");
      } else {
        this.canvas = document.createElement("canvas");
        this.canvas.id = "canvas-bg";
        document.body.prepend(this.canvas);
        this.ctx = this.canvas.getContext("2d");
      }
      this.canvas._network = this;
      this.gridOffset = 0;
      this.time = 0;
      this.stars = [];
      this.accentColor = "#00f3ff";
      this.accentMagenta = "#ff003c";
      this.updateStyles();

      if (!this.observer) {
        this.observer = new MutationObserver(() => this.updateStyles());
        this.observer.observe(document.body, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }

      let retries = 0;
      const retryStyles = setInterval(() => {
        this.updateStyles();
        if (++retries > 10) clearInterval(retryStyles);
      }, 100);

      this.resize();
      this.initStars();
      this.roadObjects = [];
      this.initRoadObjects();

      if (!this.handlersBound) {
        window.addEventListener("resize", () => {
          clearTimeout(this.resizeTimeout);
          this.resizeTimeout = setTimeout(() => this.resize(), 200);
        });
        this.handlersBound = true;
      }
      this.animate = this.animate.bind(this);
      if (this.animFrame) cancelAnimationFrame(this.animFrame);
      this.animFrame = requestAnimationFrame(this.animate);
    }
    updateStyles() {
      const style = getComputedStyle(document.body);
      const raw = style.getPropertyValue("--node-color").trim();
      if (raw) {
        const parts = raw.split(",").map((s) => parseInt(s.trim()));
        if (parts.length === 3) {
          this.accentColor = `rgb(${parts[0]},${parts[1]},${parts[2]})`;
        }
      }
    }
    resize() {
      const dpr = window.devicePixelRatio || 1;
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.canvas.width = this.w * dpr;
      this.canvas.height = this.h * dpr;
      this.canvas.style.width = this.w + "px";
      this.canvas.style.height = this.h + "px";
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.horizon = this.h * 0.35;
      this.vanishX = this.w / 2;
      this.initStars();
      this.initRoadObjects();
    }
    initStars() {
      this.stars = [];
      for (let i = 0; i < 80; i++) {
        this.stars.push({
          x: Math.random() * this.w,
          y: Math.random() * this.horizon * 0.85,
          size: Math.random() * 1.5 + 0.3,
          twinkle: Math.random() * Math.PI * 2,
          speed: 0.02 + Math.random() * 0.04,
        });
      }
    }
    initRoadObjects() {
      this.roadObjects = [];
      const types = ['palm', 'palm', 'pylon', 'pylon', 'building', 'building', 'antenna', 'rock'];
      for (let i = 0; i < 18; i++) {
        this.roadObjects.push({
          type: types[i % types.length],
          t: Math.random(),
          side: Math.random() < 0.5 ? -1 : 1,
          laneSlot: 14 + Math.floor(Math.random() * 12), // grid line index 14-25 (well outside road)
          seed: Math.random(),
        });
      }
    }
    drawRoadObjects(ctx) {
      const horizon = this.horizon;
      const bottom = this.h;
      const vanishX = this.vanishX;
      const numVLines = 30; // must match drawGrid's numVLines

      // Sort by depth (farthest first)
      this.roadObjects.sort((a, b) => a.t - b.t);

      for (const obj of this.roadObjects) {
        // Scroll at same speed as grid
        obj.t += 0.004;
        if (obj.t > 1.5) {
          obj.t = Math.random() * 0.05;
          obj.side = Math.random() < 0.5 ? -1 : 1;
          obj.laneSlot = 14 + Math.floor(Math.random() * 12);
          obj.seed = Math.random();
          const types = ['palm', 'palm', 'pylon', 'pylon', 'building', 'building', 'antenna', 'rock'];
          obj.type = types[Math.floor(Math.random() * types.length)];
        }

        // Clamp t for rendering (allow > 1 for off-screen travel)
        const renderT = Math.min(obj.t, 1);
        const perspT = renderT * renderT;
        const y = horizon + perspT * (bottom - horizon);
        const scale = perspT;
        if (scale < 0.005) continue;

        // X position: use the SAME formula as the grid's vertical lines
        const bottomX = vanishX + obj.side * obj.laneSlot * (this.w / numVLines) * 2.5;
        const x = vanishX + (bottomX - vanishX) * perspT;

        const alpha = Math.min(1, scale * 2);
        ctx.globalAlpha = alpha;

        switch (obj.type) {
          case 'palm':
            this._drawPalm(ctx, x, y, scale);
            break;
          case 'pylon':
            this._drawPylon(ctx, x, y, scale);
            break;
          case 'building':
            this._drawBuilding(ctx, x, y, scale, obj.seed);
            break;
          case 'antenna':
            this._drawAntenna(ctx, x, y, scale);
            break;
          case 'rock':
            this._drawRock(ctx, x, y, scale, obj.seed);
            break;
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    _drawPalm(ctx, x, y, scale) {
      const h = scale * 80 + 10;
      const trunkW = scale * 2 + 0.5;
      // Trunk
      ctx.strokeStyle = this.accentColor;
      ctx.lineWidth = trunkW;
      ctx.shadowBlur = 4;
      ctx.shadowColor = this.accentColor;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - scale * 3, y - h);
      ctx.stroke();
      // Fronds (3 lines fanning out from top)
      const topX = x - scale * 3;
      const topY = y - h;
      const frondLen = scale * 30 + 5;
      for (let a = -0.8; a <= 0.8; a += 0.4) {
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(
          topX + Math.cos(a - 1.2) * frondLen * 0.6,
          topY + Math.sin(a - 1.2) * frondLen * 0.3 - frondLen * 0.2,
          topX + Math.cos(a - 0.5) * frondLen,
          topY + frondLen * 0.3
        );
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    _drawPylon(ctx, x, y, scale) {
      const h = scale * 100 + 15;
      const baseW = scale * 20 + 3;
      // Two legs
      ctx.strokeStyle = this.accentColor;
      ctx.lineWidth = scale * 1.5 + 0.5;
      ctx.shadowBlur = 3;
      ctx.shadowColor = this.accentColor;
      ctx.beginPath();
      ctx.moveTo(x - baseW / 2, y);
      ctx.lineTo(x - baseW * 0.1, y - h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + baseW / 2, y);
      ctx.lineTo(x + baseW * 0.1, y - h);
      ctx.stroke();
      // Cross beams
      for (let i = 0.2; i < 0.9; i += 0.3) {
        const beamY = y - h * i;
        const leftX = x - baseW / 2 + (baseW * 0.4) * i;
        const rightX = x + baseW / 2 - (baseW * 0.4) * i;
        ctx.beginPath();
        ctx.moveTo(leftX, beamY);
        ctx.lineTo(rightX, beamY);
        ctx.stroke();
      }
      // Top light (blinking red)
      const blink = Math.sin(this.time * 3) > 0 ? 0.9 : 0.2;
      ctx.fillStyle = `rgba(255,0,60,${blink})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff003c';
      ctx.beginPath();
      ctx.arc(x, y - h, scale * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    _drawBuilding(ctx, x, y, scale, seed) {
      const bw = scale * 40 + 8;
      const bh = scale * (60 + seed * 80) + 10;
      // Building silhouette
      ctx.fillStyle = '#0a0015';
      ctx.fillRect(x - bw / 2, y - bh, bw, bh);
      // Neon outline
      ctx.strokeStyle = this.accentColor;
      ctx.lineWidth = scale * 1 + 0.5;
      ctx.shadowBlur = 5;
      ctx.shadowColor = this.accentColor;
      ctx.strokeRect(x - bw / 2, y - bh, bw, bh);
      // Windows (small lit rectangles)
      const winSize = Math.max(1, scale * 4);
      const winGap = winSize * 2.5;
      ctx.shadowBlur = 0;
      for (let wy = y - bh + winGap; wy < y - winGap; wy += winGap) {
        for (let wx = x - bw / 2 + winGap; wx < x + bw / 2 - winGap; wx += winGap) {
          const lit = Math.sin(wx * 13.7 + wy * 7.3 + seed * 100) > 0;
          ctx.fillStyle = lit ? 'rgba(0,243,255,0.6)' : 'rgba(0,0,0,0.3)';
          ctx.fillRect(wx, wy, winSize, winSize);
        }
      }
      ctx.shadowBlur = 0;
    }
    _drawAntenna(ctx, x, y, scale) {
      const h = scale * 60 + 8;
      // Thin vertical pole
      ctx.strokeStyle = this.accentColor;
      ctx.lineWidth = scale + 0.5;
      ctx.shadowBlur = 3;
      ctx.shadowColor = this.accentColor;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - h);
      ctx.stroke();
      // Dish/arms
      const armLen = scale * 12 + 2;
      ctx.beginPath();
      ctx.moveTo(x - armLen, y - h * 0.7);
      ctx.lineTo(x + armLen, y - h * 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - armLen * 0.6, y - h * 0.85);
      ctx.lineTo(x + armLen * 0.6, y - h * 0.85);
      ctx.stroke();
      // Top blinking light
      const blink = Math.sin(this.time * 5 + x) > 0.3 ? 0.8 : 0.15;
      ctx.fillStyle = `rgba(255,0,60,${blink})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ff003c';
      ctx.beginPath();
      ctx.arc(x, y - h, scale * 2 + 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    _drawRock(ctx, x, y, scale, seed) {
      const rw = scale * 18 + 3;
      const rh = scale * 10 + 2;
      ctx.fillStyle = '#0a0015';
      ctx.beginPath();
      ctx.moveTo(x - rw / 2, y);
      ctx.lineTo(x - rw * 0.3, y - rh);
      ctx.lineTo(x + rw * 0.1, y - rh * 1.2);
      ctx.lineTo(x + rw / 2, y - rh * 0.4);
      ctx.lineTo(x + rw / 2, y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = this.accentColor;
      ctx.lineWidth = scale * 0.5 + 0.3;
      ctx.stroke();
    }
    drawSky(ctx) {
      const grd = ctx.createLinearGradient(0, 0, 0, this.horizon);
      grd.addColorStop(0, "#020005");
      grd.addColorStop(0.4, "#0a001a");
      grd.addColorStop(0.7, "#1a0030");
      grd.addColorStop(0.85, "#3d0055");
      grd.addColorStop(1, "#ff003c");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, this.w, this.horizon + this.h * 0.12); // Extend to ensure no gaps behind curve
    }
    drawStars(ctx) {
      for (const s of this.stars) {
        s.twinkle += s.speed;
        const alpha = 0.4 + Math.sin(s.twinkle) * 0.4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }
    }
    drawSun(ctx) {
      // Align sun with the peak of the curved horizon
      const curvature = this.h * 0.08;
      const cx = this.vanishX;
      const cy = this.horizon - curvature * 0.3;
      const r = Math.min(this.w, this.h) * 0.12;

      // Outer glow
      const glowGrd = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 3);
      glowGrd.addColorStop(0, "rgba(255,0,60,0.4)");
      glowGrd.addColorStop(0.3, "rgba(255,100,0,0.15)");
      glowGrd.addColorStop(1, "rgba(255,0,60,0)");
      ctx.fillStyle = glowGrd;
      ctx.fillRect(0, cy - r * 3, this.w, r * 6);

      // Sun body
      const sunGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      sunGrd.addColorStop(0, "#ffcc00");
      sunGrd.addColorStop(0.3, "#ff6600");
      sunGrd.addColorStop(0.7, "#ff003c");
      sunGrd.addColorStop(1, "rgba(255,0,60,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = sunGrd;
      ctx.fill();

      // Horizontal scan lines across the sun for that retro feel
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const lineGap = 4;
      const scrollOff = (this.time * 20) % (lineGap * 2);
      for (let ly = cy - r + scrollOff; ly < cy + r; ly += lineGap * 2) {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(cx - r, ly, r * 2, lineGap);
      }
      ctx.restore();
    }
    drawGrid(ctx) {
      const horizon = this.horizon;
      const bottom = this.h;
      const vanishX = this.vanishX;
      const curvature = this.h * 0.08; // how much the horizon curves down at edges

      // Helper: get curved Y at a given x position for a base Y level
      const curvedY = (baseY, depth) => {
        const dx = 0; // not used per-point; curvature is in the bezier
        return baseY;
      };

      // Ground fill with curved top edge
      ctx.beginPath();
      ctx.moveTo(0, horizon + curvature);
      ctx.quadraticCurveTo(vanishX, horizon - curvature * 0.3, this.w, horizon + curvature);
      ctx.lineTo(this.w, bottom);
      ctx.lineTo(0, bottom);
      ctx.closePath();
      const groundGrd = ctx.createLinearGradient(0, horizon, 0, bottom);
      groundGrd.addColorStop(0, "#1a0030");
      groundGrd.addColorStop(0.3, "#0a0012");
      groundGrd.addColorStop(1, "#050005");
      ctx.fillStyle = groundGrd;
      ctx.fill();

      ctx.strokeStyle = this.accentColor;
      ctx.lineWidth = 1;

      // Vertical perspective lines (curved outward via quadratic)
      const numVLines = 30;
      for (let i = -numVLines; i <= numVLines; i++) {
        const bottomX = vanishX + i * (this.w / numVLines) * 2.5;
        const alpha = 1 - Math.abs(i) / numVLines;
        ctx.globalAlpha = alpha * 0.5;

        // Control point bows the line outward
        const midY = horizon + (bottom - horizon) * 0.5;
        const bowX = bottomX + (bottomX - vanishX) * 0.15;

        ctx.beginPath();
        ctx.moveTo(vanishX, horizon);
        ctx.quadraticCurveTo(bowX, midY, bottomX, bottom);
        ctx.stroke();
      }

      // Horizontal lines (scrolling towards viewer) - CURVED
      ctx.globalAlpha = 1;
      const numHLines = 25;
      this.gridOffset += 0.004;
      if (this.gridOffset >= 1) this.gridOffset -= 1;

      for (let i = 0; i < numHLines; i++) {
        const t = (i / numHLines + this.gridOffset) % 1;
        const perspT = t * t;
        const baseY = horizon + perspT * (bottom - horizon);
        const spread = perspT * this.w * 2.0;
        const alpha = perspT * 0.7;

        // Curvature scales with distance from horizon (more curve near viewer)
        const lineCurve = curvature * perspT;

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(vanishX - spread, baseY + lineCurve);
        ctx.quadraticCurveTo(vanishX, baseY - lineCurve * 0.3, vanishX + spread, baseY + lineCurve);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    drawRoadDetails(ctx) {
      const horizon = this.horizon;
      const bottom = this.h;
      const vanishX = this.vanishX;

      // Road edge glow lines (left and right)
      const edgeSpread = 0.15; // 15% from center
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.accentColor;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(vanishX, horizon);
        ctx.lineTo(vanishX + side * this.w * edgeSpread * 1.8, bottom);
        ctx.stroke();
        ctx.restore();
      }

      // Center dashed line (scrolling)
      const numDashes = 20;
      for (let i = 0; i < numDashes; i++) {
        const t = ((i / numDashes) + this.gridOffset * 2) % 1;
        const perspT = t * t;
        const y = horizon + perspT * (bottom - horizon);
        const nextT = (((i + 0.3) / numDashes) + this.gridOffset * 2) % 1;
        const nextPerspT = nextT * nextT;
        const nextY = horizon + nextPerspT * (bottom - horizon);

        if (nextY <= y) continue;

        const dashWidth = perspT * 3 + 1;
        const alpha = perspT * 0.8;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#fcee0a";
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#fcee0a";
        ctx.fillRect(vanishX - dashWidth / 2, y, dashWidth, Math.max(1, nextY - y - 2));
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Horizon glow line (curved)
      ctx.save();
      const horizCurve = this.h * 0.08;
      ctx.strokeStyle = "rgba(255,0,60,0.8)";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ff003c";
      ctx.beginPath();
      ctx.moveTo(0, horizon + horizCurve);
      ctx.quadraticCurveTo(vanishX, horizon - horizCurve * 0.3, this.w, horizon + horizCurve);
      ctx.stroke();
      ctx.restore();

      // Random ground grit/sparks near the bottom
      ctx.save();
      for (let i = 0; i < 15; i++) {
        const gx = Math.random() * this.w;
        const gy = horizon + (bottom - horizon) * (0.5 + Math.random() * 0.5);
        const gAlpha = Math.random() * 0.15;
        ctx.fillStyle = `rgba(0,243,255,${gAlpha})`;
        ctx.fillRect(gx, gy, 1, 1);
      }
      ctx.restore();
    }
    animate() {
      this.animFrame = requestAnimationFrame(this.animate);
      this.time += 0.016;
      const ctx = this.ctx;
      const dpr = window.devicePixelRatio || 1;
      // Reset transform to prevent scroll-related accumulation
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      this.drawSky(ctx);
      this.drawStars(ctx);
      this.drawSun(ctx);
      this.drawGrid(ctx);
      this.drawRoadObjects(ctx);
      this.drawRoadDetails(ctx);
    }
  }
  function applyTheme() {
    const s = getStatusInfo();
    document.body.classList.remove(
      "s-dark",
      "s-light",
      "status-active",
      "status-warn",
      "status-depleted",
      "status-unlimited",
    );
    document.body.classList.add(STATE.theme === "dark" ? "s-dark" : "s-light");
    document.body.classList.add(`status-${s.state}`);
    const bg = getEl("canvas-bg");
    if (bg && bg._network) bg._network.updateStyles();
  }
  function toggleTheme(e) {
    const nextTheme = STATE.theme === "dark" ? "light" : "dark";
    const status = getStatusInfo().state,
      mockClass = `premium-theme ${nextTheme === "dark" ? "s-dark" : "s-light"} status-${status}`,
      dummy = document.createElement("div");
    dummy.className = mockClass;
    dummy.style.display = "none";
    document.body.appendChild(dummy);
    const burstColor =
      getComputedStyle(dummy).getPropertyValue("--bg-main").trim() ||
      (nextTheme === "dark" ? "#020617" : "#f8fafc");
    document.body.removeChild(dummy);
    const btn = e.currentTarget,
      rect = btn.getBoundingClientRect(),
      burst = mkEl("div", "theme-burst");
    burst.style.background = burstColor;
    burst.style.left = rect.left + rect.width / 2 + "px";
    burst.style.top = rect.top + rect.height / 2 + "px";
    document.body.appendChild(burst);
    // Add global transition class to soften all color swaps
    document.documentElement.classList.add("theme-transitioning");

    setTimeout(() => {
      STATE.theme = nextTheme;
      localStorage.setItem("xui_theme", STATE.theme);
      applyTheme();
      const btnIcon = getEl("theme-btn");
      if (btnIcon)
        btnIcon.innerHTML =
          STATE.theme === "dark"
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }, 250); // Fast snap behind burst

    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
      burst.remove();
    }, 1600);
  }
  function showToast(msg) {
    const toastEl = getEl("toast");
    if (toastEl) {
      toastEl.innerText = msg;
      toastEl.classList.add("show");
      if (toastEl._timeout) clearTimeout(toastEl._timeout);
      toastEl._timeout = setTimeout(
        () => toastEl.classList.remove("show"),
        2000,
      );
    }
  }
  function updateStatus() {}
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
