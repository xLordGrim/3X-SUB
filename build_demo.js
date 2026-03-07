const fs = require('fs');

const cssPath = 'web/assets/css/premium.css';
const jsPath = 'web/assets/js/subscription.js';

let cssContent = '';
let jsContent = '';

try {
  cssContent = fs.readFileSync(cssPath, 'utf8');
} catch (e) {
  console.log("Error reading CSS: ", e);
}

try {
  jsContent = fs.readFileSync(jsPath, 'utf8');
  // Fix mojibake
  jsContent = jsContent.replace(/Γ¥ñ∩╕Å/g, "❤️").replace(/3≡¥òÅ/g, "3X");
} catch (e) {
  console.log("Error reading JS: ", e);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>3X-SUB Demo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ant-design-vue@1.7.8/dist/antd.min.css">
  
  <style>
    #demo-banner { position:fixed; top:0;left:0;right:0;z-index:99999; background:linear-gradient(90deg,#6366f1,#8b5cf6 50%,#06b6d4); color:#fff; text-align:center; padding:9px; font-family:Inter,sans-serif; font-size:13px; font-weight:600;}
    body.premium-theme { padding-top:38px !important; }
    .infra-grid { display:grid !important; grid-template-columns:repeat(3,1fr) !important; gap:16px !important; margin-top:16px !important; }
    @media(max-width:768px){ .infra-grid { grid-template-columns:1fr !important; } }
    .infra-card { display:flex !important; align-items:center !important; gap:16px !important; padding:20px !important; background:var(--card-bg) !important; border:1px solid var(--card-border) !important; border-radius:16px !important; min-height:90px !important; transition:all .3s var(--ease-out) !important; }
    .infra-card:hover { transform:translateY(-3px) !important; border-color:var(--accent) !important; }
    .infra-icon { flex-shrink:0 !important; width:52px !important; height:52px !important; border-radius:14px !important; background:rgba(99,102,241,.1) !important; display:flex !important; align-items:center !important; justify-content:center !important; }
    .infra-details { flex:1 !important; min-width:0 !important; }
    .infra-value { font-size:.9rem !important; font-weight:700 !important; color:var(--text-primary) !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; }
    .infra-label { font-size:.7rem !important; color:var(--text-secondary) !important; text-transform:uppercase !important; letter-spacing:.06em !important; font-weight:600 !important; margin-top:4px !important; }
    #scenario-switcher { position:fixed; bottom:24px; right:24px; z-index:10000; display:flex; flex-direction:column; gap:8px; align-items:flex-end; }
    .scenario-btn { font-family:Inter,sans-serif; font-size:13px; font-weight:600; border:none; border-radius:10px; padding:7px 16px; cursor:pointer; }
    .scenario-btn.active { outline:2px solid #fff; }
    [data-scenario="active"]{background:#10b981;color:#fff;} [data-scenario="expired"]{background:#f5bc2b;color:#1a1100;} [data-scenario="depleted"]{background:#ff3131;color:#fff;} [data-scenario="unlimited"]{background:#06b6d4;color:#fff;}
    #init-loader { position:fixed; inset:0; z-index:99998; background:#020617; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:16px; font-family:'Inter',sans-serif; color:rgba(255,255,255,.5); font-size:.85rem; letter-spacing:.08em; transition:opacity .5s; }
    .init-spinner { width:32px; height:32px; border:3px solid rgba(99,102,241,.2); border-top-color:#6366f1; border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style>
  
  <style>
${cssContent}
  </style>

</head>
<body>
  <div id="init-loader"><div class="init-spinner"></div>LOADING DEMO</div>
  <div id="demo-banner">⚡ LIVE PREVIEW — Simulated Data</div>
  
  <div id="subscription-data" style="display:none"
    data-email="DemoUser" data-sid="DemoUser"
    data-totalbyte="107374182400" data-uploadbyte="8589934592"
    data-downloadbyte="29003399168" data-expire="" data-lastonline=""
    data-sub-url="https://yourdomain.com/sub/your-token-here"
    data-ip="Demo Server"></div>

  <textarea id="subscription-links" style="display:none">
vmess://eyJ2IjoiMiIsInBzIjoiVVMgTG9zIEFuZ2VsZXMgMDEiLCJhZGQiOiJ1cy1sYS5leGFtcGxlLmNvbSIsInBvcnQiOiI0NDMiLCJpZCI6ImFiY2RlZjEyLTM0NTYtNzg5MC1hYmNkLWVmMTIzNDU2Nzg5MCIsImFpZCI6IjAiLCJuZXQiOiJ3cyIsInR5cGUiOiJub25lIiwiaG9zdCI6InVzLWxhLmV4YW1wbGUuY29tIiwicGF0aCI6Ii9zb2NrZXQiLCJ0bHMiOiJ0bHMiLCJzY3kiOiJhdXRvIn0=
vless://12345678-abcd-ef01-2345-6789abcdef01@sg-01.example.com:443?type=ws&security=tls&host=sg-01.example.com&path=%2Fwss&sni=sg-01.example.com#SG%20Singapore%2001
trojan://demo-password-secure@jp-01.example.com:443?type=tcp&security=tls&sni=jp-01.example.com#JP%20Tokyo%20Premium
vless://fedcba09-8765-4321-fedc-ba0987654321@de-fra.example.com:443?type=grpc&security=tls&serviceName=proxy&sni=de-fra.example.com#DE%20Frankfurt%2002
ss://Y2hhY2hhMjAtaWV0Zi1wb2x5MTMwNTpkZW1vLXBhc3N3b3Jk@nl-01.example.com:8443#NL%20Amsterdam%2001
  </textarea>

  <div id="scenario-switcher">
    <button class="scenario-btn active" data-scenario="active" onclick="setScenario('active')">✅ Active</button>
    <button class="scenario-btn" data-scenario="expired" onclick="setScenario('expired')">🔴 Expired</button>
    <button class="scenario-btn" data-scenario="depleted" onclick="setScenario('depleted')">🚫 Depleted</button>
    <button class="scenario-btn" data-scenario="unlimited" onclick="setScenario('unlimited')">♾ Unlimited</button>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/moment@2.29.4/moment.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/ant-design-vue@1.7.8/dist/antd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js"></script>

  <script>
    let GB = 1024*1024*1024, DAY = 86400;
    let SCENARIOS = {
      active: { total:100*GB, up:8*GB, down:29*GB, exp:Math.floor(Date.now()/1000)+30*DAY, onl:Math.floor(Date.now()/1000)-300 },
      expired: { total:50*GB, up:2*GB, down:46*GB, exp:Math.floor(Date.now()/1000)-3*DAY, onl:Math.floor(Date.now()/1000)-7200 },
      depleted: { total:30*GB, up:5*GB, down:28*GB, exp:Math.floor(Date.now()/1000)+15*DAY, onl:Math.floor(Date.now()/1000)-86400 },
      unlimited: { total:0, up:12*GB, down:83*GB, exp:0, onl:Math.floor(Date.now()/1000)-30 }
    };
    let currentScenario = 'active';
    function setScenario(k, isInit) {
      currentScenario = k;
      let s = SCENARIOS[k], el = document.getElementById('subscription-data');
      el.setAttribute('data-totalbyte', s.total); el.setAttribute('data-uploadbyte', s.up);
      el.setAttribute('data-downloadbyte', s.down); el.setAttribute('data-expire', s.exp);
      el.setAttribute('data-lastonline', s.onl*1000);
      document.querySelectorAll('.scenario-btn').forEach(b => b.classList.toggle('active', b.dataset.scenario===k));
      if (!isInit) {
        window.location.hash = k;
        if(window.__reinitApp) window.__reinitApp(); else window.location.reload();
      }
    }
    (function() {
      var hash = window.location.hash.replace('#', '');
      if (SCENARIOS[hash]) currentScenario = hash;
      setScenario(currentScenario, true);
    })();
    let _rf = window.fetch.bind(window);
    window.fetch = function(url,opts) {
      if(String(url).includes('status.json')) {
        return Promise.resolve(new Response(JSON.stringify({cpu:12,ram:34,net_in:450,net_out:120,isp:'Test ISP',region:'Test Region'}), {status:200,headers:{'content-type':'application/json'}}));
      }
      return _rf(url,opts);
    };
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(function(){
        var l = document.getElementById('init-loader');
        if(l){ l.style.opacity='0'; setTimeout(function(){ l.remove(); },500); }
      }, 900);
    });
  </script>
  
  <!-- The main app logic -->
  <script>
${jsContent}
  </script>
</body>
</html>
`;

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully generated index.html. Size: ' + html.length);
