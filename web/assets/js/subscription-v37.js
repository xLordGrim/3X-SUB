/**
 * 3X-SUB — v3.7+ Extension
 *
 * This file is ONLY deployed and loaded on 3x-ui >= v3.7.0 installs.
 * Safety guarantees:
 *   - Returns immediately if __SUB_PAGE_DATA__ is absent (v2.x legacy)
 *   - Returns immediately if no v3.7+ exclusive fields are detected
 *   - Returns immediately if #app-root never appears (retry timeout)
 *   - All DOM operations are additive only
 */
(function () {
  'use strict';

  /* GUARD */
  var d = window.__SUB_PAGE_DATA__;
  if (!d) return;

  var IS_V37 =
    typeof d.isOnline    !== 'undefined' ||
    typeof d.resetDay    !== 'undefined' ||
    typeof d.subTitle    !== 'undefined' ||
    typeof d.subAnnounce !== 'undefined' ||
    typeof d.announce    !== 'undefined' ||
    typeof d.hwidLimit   !== 'undefined';

  if (!IS_V37) return;

  /* DATA */
  var EXT = {
    isOnline:      d.isOnline === true,
    hasIsOnline:   typeof d.isOnline !== 'undefined',
    resetDay:      parseInt(d.resetDay    || 0) || 0,
    note:          d.note          || '',
    subTitle:      d.subTitle      || '',
    subAnnounce:   (d.announce || d.subAnnounce || '').trim(),
    subSupportUrl: d.subSupportUrl || '',
    subProfileUrl: d.subProfileUrl || '',
    hwidLimit:     parseInt(d.hwidLimit   || 0) || 0,
    subUrl:        d.subUrl        || '',
    expire:        (parseInt(d.expire || 0) || 0) * 1000,
    lang: localStorage.getItem('xui_lang') || window.__DEFAULT_LANG__ || 'en',
  };

  /* I18N */
  var EXT_I18N = {
    en: {
      resetDay:'Reset Day',day:'Day',deviceLimit:'Device Limit',maxDevices:'Max',
      support:'Support',subscriptionUrl:'Subscription URL',
      onlineBadgeTitle:'Currently connected',offlineBadgeTitle:'Not connected',
      announceClose:'Dismiss',copy:'Copy',
    },
    zh: {
      resetDay:'重置日',day:'第',deviceLimit:'设备限制',maxDevices:'最多',
      support:'支持',subscriptionUrl:'订阅链接',
      onlineBadgeTitle:'当前已连接',offlineBadgeTitle:'未连接',
      announceClose:'关闭',copy:'复制',
    },
    fa: {
      resetDay:'روز ریست',day:'روز',deviceLimit:'محدودیت دستگاه',maxDevices:'حداکثر',
      support:'پشتیبانی',subscriptionUrl:'لینک اشتراک',
      onlineBadgeTitle:'در حال اتصال',offlineBadgeTitle:'قطع',
      announceClose:'رد کردن',copy:'کپی',
    },
  };
  function te(k) {
    var l = EXT_I18N[EXT.lang] || EXT_I18N.en;
    return l[k] || EXT_I18N.en[k] || k;
  }

  /* HELPERS */
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function toJalali(ms) {
    var g=new Date(ms),gy=g.getFullYear(),gm=g.getMonth()+1,gd=g.getDate();
    var dn=365*gy+Math.floor((gy+3)/4)-Math.floor((gy+99)/100)+Math.floor((gy+399)/400)+80+gd+[0,31,59,90,120,151,181,212,243,273,304,334][gm-1];
    var jy=Math.floor((dn-1)/365.25)-473;
    var jd=dn-(365*jy+Math.floor((jy+1)/4)+948+1);
    var jm=jd>186?Math.floor((jd-7)/30)+1:Math.floor(jd/30.6)+1;
    var jdd=jd-(jm<=6?(jm-1)*31:(jm-7)*30+186);
    return (jy+474)+'/'+String(jm).padStart(2,'0')+'/'+String(jdd).padStart(2,'0');
  }

  /* A — Announcement Banner */
  function mountAnnouncement(root) {
    if (!EXT.subAnnounce) return;
    if (localStorage.getItem('xui_announce_dismissed') === EXT.subAnnounce) return;
    if (root.querySelector('#ext-announce')) return;
    var banner = document.createElement('div');
    banner.className = 'ext-announce-banner';
    banner.id = 'ext-announce';
    banner.innerHTML =
      '<span class="ext-announce-icon">📢</span>'+
      '<span class="ext-announce-text">'+escHtml(EXT.subAnnounce)+'</span>'+
      '<button class="ext-announce-close" aria-label="'+te('announceClose')+'">✕</button>';
    banner.querySelector('.ext-announce-close').onclick = function() {
      try { localStorage.setItem('xui_announce_dismissed', EXT.subAnnounce); } catch(e){}
      banner.style.maxHeight = banner.scrollHeight+'px';
      banner.style.padding = '0 16px 0 20px';
      banner.style.margin = '0';
      requestAnimationFrame(function(){ banner.style.maxHeight='0'; banner.style.opacity='0'; });
      setTimeout(function(){ banner.remove(); }, 380);
    };
    var header = root.querySelector('.dashboard-header');
    if (header) root.insertBefore(banner, header); else root.prepend(banner);
  }

  /* B — Live Online Badge */
  function mountOnlineBadge(root) {
    if (!EXT.hasIsOnline) return;
    var avatar = root.querySelector('.avatar');
    if (!avatar) return;
    if (avatar.querySelector('#ext-online-badge')) return;
    if (window.getComputedStyle(avatar).position === 'static') avatar.style.position='relative';
    var badge = document.createElement('span');
    badge.id = 'ext-online-badge';
    badge.className = 'ext-online-badge '+(EXT.isOnline?'ext-is-online':'ext-is-offline');
    badge.title = EXT.isOnline ? te('onlineBadgeTitle') : te('offlineBadgeTitle');
    avatar.appendChild(badge);
  }

  /* C — Support URL Button */
  function mountSupportButton(root) {
    if (!EXT.subSupportUrl) return;
    var controls = root.querySelector('.controls');
    if (!controls) return;
    if (controls.querySelector('#ext-support-btn')) return;
    var btn = document.createElement('a');
    btn.id = 'ext-support-btn';
    btn.className = 'icon-btn';
    btn.href = EXT.subSupportUrl;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.title = te('support');
    btn.setAttribute('aria-label', te('support'));
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    controls.appendChild(btn);
  }

  /* D — Dynamic Page Title */
  function patchPageTitle(root) {
    if (!EXT.subTitle) return;
    var el = root.querySelector('.dashboard-title');
    if (el) el.textContent = EXT.subTitle;
  }

  /* E — Traffic Reset Day Card */
  function mountResetDayCard(root) {
    if (!EXT.resetDay) return;
    var grid = root.querySelector('.stat-mini-grid');
    if (!grid) return;
    if (grid.querySelector('#ext-reset-day')) return;
    var card = document.createElement('div');
    card.id = 'ext-reset-day';
    card.className = 'stat-mini';
    card.innerHTML =
      '<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent)"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></div>'+
      '<div class="stat-value">'+te('day')+' '+EXT.resetDay+'</div>'+
      '<div class="stat-label">'+te('resetDay')+'</div>';
    grid.appendChild(card);
  }

  /* F — HWID Device Limit Card */
  function mountHwidCard(root) {
    if (!EXT.hwidLimit) return;
    var grid = root.querySelector('.stat-mini-grid');
    if (!grid) return;
    if (grid.querySelector('#ext-hwid-limit')) return;
    var card = document.createElement('div');
    card.id = 'ext-hwid-limit';
    card.className = 'stat-mini';
    card.innerHTML =
      '<div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--theme-isp)"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>'+
      '<div class="stat-value">'+te('maxDevices')+' '+EXT.hwidLimit+'</div>'+
      '<div class="stat-label">'+te('deviceLimit')+'</div>';
    grid.appendChild(card);
  }

  /* G — Jalali Expiry Date (Farsi only) */
  function patchJalaliExpiry(root) {
    if (EXT.lang !== 'fa') return;
    if (!EXT.expire || EXT.expire < Date.now()) return;
    var minis = root.querySelectorAll('.stat-mini');
    var expCard = null;
    minis.forEach(function(m){ if (m.querySelector('rect[x="3"][y="4"]')) expCard = m; });
    if (!expCard) return;
    var val = expCard.querySelector('.stat-value');
    if (val) val.textContent = toJalali(EXT.expire);
  }

  /* H — Subscription Profile URL Card */
  function mountProfileUrlCard(root) {
    var url = EXT.subProfileUrl || EXT.subUrl;
    if (!url) return;
    var nodeGrid = root.querySelector('.node-grid');
    if (!nodeGrid) return;
    if (nodeGrid.parentElement && nodeGrid.parentElement.querySelector('#ext-suburl-card')) return;
    var card = document.createElement('div');
    card.id = 'ext-suburl-card';
    card.className = 'ext-suburl-card';
    card.innerHTML =
      '<div class="ext-suburl-label">'+te('subscriptionUrl')+'</div>'+
      '<div class="ext-suburl-row">'+
        '<span class="ext-suburl-value" title="'+escHtml(url)+'">'+escHtml(url)+'</span>'+
        '<button class="icon-btn-mini ext-suburl-copy" title="'+te('copy')+'" aria-label="'+te('copy')+'">'+
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'+
        '</button>'+
        '<button class="icon-btn-mini ext-suburl-qr" title="QR" aria-label="QR Code">'+
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'+
        '</button>'+
      '</div>';
    card.querySelector('.ext-suburl-copy').onclick = function() {
      var btn = card.querySelector('.ext-suburl-copy');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(function(){
          btn.style.color='var(--usage-active)'; setTimeout(function(){ btn.style.color=''; },1500);
        }).catch(function(){ extFallbackCopy(url, btn); });
      } else { extFallbackCopy(url, btn); }
    };
    card.querySelector('.ext-suburl-qr').onclick = function() {
      if (window.QRious) {
        var modal=document.getElementById('qr-modal'),canv=document.getElementById('qr-canv'),titleEl=document.getElementById('qr-title');
        if (modal && canv) {
          if (titleEl) titleEl.textContent = te('subscriptionUrl');
          new QRious({ element: canv, value: url, size: 250 });
          modal.style.opacity=''; modal.style.visibility=''; modal.style.pointerEvents='';
          modal.classList.add('open');
        }
      }
    };
    nodeGrid.parentElement.insertBefore(card, nodeGrid);
  }

  /* I — Live Polling */
  var _pollingStarted = false;
  function startExtPolling() {
    if (_pollingStarted || !EXT.subUrl) return;
    _pollingStarted = true;
    var poll = function() {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function(){ ctrl.abort(); }, 8000) : null;
      fetch(EXT.subUrl+'?format=info', { cache:'no-store', signal: ctrl ? ctrl.signal : undefined })
        .then(function(res){ if (timer) clearTimeout(timer); return res.ok ? res.json() : null; })
        .then(function(data) {
          if (!data) return;
          EXT.isOnline = !!data.isOnline;
          var badge = document.getElementById('ext-online-badge');
          if (badge) {
            badge.className = 'ext-online-badge '+(EXT.isOnline?'ext-is-online':'ext-is-offline');
            badge.title = EXT.isOnline ? te('onlineBadgeTitle') : te('offlineBadgeTitle');
          }
        })
        .catch(function(){ if (timer) clearTimeout(timer); });
    };
    poll();
    setInterval(poll, 60000);
  }

  function extFallbackCopy(text, flashEl) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); if(flashEl){flashEl.style.color='var(--usage-active)';setTimeout(function(){flashEl.style.color='';},1500);} } catch(e){}
    document.body.removeChild(ta);
  }

  /* MOUNT ALL */
  function mountAll(root) {
    if (!root) return;
    mountAnnouncement(root);
    mountOnlineBadge(root);
    mountSupportButton(root);
    patchPageTitle(root);
    mountResetDayCard(root);
    mountHwidCard(root);
    patchJalaliExpiry(root);
    mountProfileUrlCard(root);
    startExtPolling();
  }

  window.__MOUNT_V37__ = function(r) {
    var root = r || document.getElementById('app-root');
    if (root) mountAll(root);
  };

  /* INIT — Wait for subscription.js to render #app-root */
  var _attempts = 0;
  function tryInit() {
    var root = document.getElementById('app-root');
    if (root) { mountAll(root); return; }
    if (++_attempts < 50) setTimeout(tryInit, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInit);
  else setTimeout(tryInit, 0);
})();
