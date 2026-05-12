/**
 * Serveur admin ColiSN — Design BankDash (Figma)
 * Palette: #1814f3 primary, #fcaa0b accent, #f5f7fa bg, cartes blanches border-radius 25px
 */
const path = require('path');
const express = require(path.join(__dirname, '../colisn-backend/node_modules/express'));
const app = express();
const PORT = 3001;
const API = 'http://localhost:3000/api/v1';

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ColiSN Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --primary:#1814f3;--accent:#fcaa0b;--text-dark:#343c6a;--text-mid:#333b69;
      --text-light:#718ebf;--bg:#f5f7fa;--card:#fff;--border:#e6eff5;
      --sidebar-w:250px;--header-h:100px;
    }
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text-dark);min-height:100vh}

    /* ── SIDEBAR ───────────────────────────────────────────── */
    .sidebar{position:fixed;left:0;top:0;width:var(--sidebar-w);height:100vh;background:var(--card);border-right:1px solid var(--border);display:flex;flex-direction:column;z-index:100}
    .sidebar-logo{padding:24px 28px;display:flex;align-items:center;gap:10px}
    .sidebar-logo .logo-icon{width:40px;height:40px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700}
    .sidebar-logo .logo-text{font-size:20px;font-weight:700;color:var(--primary)}
    .sidebar-logo .logo-sub{font-size:10px;color:var(--text-light);margin-top:1px}
    .nav-list{flex:1;padding:8px 0;overflow-y:auto}
    .nav-item{position:relative;display:flex;align-items:center;gap:14px;padding:14px 28px;color:var(--text-light);font-size:16px;font-weight:500;cursor:pointer;transition:color .2s;user-select:none;text-decoration:none}
    .nav-item:hover{color:var(--text-dark)}
    .nav-item.active{color:var(--primary);font-weight:600}
    .nav-item.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:6px;height:40px;background:var(--primary);border-radius:0 10px 10px 0}
    .nav-item svg{width:22px;height:22px;flex-shrink:0}
    .sidebar-footer{padding:20px 28px;border-top:1px solid var(--border)}
    .sidebar-footer a{font-size:12px;color:var(--text-light);text-decoration:none}
    .sidebar-footer a:hover{color:var(--primary)}
    .online-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#16dbcc;margin-right:4px}

    /* ── HEADER ────────────────────────────────────────────── */
    .header{position:fixed;left:var(--sidebar-w);right:0;top:0;height:var(--header-h);background:var(--card);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 32px;z-index:99;gap:16px}
    .header-title{font-size:22px;font-weight:600;color:var(--text-dark);flex:1}
    .header-search{background:var(--bg);border:none;padding:10px 18px;border-radius:40px;font-size:14px;color:var(--text-dark);width:250px;outline:none}
    .header-search::placeholder{color:var(--text-light)}
    .header-actions{display:flex;align-items:center;gap:16px}
    .avatar-circle{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#7b79f7);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;cursor:pointer}
    .user-name{font-size:14px;font-weight:500;color:var(--text-dark)}
    .user-role{font-size:12px;color:var(--text-light)}

    /* ── MAIN CONTENT ──────────────────────────────────────── */
    .main{margin-left:var(--sidebar-w);margin-top:var(--header-h);padding:30px 32px;min-height:calc(100vh - var(--header-h))}
    .section{display:none}.section.active{display:block}
    .section-title{font-size:22px;font-weight:600;color:var(--text-mid);margin-bottom:24px}

    /* ── STAT CARDS ────────────────────────────────────────── */
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:28px}
    .stat-card{background:var(--card);border-radius:25px;padding:24px 28px;display:flex;align-items:center;gap:18px}
    .stat-icon{width:60px;height:60px;border-radius:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .stat-icon img,.stat-icon svg{width:28px;height:28px}
    .stat-label{font-size:15px;color:var(--text-light);font-weight:400;margin-bottom:4px}
    .stat-value{font-size:22px;font-weight:700;color:#232323}

    /* ── CARDS ─────────────────────────────────────────────── */
    .card{background:var(--card);border-radius:25px;overflow:hidden;margin-bottom:24px}
    .card-header{padding:22px 28px 0;display:flex;justify-content:space-between;align-items:center}
    .card-title{font-size:18px;font-weight:600;color:var(--text-mid)}
    .card-subtitle{font-size:12px;color:var(--text-light);margin-top:2px}
    .card-body{padding:20px 28px 28px}

    /* ── CHARTS ────────────────────────────────────────────── */
    .charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
    .chart-wrap{background:var(--card);border-radius:25px;padding:24px 28px}
    .chart-legend{display:flex;gap:16px;margin-top:8px}
    .legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-light)}
    .legend-dot{width:10px;height:10px;border-radius:3px}

    /* ── TABLE ─────────────────────────────────────────────── */
    table{width:100%;border-collapse:collapse;font-size:14px}
    thead th{text-align:left;padding:12px 20px;color:var(--text-light);font-weight:400;font-size:13px;background:#fff}
    tbody td{padding:14px 20px;border-top:1px solid var(--border);vertical-align:middle}
    tbody tr:hover td{background:#f8faff}
    .td-name{display:flex;align-items:center;gap:10px}
    .td-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#7b79f7);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;flex-shrink:0}
    .td-primary{font-weight:500;color:#232323;font-size:14px}
    .td-secondary{font-size:12px;color:var(--text-light)}

    /* ── BADGES ────────────────────────────────────────────── */
    .badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:500}
    .badge-green{background:#ccf8f3;color:#16dbcc}
    .badge-blue{background:#e7edff;color:var(--primary)}
    .badge-yellow{background:#fff5d9;color:#ffbb38}
    .badge-red{background:#ffe0eb;color:#ff4b7a}
    .badge-gray{background:#f0f0f0;color:#888}
    .badge-purple{background:#f3e8ff;color:#9333ea}
    .badge-teal{background:#dcfce7;color:#15803d}

    /* ── BUTTONS ───────────────────────────────────────────── */
    .btn{padding:10px 22px;border-radius:12px;border:none;cursor:pointer;font-size:14px;font-weight:600;font-family:'Inter',sans-serif;transition:all .2s}
    .btn-primary{background:var(--primary);color:#fff}
    .btn-primary:hover{background:#100fe0}
    .btn-outline{background:#fff;border:1px solid var(--border);color:var(--text-light)}
    .btn-danger{background:#ffe0eb;color:#ff4b7a;border:none}
    .btn-danger:hover{background:#ffc7d9}
    .btn-sm{padding:6px 14px;font-size:12px;border-radius:8px}
    .btn-logout{background:#fff;border:1px solid var(--border);color:var(--text-light);padding:8px 20px;border-radius:12px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif}
    .btn-logout:hover{background:var(--bg)}

    /* ── LOGIN OVERLAY ─────────────────────────────────────── */
    #login-overlay{position:fixed;inset:0;background:linear-gradient(135deg,#eef2ff 0%,#f5f7fa 100%);display:flex;align-items:center;justify-content:center;z-index:200}
    .login-card{background:#fff;border-radius:25px;padding:40px;width:440px;box-shadow:0 20px 60px rgba(24,20,243,.08)}
    .login-logo{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .login-logo-icon{width:44px;height:44px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700}
    .login-logo-text{font-size:22px;font-weight:700;color:var(--primary)}
    .login-subtitle{font-size:14px;color:var(--text-light);margin-bottom:28px}
    .tabs{display:flex;background:var(--bg);border-radius:12px;padding:4px;margin-bottom:24px;gap:4px}
    .tab-btn{flex:1;padding:9px;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;background:transparent;color:var(--text-light)}
    .tab-btn.active{background:#fff;color:var(--primary);box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .form-group{margin-bottom:18px}
    .form-label{display:block;font-size:13px;color:var(--text-light);margin-bottom:6px;font-weight:500}
    .form-input{width:100%;background:var(--bg);border:1.5px solid var(--border);color:var(--text-dark);padding:12px 16px;border-radius:12px;font-size:14px;font-family:'Inter',sans-serif;outline:none;transition:border-color .2s}
    .form-input:focus{border-color:var(--primary)}
    .dev-note{background:#eef2ff;border-radius:12px;padding:12px 16px;font-size:12px;color:var(--primary);margin-bottom:18px;line-height:1.6}
    .dev-note code{font-size:11px;opacity:.8}
    .error-msg{color:#ff4b7a;font-size:13px;margin-top:10px;display:none;padding:10px 14px;background:#ffe0eb;border-radius:10px}

    /* ── CNI CARD ──────────────────────────────────────────── */
    .cni-card{background:#fff;border-radius:20px;padding:20px;margin-bottom:16px}
    .cni-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
    .cni-imgs{display:flex;gap:16px}
    .cni-img-box label{font-size:11px;color:var(--text-light);display:block;margin-bottom:6px}
    .cni-img-box img{max-width:180px;border-radius:12px;border:1px solid var(--border)}

    /* ── MISC ──────────────────────────────────────────────── */
    .loading{text-align:center;padding:40px;color:var(--text-light)}
    .empty-state{text-align:center;padding:50px 20px;color:var(--text-light)}
    .empty-state div{font-size:36px;margin-bottom:12px}
    .search-bar{background:var(--bg);border:none;padding:10px 18px;border-radius:40px;font-size:14px;color:var(--text-dark);outline:none;width:240px;font-family:'Inter',sans-serif}
    code{font-size:13px;background:#eef2ff;color:var(--primary);padding:2px 8px;border-radius:6px}
    tbody tr.clickable{cursor:pointer}
    tbody tr.clickable:hover td{background:#f0f4ff}

    /* ── DETAIL PANEL ─────────────────────────────────────── */
    #detail-overlay{position:fixed;inset:0;background:rgba(52,60,106,.35);z-index:300;display:none;backdrop-filter:blur(2px)}
    #detail-panel{position:fixed;right:0;top:0;width:500px;height:100vh;background:#fff;z-index:301;display:flex;flex-direction:column;box-shadow:-8px 0 40px rgba(24,20,243,.10);transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1)}
    #detail-panel.open{transform:translateX(0)}
    .dp-header{padding:28px 28px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px;flex-shrink:0}
    .dp-icon{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
    .dp-title{font-size:18px;font-weight:700;color:var(--text-dark);flex:1}
    .dp-subtitle{font-size:12px;color:var(--text-light);margin-top:2px}
    .dp-close{width:36px;height:36px;border-radius:50%;border:none;background:var(--bg);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:var(--text-light);flex-shrink:0;transition:background .2s}
    .dp-close:hover{background:#ffe0eb;color:#ff4b7a}
    .dp-body{flex:1;overflow-y:auto;padding:24px 28px}
    .dp-footer{padding:20px 28px;border-top:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap;flex-shrink:0}
    .dp-section{margin-bottom:24px}
    .dp-section-title{font-size:11px;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px}
    .dp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .dp-field{background:var(--bg);border-radius:12px;padding:12px 16px}
    .dp-field-label{font-size:11px;color:var(--text-light);margin-bottom:4px;font-weight:500}
    .dp-field-value{font-size:14px;color:var(--text-dark);font-weight:500;word-break:break-all}
    .dp-field.full{grid-column:1/-1}
    .dp-user-banner{display:flex;align-items:center;gap:16px;padding:20px;background:linear-gradient(135deg,#eef2ff,#f5f7fa);border-radius:16px;margin-bottom:20px}
    .dp-user-avatar{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#7b79f7);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700;flex-shrink:0}
    .dp-stat-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}
    .dp-stat{flex:1;min-width:80px;background:var(--bg);border-radius:12px;padding:12px;text-align:center}
    .dp-stat-val{font-size:20px;font-weight:700;color:var(--text-dark)}
    .dp-stat-lab{font-size:11px;color:var(--text-light);margin-top:2px}
    .dp-route{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:700;color:var(--text-dark);padding:16px 20px;background:#eef2ff;border-radius:14px;margin-bottom:20px}
    .dp-route-arrow{color:var(--primary);font-size:22px}
    .dp-parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
    .dp-party{background:var(--bg);border-radius:12px;padding:14px}
    .dp-party-label{font-size:10px;text-transform:uppercase;font-weight:700;letter-spacing:.8px;color:var(--text-light);margin-bottom:6px}
    .dp-party-name{font-size:14px;font-weight:600;color:var(--text-dark)}
    .dp-party-phone{font-size:12px;color:var(--text-light);margin-top:2px}
    .progress-bar{background:#e6eff5;height:8px;border-radius:8px;overflow:hidden;margin-top:6px}
    .progress-fill{height:100%;border-radius:8px;background:linear-gradient(90deg,var(--primary),#7b79f7);transition:width .6s}
    .dp-timeline{border-left:2px solid var(--border);padding-left:16px;margin-top:4px}
    .dp-timeline-item{position:relative;margin-bottom:12px;font-size:13px;color:var(--text-mid)}
    .dp-timeline-item::before{content:'';position:absolute;left:-21px;top:5px;width:8px;height:8px;border-radius:50%;background:var(--primary)}
    .btn-warning{background:#fff5d9;color:#d4900a;border:none;font-family:'Inter',sans-serif}
    .btn-warning:hover{background:#ffedb3}
    .btn-success{background:#dcfce7;color:#15803d;border:none;font-family:'Inter',sans-serif}
    .btn-success:hover{background:#bbf7d0}
  </style>
</head>
<body>

<!-- ═══════════════════════ LOGIN ═══════════════════════ -->
<div id="login-overlay">
  <div class="login-card">
    <div class="login-logo">
      <div class="login-logo-icon">📦</div>
      <div>
        <div class="login-logo-text">ColiSN</div>
        <div style="font-size:11px;color:var(--text-light)">Admin Panel</div>
      </div>
    </div>
    <p class="login-subtitle">Tableau de bord administrateur</p>

    <div class="tabs">
      <button class="tab-btn active" id="tab-login" onclick="switchTab('login')">Se connecter</button>
      <button class="tab-btn" id="tab-register" onclick="switchTab('register')">Créer compte admin</button>
    </div>

    <!-- Connexion -->
    <div id="panel-login">
      <div class="dev-note">
        💡 En mode dev, le code OTP est dans les logs :<br>
        <code>tail -f /tmp/colisn-backend.log</code>
      </div>
      <div class="form-group">
        <label class="form-label">Numéro de téléphone</label>
        <input class="form-input" type="text" id="login-phone" value="+221700000001" placeholder="+221771234567">
      </div>
      <div id="login-otp-step" style="display:none">
        <div class="form-group">
          <label class="form-label">Code OTP (6 chiffres)</label>
          <input class="form-input" type="text" id="login-otp" placeholder="123456" maxlength="6" style="letter-spacing:8px;font-size:18px;font-weight:700;text-align:center">
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="verifyLogin()">Se connecter →</button>
      </div>
      <div id="login-phone-step">
        <button class="btn btn-primary" style="width:100%" onclick="sendLoginOtp()">Recevoir le code OTP</button>
      </div>
    </div>

    <!-- Inscription admin -->
    <div id="panel-register" style="display:none">
      <div class="dev-note">
        💡 Le code OTP sera dans les logs :<br>
        <code>tail -f /tmp/colisn-backend.log</code>
      </div>
      <div class="form-group">
        <label class="form-label">Nom complet</label>
        <input class="form-input" type="text" id="reg-name" placeholder="Mamadou Diallo">
      </div>
      <div class="form-group">
        <label class="form-label">Numéro de téléphone</label>
        <input class="form-input" type="text" id="reg-phone" value="+221700000001" placeholder="+221771234567">
      </div>
      <div id="reg-otp-step" style="display:none">
        <div class="form-group">
          <label class="form-label">Code OTP (6 chiffres)</label>
          <input class="form-input" type="text" id="reg-otp" placeholder="123456" maxlength="6" style="letter-spacing:8px;font-size:18px;font-weight:700;text-align:center">
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="verifyRegister()">Créer le compte admin →</button>
      </div>
      <div id="reg-phone-step">
        <button class="btn btn-primary" style="width:100%" onclick="sendRegisterOtp()">Recevoir le code OTP</button>
      </div>
    </div>

    <div id="login-error" class="error-msg"></div>
    <div style="margin-top:16px">
      <button onclick="skipLogin()" style="width:100%;padding:11px;background:none;border:1.5px solid var(--border);border-radius:12px;color:var(--text-light);font-size:13px;cursor:pointer;font-family:'Inter',sans-serif">
        Continuer sans connexion (lecture seule)
      </button>
    </div>
  </div>
</div>

<!-- ══════════════════════ SIDEBAR ══════════════════════ -->
<aside class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">📦</div>
    <div>
      <div class="logo-text">ColiSN</div>
      <div class="logo-sub">Admin Panel</div>
    </div>
  </div>
  <nav class="nav-list">
    <a class="nav-item active" onclick="showSection('dashboard',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      Dashboard
    </a>
    <a class="nav-item" onclick="showSection('users',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.87"/></svg>
      Utilisateurs
    </a>
    <a class="nav-item" onclick="showSection('trips',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/><rect x="9" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></svg>
      Trajets
    </a>
    <a class="nav-item" onclick="showSection('bookings',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
      Réservations
    </a>
    <a class="nav-item" onclick="showSection('disputes',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Litiges
    </a>
    <a class="nav-item" onclick="showSection('cni',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
      CNI à valider
    </a>
  </nav>
  <div class="sidebar-footer">
    <div style="font-size:12px;color:var(--text-light);margin-bottom:6px">
      <span class="online-dot"></span>Backend en ligne
    </div>
    <a href="http://localhost:3000/api/docs" target="_blank" style="color:var(--primary)">📚 Swagger API</a><br>
    <a id="debug-link" href="#" onclick="openDebug()" style="color:#fcaa0b;font-size:11px;margin-top:4px;display:inline-block">🔍 Debug API</a>
  </div>
</aside>

<!-- ═══════════════════════ HEADER ═══════════════════════ -->
<header class="header">
  <div class="header-title" id="header-title">Dashboard</div>
  <input type="search" class="header-search" id="global-search" placeholder="🔍 Rechercher..." oninput="onSearch(this.value)">
  <div class="header-actions">
    <div style="text-align:right">
      <div class="user-name" id="user-name">Administrateur</div>
      <div class="user-role" id="user-role">Admin</div>
    </div>
    <div class="avatar-circle" id="user-avatar">A</div>
    <button class="btn-logout" onclick="logout()">Déconnexion</button>
  </div>
</header>

<!-- ═══════════════════════ MAIN ════════════════════════ -->
<main class="main">

  <!-- ── DASHBOARD ── -->
  <div id="section-dashboard" class="section active">
    <div class="section-title">Vue d'ensemble</div>

    <!-- ── LAUNCH BANNER (temporaire) ── -->
    <div id="launch-banner" style="background:#1e1e2e;border-radius:16px;padding:20px 24px;margin-bottom:28px;position:relative">
      <button onclick="document.getElementById('launch-banner').style.display='none'" style="position:absolute;top:12px;right:14px;background:#313244;border:none;color:#cdd6f4;border-radius:6px;padding:3px 10px;cursor:pointer;font-size:12px">✕</button>
      <div style="color:#cba6f7;font-size:13px;font-weight:700;margin-bottom:14px;letter-spacing:.5px">🚀 COMMANDES DE LANCEMENT</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <div style="color:#6c7086;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">1 — Backend NestJS</div>
          <pre style="background:#181825;color:#a6e3a1;font-size:12px;padding:12px 14px;border-radius:10px;margin:0;line-height:1.7">cd ~/moncolis/colisn-backend
npm run start:dev</pre>
          <div style="color:#6c7086;font-size:11px;margin-top:8px">Ou en arrière-plan :</div>
          <pre style="background:#181825;color:#a6e3a1;font-size:12px;padding:10px 14px;border-radius:10px;margin-top:4px;line-height:1.7">npm run start:dev &gt; /tmp/colisn-backend.log 2&gt;&amp;1 &amp;</pre>
        </div>
        <div>
          <div style="color:#6c7086;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">2 — Serveur admin</div>
          <pre style="background:#181825;color:#89b4fa;font-size:12px;padding:12px 14px;border-radius:10px;margin:0;line-height:1.7">cd ~/moncolis/colisn-admin
node simple-server.js</pre>
          <div style="color:#6c7086;font-size:11px;margin-top:8px">Voir les OTP :</div>
          <pre style="background:#181825;color:#f38ba8;font-size:12px;padding:10px 14px;border-radius:10px;margin-top:4px;line-height:1.7">tail -f /tmp/colisn-backend.log</pre>
        </div>
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid #313244;display:flex;gap:24px;align-items:center">
        <div style="color:#6c7086;font-size:12px">🔑 Identifiants admin dev :</div>
        <code style="background:#313244;color:#cba6f7;padding:4px 12px;border-radius:6px;font-size:12px">+221700000001</code>
        <div style="color:#6c7086;font-size:12px">→ code OTP dans les logs backend</div>
        <div style="color:#6c7086;font-size:12px">· Admin panel : <span style="color:#89b4fa">http://localhost:3001</span></div>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-icon" style="background:#e7edff">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1814f3" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>
        </div>
        <div>
          <div class="stat-label">Utilisateurs</div>
          <div class="stat-value" id="stat-users">—</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fff5d9">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffbb38" stroke-width="2"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/><rect x="9" y="11" width="14" height="10" rx="2"/></svg>
        </div>
        <div>
          <div class="stat-label">Trajets actifs</div>
          <div class="stat-value" id="stat-trips">—</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#ffe0eb">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4b7a" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
        </div>
        <div>
          <div class="stat-label">Réservations</div>
          <div class="stat-value" id="stat-bookings">—</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#dcfaf8">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16dbcc" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div>
          <div class="stat-label">Litiges ouverts</div>
          <div class="stat-value" id="stat-disputes">—</div>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-wrap">
        <div class="card-title">Réservations — 6 derniers mois</div>
        <div class="chart-legend" style="margin:8px 0 12px">
          <div class="legend-item"><div class="legend-dot" style="background:#1814f3"></div>Réservations</div>
          <div class="legend-item"><div class="legend-dot" style="background:#fcaa0b"></div>Confirmées</div>
        </div>
        <canvas id="chart-bookings" height="180"></canvas>
      </div>
      <div class="chart-wrap">
        <div class="card-title">Statuts des réservations</div>
        <div style="margin-top:8px"></div>
        <canvas id="chart-status" height="180"></canvas>
      </div>
    </div>

    <div class="card">
      <div class="card-header" style="padding:22px 28px 16px">
        <div>
          <div class="card-title">Activité récente</div>
          <div class="card-subtitle">Dernières réservations</div>
        </div>
      </div>
      <div id="recent-bookings">
        <div class="loading">Chargement...</div>
      </div>
    </div>
  </div>

  <!-- ── UTILISATEURS ── -->
  <div id="section-users" class="section">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <div class="section-title" style="margin:0">Utilisateurs</div>
      <input type="search" class="search-bar" id="user-search" placeholder="🔍 Rechercher un utilisateur..." oninput="filterUsers()">
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Utilisateur</th><th>Téléphone</th><th>Rôle</th>
            <th>CNI</th><th>Note</th><th>Statut</th><th>Inscrit le</th>
          </tr>
        </thead>
        <tbody id="users-table"><tr><td colspan="7" class="loading">Chargement...</td></tr></tbody>
      </table>
    </div>
  </div>

  <!-- ── TRAJETS ── -->
  <div id="section-trips" class="section">
    <div class="section-title">Trajets</div>
    <div class="card">
      <table>
        <thead>
          <tr><th>Trajet</th><th>Transporteur</th><th>Départ</th><th>Capacité</th><th>Prix/kg</th><th>Véhicule</th><th>Statut</th></tr>
        </thead>
        <tbody id="trips-table"><tr><td colspan="7" class="loading">Chargement...</td></tr></tbody>
      </table>
    </div>
  </div>

  <!-- ── RÉSERVATIONS ── -->
  <div id="section-bookings" class="section">
    <div class="section-title">Réservations</div>
    <div class="card">
      <table>
        <thead>
          <tr><th>ID</th><th>Trajet</th><th>Expéditeur</th><th>Montant</th><th>Poids</th><th>Statut</th><th>Date</th></tr>
        </thead>
        <tbody id="bookings-table"><tr><td colspan="7" class="loading">Chargement...</td></tr></tbody>
      </table>
    </div>
  </div>

  <!-- ── LITIGES ── -->
  <div id="section-disputes" class="section">
    <div class="section-title">Litiges</div>
    <div class="card">
      <table>
        <thead>
          <tr><th>ID</th><th>Réservation</th><th>Ouvert par</th><th>Raison</th><th>Statut</th><th>Date</th><th>Action</th></tr>
        </thead>
        <tbody id="disputes-table"><tr><td colspan="7" class="loading">Chargement...</td></tr></tbody>
      </table>
    </div>
  </div>

  <!-- ── CNI ── -->
  <div id="section-cni" class="section">
    <div class="section-title">CNI en attente de validation</div>
    <div id="cni-list"><div class="loading">Chargement...</div></div>
  </div>

</main>

<!-- ═══════════════════ DETAIL PANEL ════════════════════ -->
<div id="detail-overlay" onclick="closeDetail()"></div>
<div id="detail-panel">
  <div class="dp-header">
    <div class="dp-icon" id="dp-icon">📦</div>
    <div style="flex:1">
      <div class="dp-title" id="dp-title">Détail</div>
      <div class="dp-subtitle" id="dp-subtitle"></div>
    </div>
    <button class="dp-close" onclick="closeDetail()">✕</button>
  </div>
  <div class="dp-body" id="dp-body">
    <div class="loading">Chargement...</div>
  </div>
  <div class="dp-footer" id="dp-footer"></div>
</div>

<script>
const API = '${API}';
let token = localStorage.getItem('colisn_admin_token') || '';
let allUsers = [], allBookings = [], allTrips = [], allDisputes = [];
let currentSection = 'dashboard';
let chartBookings, chartStatus;

// ── AUTH ─────────────────────────────────────────────────
function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('panel-login').style.display = isLogin ? 'block' : 'none';
  document.getElementById('panel-register').style.display = isLogin ? 'none' : 'block';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  document.getElementById('login-error').style.display = 'none';
}

async function sendLoginOtp() {
  const phone = document.getElementById('login-phone').value.trim();
  try {
    const r = await fetch(API + '/auth/send-login-otp', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({phone})
    });
    const d = await r.json();
    if (r.ok) {
      document.getElementById('login-phone-step').style.display = 'none';
      document.getElementById('login-otp-step').style.display = 'block';
      const otp = d.data?.otpCode || d.otpCode;
      if (otp) {
        document.getElementById('login-otp').value = otp;
        showErr('✅ OTP (mode test) : ' + otp);
      } else {
        showErr('✅ OTP envoyé par SMS');
      }
    } else { showErr(d.message || 'Erreur: ' + JSON.stringify(d)); }
  } catch(e) { showErr('Erreur réseau: ' + e.message); }
}

async function verifyLogin() {
  const phone = document.getElementById('login-phone').value.trim();
  const otpCode = document.getElementById('login-otp').value.trim();
  try {
    const r = await fetch(API + '/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({phone, otpCode})
    });
    const d = await r.json();
    if (r.ok && d.data?.accessToken) {
      onLoginSuccess(d.data);
    } else { showErr(d.message || 'OTP incorrect ou compte introuvable'); }
  } catch(e) { showErr('Erreur réseau: ' + e.message); }
}

async function sendRegisterOtp() {
  const phone = document.getElementById('reg-phone').value.trim();
  try {
    const r = await fetch(API + '/auth/send-register-otp', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({phone})
    });
    const d = await r.json();
    if (r.ok) {
      document.getElementById('reg-phone-step').style.display = 'none';
      document.getElementById('reg-otp-step').style.display = 'block';
      const otp = d.data?.otpCode || d.otpCode;
      if (otp) {
        document.getElementById('reg-otp').value = otp;
        showErr('✅ OTP (mode test) : ' + otp);
      } else {
        showErr('✅ OTP envoyé par SMS');
      }
    } else { showErr(d.message || 'Erreur: ' + JSON.stringify(d)); }
  } catch(e) { showErr('Erreur réseau: ' + e.message); }
}

async function verifyRegister() {
  const phone = document.getElementById('reg-phone').value.trim();
  const otpCode = document.getElementById('reg-otp').value.trim();
  const fullName = document.getElementById('reg-name').value.trim();
  if (!fullName) { showErr('Entrez votre nom complet'); return; }
  try {
    const r = await fetch(API + '/auth/register', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({phone, otpCode, fullName, role:'ADMIN'})
    });
    const d = await r.json();
    if ((r.status === 200 || r.status === 201) && d.data?.accessToken) {
      onLoginSuccess(d.data);
    } else { showErr(d.message || 'Erreur inscription: ' + JSON.stringify(d)); }
  } catch(e) { showErr('Erreur réseau: ' + e.message); }
}

function onLoginSuccess(data) {
  token = data.accessToken;
  localStorage.setItem('colisn_admin_token', token);
  const name = data.user?.fullName || 'Admin';
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('user-name').textContent = name;
  document.getElementById('user-avatar').textContent = name[0].toUpperCase();
  loadAll();
}

function skipLogin() {
  document.getElementById('login-overlay').style.display = 'none';
  loadAll();
}

function logout() {
  localStorage.removeItem('colisn_admin_token');
  token = '';
  location.reload();
}

function showErr(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.style.display = 'block';
}

// ── API ───────────────────────────────────────────────────
async function api(path, opts = {}) {
  const headers = {'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token} : {})};
  const r = await fetch(API + path, {headers, ...opts});
  const json = await r.json();
  // LOG visible dans la console navigateur (F12 > Console)
  const ok = r.status >= 200 && r.status < 300;
  console[ok ? 'log' : 'error'](
    (ok ? '✅' : '❌') + ' [API] ' + (opts.method || 'GET') + ' ' + path,
    '→ HTTP', r.status,
    '| data:', Array.isArray(json?.data) ? json.data.length + ' items' : (json?.data ? 'objet' : 'VIDE/NULL'),
    '| raw:', json
  );
  return json;
}

// ── DEBUG PANEL ──────────────────────────────────────────
function showDebug(containerId, path, response) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const ok = response && !response.statusCode;
  el.innerHTML = \`
    <div style="background:#1e1e2e;border-radius:12px;padding:16px;margin:12px 0;font-family:monospace">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="color:\${ok?'#3fb950':'#f85149'};font-size:13px">\${ok?'✅':'❌'} \${path}</span>
        <button onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify('__RAW__')},null,2))" style="background:#313244;border:none;color:#cdd6f4;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px">📋 Copier</button>
      </div>
      <pre style="color:#cdd6f4;font-size:11px;overflow:auto;max-height:300px;margin:0;background:#181825;padding:12px;border-radius:8px">\${JSON.stringify(response,null,2)}</pre>
    </div>
  \`.replace(JSON.stringify('__RAW__'), JSON.stringify(response));
}

// ── NAV ───────────────────────────────────────────────────
const SECTION_TITLES = {
  dashboard:'Dashboard', users:'Utilisateurs', trips:'Trajets',
  bookings:'Réservations', disputes:'Litiges', cni:'CNI à valider'
};

function showSection(name, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  el.classList.add('active');
  document.getElementById('header-title').textContent = SECTION_TITLES[name] || name;
  currentSection = name;
  loaders[name]?.();
}

function onSearch(q) {
  if (currentSection === 'users') filterUsers();
}

// ── FORMATTERS ────────────────────────────────────────────
const STATUS_MAP = {
  ACTIVE:{label:'Actif',cls:'green'}, FULL:{label:'Complet',cls:'yellow'},
  COMPLETED:{label:'Terminé',cls:'blue'}, CANCELLED:{label:'Annulé',cls:'gray'},
  PENDING:{label:'En attente',cls:'yellow'}, ACCEPTED:{label:'Accepté',cls:'blue'},
  REFUSED:{label:'Refusé',cls:'red'}, PARCEL_HANDED:{label:'Colis remis',cls:'purple'},
  IN_TRANSIT:{label:'En transit',cls:'purple'}, DELIVERED:{label:'Livré',cls:'teal'},
  CONFIRMED:{label:'Confirmé',cls:'green'}, DISPUTED:{label:'Litige',cls:'red'},
  OPEN:{label:'Ouvert',cls:'red'}, UNDER_REVIEW:{label:'En révision',cls:'yellow'},
  RESOLVED:{label:'Résolu',cls:'green'},
  SENDER:{label:'Expéditeur',cls:'blue'}, CARRIER:{label:'Transporteur',cls:'green'},
  BOTH:{label:'Les deux',cls:'purple'}, ADMIN:{label:'Admin',cls:'red'},
  CAR:{label:'Voiture',cls:'blue'}, MOTORCYCLE:{label:'Moto',cls:'yellow'},
  BUS:{label:'Bus',cls:'purple'}, MINIBUS:{label:'Minibus',cls:'teal'},
  TRUCK:{label:'Camion',cls:'gray'}, OTHER:{label:'Autre',cls:'gray'}
};
function badge(text) {
  const s = STATUS_MAP[text] || {label:text, cls:'gray'};
  return '<span class="badge badge-' + s.cls + '">' + s.label + '</span>';
}
function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-SN', {day:'2-digit', month:'short', year:'numeric'});
}
function fmtAmt(n) {
  return new Intl.NumberFormat('fr-FR').format(n||0) + ' FCFA';
}
function shortId(id) {
  return '<code>' + (id||'').substring(0,8) + '…</code>';
}

// ── LOADERS ──────────────────────────────────────────────
const loaders = {dashboard:loadDashboard, users:loadUsers, trips:loadTrips, bookings:loadBookings, disputes:loadDisputes, cni:loadCni};

async function loadAll() { loadDashboard(); }

async function loadDashboard() {
  try {
    // Stats — /admin/dashboard retourne toutes les stats d'un coup (requiert auth ADMIN)
    // ⚠️ Ne PAS passer ?limit=N aux endpoints admin : NestJS reçoit des strings,
    //    Prisma attend des Int → crash silencieux. On utilise les defaults backend (20).
    // ⚠️ TOUJOURS passer page & limit explicitement : sans eux, NestJS (enableImplicitConversion)
    //    convertit undefined→NaN → Prisma crash 500. Les strings "1","20" sont transformées en Int.
    const [dash, tripsRes, bkAll] = await Promise.allSettled([
      api('/admin/dashboard'),
      api('/trips?page=1&limit=1'),
      api('/admin/bookings?page=1&limit=20')
    ]);

    // ResponseInterceptor enveloppe tout: { success:true, data:{ users:{...}, ... } }
    const statsRaw = dash.status === 'fulfilled' ? dash.value : null;
    const stats = statsRaw?.data || statsRaw; // compatibilité wrapper
    if (stats && stats.users) {
      document.getElementById('stat-users').textContent = stats.users?.total ?? '?';
      document.getElementById('stat-bookings').textContent = stats.bookings?.total ?? '?';
      document.getElementById('stat-disputes').textContent = stats.disputes?.open ?? '?';
    } else {
      // Fallback sans auth: pagination.total depuis les endpoints individuels
      const [u, b, disp] = await Promise.allSettled([
        api('/admin/users?page=1&limit=1'), api('/admin/bookings?page=1&limit=1'), api('/admin/disputes?page=1&limit=1')
      ]);
      document.getElementById('stat-users').textContent = u.value?.pagination?.total ?? '?';
      document.getElementById('stat-bookings').textContent = b.value?.pagination?.total ?? '?';
      document.getElementById('stat-disputes').textContent = disp.value?.pagination?.total ?? '?';
    }
    // Trajets depuis endpoint public
    document.getElementById('stat-trips').textContent =
      tripsRes.status === 'fulfilled' ? (tripsRes.value?.pagination?.total ?? '?') : '?';

    // Charts
    const bookings = bkAll.status === 'fulfilled' ? (bkAll.value?.data || []) : [];
    if (bookings.length) drawCharts(bookings);

    // Tableau récent
    const recent = bookings.slice(0, 10);
    const rows = recent.map(b => \`
      <tr>
        <td>\${shortId(b.id)}</td>
        <td><span style="font-weight:500">\${b.trip?.originCity||'?'} → \${b.trip?.destinationCity||'?'}</span></td>
        <td style="font-weight:600;color:#1814f3">\${fmtAmt(b.totalAmount)}</td>
        <td style="color:var(--text-light)">\${b.weightKg} kg</td>
        <td>\${badge(b.status)}</td>
        <td style="color:var(--text-light)">\${fmt(b.createdAt)}</td>
      </tr>
    \`).join('');
    document.getElementById('recent-bookings').innerHTML = rows
      ? \`<table><thead><tr><th>ID</th><th>Trajet</th><th>Montant</th><th>Poids</th><th>Statut</th><th>Date</th></tr></thead><tbody>\${rows}</tbody></table>\`
      : '<div class="empty-state"><div>📦</div>Aucune réservation</div>';
  } catch(e) {
    document.getElementById('recent-bookings').innerHTML = '<div class="empty-state"><div>⚠️</div>' + e.message + '</div>';
  }
}

function drawCharts(bookings) {
  // Line chart — bookings par mois
  const months = {};
  const confirmed = {};
  bookings.forEach(b => {
    const m = new Date(b.createdAt).toLocaleDateString('fr-FR', {month:'short', year:'2-digit'});
    months[m] = (months[m]||0) + 1;
    if (b.status === 'CONFIRMED' || b.status === 'DELIVERED') confirmed[m] = (confirmed[m]||0) + 1;
  });
  const labels = Object.keys(months).slice(-6);

  if (chartBookings) chartBookings.destroy();
  const ctx1 = document.getElementById('chart-bookings').getContext('2d');
  chartBookings = new Chart(ctx1, {
    type:'line',
    data:{
      labels,
      datasets:[
        {label:'Réservations', data:labels.map(l=>months[l]||0), borderColor:'#1814f3', backgroundColor:'rgba(24,20,243,.08)', tension:.4, fill:true, pointBackgroundColor:'#1814f3', pointRadius:4},
        {label:'Confirmées', data:labels.map(l=>confirmed[l]||0), borderColor:'#fcaa0b', backgroundColor:'rgba(252,170,11,.05)', tension:.4, fill:false, pointBackgroundColor:'#fcaa0b', pointRadius:4}
      ]
    },
    options:{responsive:true, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}, ticks:{color:'#718ebf'}}, y:{grid:{color:'#f0f0f0'}, ticks:{color:'#718ebf'}}}}
  });

  // Bar chart — statuts
  const statuses = {};
  bookings.forEach(b => { statuses[b.status] = (statuses[b.status]||0)+1; });
  const sLabels = Object.keys(statuses);
  const barColors = sLabels.map((_, i) => ['#1814f3','#fcaa0b','#16dbcc','#ff4b7a','#9333ea','#ffbb38'][i%6]);

  if (chartStatus) chartStatus.destroy();
  const ctx2 = document.getElementById('chart-status').getContext('2d');
  chartStatus = new Chart(ctx2, {
    type:'bar',
    data:{
      labels:sLabels.map(s=>STATUS_MAP[s]?.label||s),
      datasets:[{data:sLabels.map(s=>statuses[s]), backgroundColor:barColors, borderRadius:8}]
    },
    options:{responsive:true, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}, ticks:{color:'#718ebf'}}, y:{grid:{color:'#f0f0f0'}, ticks:{color:'#718ebf'}}}}
  });
}

async function loadUsers() {
  try {
    const d = await api('/admin/users?page=1&limit=50');
    allUsers = d?.data || [];
    if (!allUsers.length) {
      document.getElementById('users-table').innerHTML =
        '<tr><td colspan="7" class="empty-state"><div>👥</div>Aucun utilisateur</td></tr>';
      return;
    }
    renderUsers(allUsers);
  } catch(e) {
    document.getElementById('users-table').innerHTML = '<tr><td colspan="7" class="empty-state">❌ Erreur réseau: ' + e.message + '</td></tr>';
  }
}

function renderUsers(users) {
  if (!users.length) {
    document.getElementById('users-table').innerHTML = '<tr><td colspan="7" class="empty-state"><div>👥</div>Aucun utilisateur</td></tr>';
    return;
  }
  document.getElementById('users-table').innerHTML = users.map(u => \`
    <tr class="clickable" onclick="openUserDetail('\${u.id}')">
      <td>
        <div class="td-name">
          <div class="td-avatar">\${(u.fullName||'?')[0].toUpperCase()}</div>
          <div>
            <div class="td-primary">\${u.fullName||'—'}</div>
            <div class="td-secondary">\${u.email||''}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--text-light)">\${u.phone}</td>
      <td>\${badge(u.role)}</td>
      <td>\${u.cniVerified ? badge('CONFIRMED') : '<span class="badge badge-yellow">En attente</span>'}</td>
      <td style="color:var(--text-light)">\${u.rating ? '⭐ ' + u.rating.toFixed(1) : '—'}</td>
      <td>\${u.isBanned ? '<span class="badge badge-red">Banni</span>' : u.isActive ? '<span class="badge badge-green">Actif</span>' : '<span class="badge badge-gray">Inactif</span>'}</td>
      <td style="color:var(--text-light)">\${fmt(u.createdAt)}</td>
    </tr>
  \`).join('');
}

function filterUsers() {
  const q = (document.getElementById('user-search')?.value || document.getElementById('global-search')?.value || '').toLowerCase();
  renderUsers(allUsers.filter(u => (u.fullName + u.phone + (u.email||'')).toLowerCase().includes(q)));
}

async function loadTrips() {
  try {
    const d = await api('/trips?limit=50');
    allTrips = (d?.data || []);
    document.getElementById('trips-table').innerHTML = allTrips.length ? allTrips.map((t, i) => \`
      <tr class="clickable" onclick="openTripDetail(\${i})">
        <td>
          <div class="td-primary">\${t.originCity} → \${t.destinationCity}</div>
          <div class="td-secondary">\${fmt(t.departureDate)}</div>
        </td>
        <td>
          <div class="td-name">
            <div class="td-avatar" style="width:30px;height:30px;font-size:11px">\${(t.carrier?.fullName||'?')[0]}</div>
            <span class="td-primary">\${t.carrier?.fullName||'?'}</span>
          </div>
        </td>
        <td style="color:var(--text-light)">\${fmt(t.departureDate)}</td>
        <td>
          <div style="font-size:13px"><b>\${t.bookedKg}</b>/<span style="color:var(--text-light)">\${t.availableKg} kg</span></div>
          <div style="background:#f0f0f0;height:4px;border-radius:4px;margin-top:4px;width:80px">
            <div style="background:#1814f3;height:4px;border-radius:4px;width:\${Math.round((t.bookedKg/t.availableKg)*80)||0}px"></div>
          </div>
        </td>
        <td style="font-weight:600;color:#1814f3">\${fmtAmt(t.pricePerKg)}/kg</td>
        <td>\${badge(t.vehicleType)}</td>
        <td>\${badge(t.status)}</td>
      </tr>
    \`).join('') : '<tr><td colspan="7" class="empty-state"><div>🚗</div>Aucun trajet</td></tr>';
  } catch(e) {
    document.getElementById('trips-table').innerHTML = '<tr><td colspan="7" class="empty-state">Erreur: ' + e.message + '</td></tr>';
  }
}

async function loadBookings() {
  try {
    const d = await api('/admin/bookings?page=1&limit=50');
    allBookings = d?.data || [];
    if (!allBookings.length) {
      document.getElementById('bookings-table').innerHTML =
        '<tr><td colspan="7" class="empty-state"><div>📦</div>Aucune réservation</td></tr>';
      return;
    }
    document.getElementById('bookings-table').innerHTML = allBookings.map((b, i) => \`
      <tr class="clickable" onclick="openBookingDetail(\${i})">
        <td>\${shortId(b.id)}</td>
        <td><span class="td-primary">\${b.trip?.originCity||'?'} → \${b.trip?.destinationCity||'?'}</span></td>
        <td>
          <div class="td-name">
            <div class="td-avatar" style="width:28px;height:28px;font-size:10px">\${(b.sender?.fullName||'?')[0]}</div>
            <span style="font-size:13px">\${b.sender?.fullName||'?'}</span>
          </div>
        </td>
        <td style="font-weight:600;color:#1814f3">\${fmtAmt(b.totalAmount)}</td>
        <td style="color:var(--text-light)">\${b.weightKg} kg</td>
        <td>\${badge(b.status)}</td>
        <td style="color:var(--text-light)">\${fmt(b.createdAt)}</td>
      </tr>
    \`).join('');
  } catch(e) {
    document.getElementById('bookings-table').innerHTML = '<tr><td colspan="7" class="empty-state">❌ Erreur réseau: ' + e.message + '</td></tr>';
  }
}

async function loadDisputes() {
  try {
    const d = await api('/admin/disputes?page=1&limit=50');
    allDisputes = d?.data || [];
    if (!allDisputes.length) {
      document.getElementById('disputes-table').innerHTML =
        '<tr><td colspan="7" class="empty-state"><div>⚖️</div>Aucun litige</td></tr>';
      return;
    }
    document.getElementById('disputes-table').innerHTML = allDisputes.map((dp, i) => \`
      <tr class="clickable" onclick="openDisputeDetail(\${i})">
        <td>\${shortId(dp.id)}</td>
        <td>\${shortId(dp.bookingId)}</td>
        <td>
          <div class="td-name">
            <div class="td-avatar" style="width:28px;height:28px;font-size:10px">\${(dp.openedBy?.fullName||'?')[0]}</div>
            <span style="font-size:13px">\${dp.openedBy?.fullName||'?'}</span>
          </div>
        </td>
        <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-light)">\${dp.reason}</td>
        <td>\${badge(dp.status)}</td>
        <td style="color:var(--text-light)">\${fmt(dp.createdAt)}</td>
        <td><span style="color:var(--primary);font-size:12px">Voir →</span></td>
      </tr>
    \`).join('');
  } catch(e) {
    document.getElementById('disputes-table').innerHTML = '<tr><td colspan="7" class="empty-state">❌ Erreur réseau: ' + e.message + '</td></tr>';
  }
}

async function loadCni() {
  try {
    const d = await api('/admin/users/pending-cni?page=1&limit=50');
    const users = d?.data || [];
    if (!users.length) {
      document.getElementById('cni-list').innerHTML = '<div class="empty-state"><div>✅</div>Aucune CNI en attente</div>';
      return;
    }
    document.getElementById('cni-list').innerHTML = users.map(u => \`
      <div class="cni-card">
        <div class="cni-header">
          <div class="td-name">
            <div class="td-avatar">\${(u.fullName||'?')[0]}</div>
            <div>
              <div class="td-primary">\${u.fullName}</div>
              <div class="td-secondary">\${u.phone}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-primary" onclick="validateCni('\${u.id}')">✅ Valider</button>
            <button class="btn btn-sm btn-danger" onclick="rejectCni('\${u.id}')">❌ Rejeter</button>
          </div>
        </div>
        <div class="cni-imgs">
          \${u.cniFrontUrl ? \`<div class="cni-img-box"><label>CNI Recto</label><img src="\${u.cniFrontUrl}"></div>\` : ''}
          \${u.cniBackUrl ? \`<div class="cni-img-box"><label>CNI Verso</label><img src="\${u.cniBackUrl}"></div>\` : ''}
        </div>
      </div>
    \`).join('');
  } catch(e) {
    document.getElementById('cni-list').innerHTML = '<div class="empty-state">Erreur: ' + e.message + '</div>';
  }
}

async function validateCni(id) {
  if (!confirm('Valider la CNI de cet utilisateur ?')) return;
  try { await api('/admin/users/'+id+'/validate-cni', {method:'PATCH'}); loadCni(); }
  catch(e) { alert('Erreur: ' + e.message); }
}

async function rejectCni(id) {
  const reason = prompt('Raison du rejet:');
  if (!reason) return;
  try { await api('/admin/users/'+id+'/reject-cni', {method:'PATCH', body:JSON.stringify({reason})}); loadCni(); }
  catch(e) { alert('Erreur: ' + e.message); }
}

async function resolveDispute(id) {
  const resolution = prompt('Résolution du litige:');
  if (!resolution) return;
  try { await api('/admin/disputes/'+id+'/status', {method:'PATCH', body:JSON.stringify({status:'RESOLVED', resolution})}); closeDetail(); loadDisputes(); }
  catch(e) { alert('Erreur: ' + e.message); }
}

// ── DETAIL PANEL ──────────────────────────────────────────

function openDetail() {
  document.getElementById('detail-overlay').style.display = 'block';
  const p = document.getElementById('detail-panel');
  p.style.display = 'flex';
  requestAnimationFrame(() => p.classList.add('open'));
}

function closeDetail() {
  const p = document.getElementById('detail-panel');
  p.classList.remove('open');
  setTimeout(() => {
    p.style.display = 'none';
    document.getElementById('detail-overlay').style.display = 'none';
  }, 300);
}

function setDetailHeader(icon, title, subtitle, bgColor) {
  document.getElementById('dp-icon').textContent = icon;
  document.getElementById('dp-icon').style.background = bgColor || '#eef2ff';
  document.getElementById('dp-title').textContent = title;
  document.getElementById('dp-subtitle').textContent = subtitle || '';
}

// ── USER DETAIL ───────────────────────────────────────────

async function openUserDetail(userId) {
  openDetail();
  setDetailHeader('👤', 'Chargement...', '', '#eef2ff');
  document.getElementById('dp-body').innerHTML = '<div class="loading">Chargement du profil...</div>';
  document.getElementById('dp-footer').innerHTML = '';

  try {
    const d = await api('/admin/users/' + userId);
    const u = d?.data || d;
    renderUserDetail(u);
  } catch(e) {
    document.getElementById('dp-body').innerHTML = '<div class="empty-state">❌ Erreur: ' + e.message + '</div>';
  }
}

function renderUserDetail(u) {
  if (!u || !u.id) {
    document.getElementById('dp-body').innerHTML = '<div class="empty-state">Données introuvables</div>';
    return;
  }

  const banned = u.isBanned;
  setDetailHeader(
    (u.fullName||'?')[0].toUpperCase(),
    u.fullName || 'Utilisateur',
    u.phone + (u.email ? ' · ' + u.email : ''),
    banned ? '#ffe0eb' : '#eef2ff'
  );

  // CNI images section
  const cniHtml = (u.cniFrontUrl || u.cniBackUrl) ? \`
    <div class="dp-section">
      <div class="dp-section-title">📷 Documents CNI</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        \${u.cniFrontUrl ? \`<div><div style="font-size:11px;color:var(--text-light);margin-bottom:4px">Recto</div><img src="\${u.cniFrontUrl}" style="max-width:210px;border-radius:10px;border:1px solid var(--border)"></div>\` : ''}
        \${u.cniBackUrl ? \`<div><div style="font-size:11px;color:var(--text-light);margin-bottom:4px">Verso</div><img src="\${u.cniBackUrl}" style="max-width:210px;border-radius:10px;border:1px solid var(--border)"></div>\` : ''}
      </div>
    </div>
  \` : '';

  // Recent activity
  const recentTrips = (u.tripsAsCarrier||[]).slice(0,3);
  const recentBookings = (u.bookingsAsSender||[]).slice(0,3);
  const activityHtml = (recentTrips.length || recentBookings.length) ? \`
    <div class="dp-section">
      <div class="dp-section-title">📋 Activité récente</div>
      \${recentTrips.length ? \`
        <div style="font-size:12px;color:var(--text-light);margin-bottom:6px;font-weight:600">Trajets créés</div>
        <div class="dp-timeline">
          \${recentTrips.map(t => \`<div class="dp-timeline-item">\${t.originCity||'?'} → \${t.destinationCity||'?'} <span style="color:var(--text-light)">\${fmt(t.departureDate)}</span></div>\`).join('')}
        </div>
      \` : ''}
      \${recentBookings.length ? \`
        <div style="font-size:12px;color:var(--text-light);margin-top:12px;margin-bottom:6px;font-weight:600">Réservations</div>
        <div class="dp-timeline">
          \${recentBookings.map(b => \`<div class="dp-timeline-item">\${fmtAmt(b.totalAmount||0)} — \${badge(b.status)}</div>\`).join('')}
        </div>
      \` : ''}
    </div>
  \` : '';

  // Ban info
  const banInfoHtml = banned ? \`
    <div style="background:#ffe0eb;border-radius:12px;padding:14px 16px;margin-bottom:20px">
      <div style="font-weight:600;color:#ff4b7a;margin-bottom:4px">⛔ Utilisateur banni</div>
      <div style="font-size:13px;color:#c0334a">Raison : \${u.bannedReason || '—'}</div>
      <div style="font-size:12px;color:#c0334a;margin-top:2px">Le \${fmt(u.bannedAt)}</div>
    </div>
  \` : '';

  document.getElementById('dp-body').innerHTML = \`
    <div class="dp-user-banner">
      <div class="dp-user-avatar" style="\${banned ? 'background:linear-gradient(135deg,#ff4b7a,#ff8fab)' : ''}">\${(u.fullName||'?')[0].toUpperCase()}</div>
      <div style="flex:1">
        <div style="font-size:17px;font-weight:700;color:var(--text-dark)">\${u.fullName||'—'}</div>
        <div style="font-size:13px;color:var(--text-light);margin-top:2px">\${u.phone}</div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
          \${badge(u.role)}
          \${u.cniVerified ? badge('CONFIRMED') : '<span class="badge badge-yellow">CNI en attente</span>'}
          \${banned ? '<span class="badge badge-red">Banni</span>' : u.isActive ? '<span class="badge badge-green">Actif</span>' : '<span class="badge badge-gray">Inactif</span>'}
        </div>
      </div>
    </div>

    \${banInfoHtml}

    <div class="dp-stat-row">
      <div class="dp-stat">
        <div class="dp-stat-val">\${u.totalTrips||0}</div>
        <div class="dp-stat-lab">Trajets</div>
      </div>
      <div class="dp-stat">
        <div class="dp-stat-val">\${u.totalParcels||0}</div>
        <div class="dp-stat-lab">Colis</div>
      </div>
      <div class="dp-stat">
        <div class="dp-stat-val">\${u.rating ? u.rating.toFixed(1) : '—'}</div>
        <div class="dp-stat-lab">Note (\${u.ratingCount||0})</div>
      </div>
    </div>

    <div class="dp-section">
      <div class="dp-section-title">ℹ️ Informations</div>
      <div class="dp-grid">
        <div class="dp-field"><div class="dp-field-label">Téléphone</div><div class="dp-field-value">\${u.phone}</div></div>
        <div class="dp-field"><div class="dp-field-label">Email</div><div class="dp-field-value">\${u.email||'—'}</div></div>
        <div class="dp-field"><div class="dp-field-label">Rôle</div><div class="dp-field-value">\${badge(u.role)}</div></div>
        <div class="dp-field"><div class="dp-field-label">CNI</div><div class="dp-field-value">\${u.cniVerified ? '✅ Vérifiée' : '⏳ En attente'}</div></div>
        <div class="dp-field"><div class="dp-field-label">Inscrit le</div><div class="dp-field-value">\${fmt(u.createdAt)}</div></div>
        <div class="dp-field"><div class="dp-field-label">ID</div><div class="dp-field-value" style="font-size:11px">\${u.id}</div></div>
      </div>
    </div>

    \${cniHtml}
    \${activityHtml}
  \`;

  // Footer buttons
  const footerBtns = [];
  if (!u.cniVerified && u.cniFrontUrl) {
    footerBtns.push(\`<button class="btn btn-success" onclick="validateCniDetail('\${u.id}')">✅ Valider CNI</button>\`);
    footerBtns.push(\`<button class="btn btn-danger" onclick="rejectCniDetail('\${u.id}')">❌ Rejeter CNI</button>\`);
  }
  if (banned) {
    footerBtns.push(\`<button class="btn btn-success" onclick="unbanUserDetail('\${u.id}')">🔓 Débannir</button>\`);
  } else {
    footerBtns.push(\`<button class="btn btn-danger" onclick="banUserDetail('\${u.id}')">⛔ Bannir</button>\`);
  }
  document.getElementById('dp-footer').innerHTML = footerBtns.join('');
}

async function validateCniDetail(id) {
  if (!confirm('Valider la CNI de cet utilisateur ?')) return;
  try { await api('/admin/users/'+id+'/validate-cni', {method:'PATCH'}); closeDetail(); loadCni(); loadUsers(); }
  catch(e) { alert('Erreur: ' + e.message); }
}
async function rejectCniDetail(id) {
  const reason = prompt('Raison du rejet:');
  if (!reason) return;
  try { await api('/admin/users/'+id+'/reject-cni', {method:'PATCH', body:JSON.stringify({reason})}); closeDetail(); loadCni(); loadUsers(); }
  catch(e) { alert('Erreur: ' + e.message); }
}
async function banUserDetail(id) {
  const reason = prompt('Raison du bannissement:');
  if (!reason) return;
  try { await api('/admin/users/'+id+'/ban', {method:'PATCH', body:JSON.stringify({reason})}); closeDetail(); loadUsers(); }
  catch(e) { alert('Erreur: ' + e.message); }
}
async function unbanUserDetail(id) {
  if (!confirm('Débannir cet utilisateur ?')) return;
  try { await api('/admin/users/'+id+'/unban', {method:'PATCH'}); closeDetail(); loadUsers(); }
  catch(e) { alert('Erreur: ' + e.message); }
}

// ── BOOKING DETAIL ────────────────────────────────────────

function openBookingDetail(idx) {
  const b = allBookings[idx];
  if (!b) return;
  openDetail();
  setDetailHeader('📦', 'Réservation', shortId(b.id).replace(/<[^>]+>/g,'') + '…', '#ffe0eb');

  const paymentHtml = b.payment ? \`
    <div class="dp-section">
      <div class="dp-section-title">💳 Paiement</div>
      <div class="dp-grid">
        <div class="dp-field"><div class="dp-field-label">Montant</div><div class="dp-field-value" style="color:#1814f3;font-size:16px">\${fmtAmt(b.payment.amount)}</div></div>
        <div class="dp-field"><div class="dp-field-label">Statut</div><div class="dp-field-value">\${badge(b.payment.status)}</div></div>
        <div class="dp-field"><div class="dp-field-label">Méthode</div><div class="dp-field-value">\${b.payment.method||'—'}</div></div>
        <div class="dp-field"><div class="dp-field-label">Total réservation</div><div class="dp-field-value">\${fmtAmt(b.totalAmount)}</div></div>
      </div>
    </div>
  \` : '';

  document.getElementById('dp-body').innerHTML = \`
    \${b.trip ? \`
      <div class="dp-route">
        <span>\${b.trip.originCity||'?'}</span>
        <span class="dp-route-arrow">→</span>
        <span>\${b.trip.destinationCity||'?'}</span>
      </div>
    \` : ''}

    <div class="dp-parties">
      <div class="dp-party">
        <div class="dp-party-label">📤 Expéditeur</div>
        <div class="dp-party-name">\${b.sender?.fullName||'—'}</div>
        <div class="dp-party-phone">\${b.sender?.phone||''}</div>
      </div>
      <div class="dp-party">
        <div class="dp-party-label">🚗 Transporteur</div>
        <div class="dp-party-name">\${b.carrier?.fullName||'—'}</div>
        <div class="dp-party-phone">\${b.carrier?.phone||''}</div>
      </div>
    </div>

    <div class="dp-section">
      <div class="dp-section-title">📋 Détails</div>
      <div class="dp-grid">
        <div class="dp-field"><div class="dp-field-label">Statut</div><div class="dp-field-value">\${badge(b.status)}</div></div>
        <div class="dp-field"><div class="dp-field-label">Poids</div><div class="dp-field-value">\${b.weightKg} kg</div></div>
        <div class="dp-field"><div class="dp-field-label">Montant total</div><div class="dp-field-value" style="color:#1814f3;font-weight:700">\${fmtAmt(b.totalAmount)}</div></div>
        <div class="dp-field"><div class="dp-field-label">Date création</div><div class="dp-field-value">\${fmt(b.createdAt)}</div></div>
        \${b.description ? \`<div class="dp-field full"><div class="dp-field-label">Description colis</div><div class="dp-field-value">\${b.description}</div></div>\` : ''}
        <div class="dp-field full"><div class="dp-field-label">ID complet</div><div class="dp-field-value" style="font-size:11px">\${b.id}</div></div>
      </div>
    </div>

    \${paymentHtml}
  \`;

  document.getElementById('dp-footer').innerHTML = \`
    \${b.sender?.id ? \`<button class="btn btn-outline btn-sm" onclick="openUserDetail('\${b.sender.id}')">👤 Voir expéditeur</button>\` : ''}
    \${b.carrier?.id ? \`<button class="btn btn-outline btn-sm" onclick="openUserDetail('\${b.carrier.id}')">🚗 Voir transporteur</button>\` : ''}
  \`;
}

// ── TRIP DETAIL ───────────────────────────────────────────

function openTripDetail(idx) {
  const t = allTrips[idx];
  if (!t) return;
  openDetail();
  setDetailHeader('🚗', t.originCity + ' → ' + t.destinationCity, fmt(t.departureDate), '#fff5d9');

  const pct = t.availableKg > 0 ? Math.round((t.bookedKg / t.availableKg) * 100) : 0;

  document.getElementById('dp-body').innerHTML = \`
    <div class="dp-route">
      <span>\${t.originCity}</span>
      <span class="dp-route-arrow">→</span>
      <span>\${t.destinationCity}</span>
    </div>

    \${t.carrier ? \`
      <div class="dp-party" style="margin-bottom:20px">
        <div class="dp-party-label">🚗 Transporteur</div>
        <div class="dp-party-name">\${t.carrier.fullName||'—'}</div>
        <div class="dp-party-phone">\${t.carrier.phone||''}</div>
      </div>
    \` : ''}

    <div class="dp-stat-row">
      <div class="dp-stat">
        <div class="dp-stat-val">\${fmtAmt(t.pricePerKg)}</div>
        <div class="dp-stat-lab">/kg</div>
      </div>
      <div class="dp-stat">
        <div class="dp-stat-val">\${t.bookedKg}</div>
        <div class="dp-stat-lab">kg réservés</div>
      </div>
      <div class="dp-stat">
        <div class="dp-stat-val">\${t.availableKg}</div>
        <div class="dp-stat-lab">kg total</div>
      </div>
    </div>

    <div class="dp-section">
      <div class="dp-section-title">📦 Capacité</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
        <span style="color:var(--text-light)">\${t.bookedKg} kg réservés</span>
        <span style="font-weight:600;color:#1814f3">\${pct}% utilisé</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:\${pct}%"></div></div>
    </div>

    <div class="dp-section">
      <div class="dp-section-title">ℹ️ Informations</div>
      <div class="dp-grid">
        <div class="dp-field"><div class="dp-field-label">Statut</div><div class="dp-field-value">\${badge(t.status)}</div></div>
        <div class="dp-field"><div class="dp-field-label">Véhicule</div><div class="dp-field-value">\${badge(t.vehicleType)}</div></div>
        <div class="dp-field"><div class="dp-field-label">Départ</div><div class="dp-field-value">\${fmt(t.departureDate)}</div></div>
        <div class="dp-field"><div class="dp-field-label">Créé le</div><div class="dp-field-value">\${fmt(t.createdAt)}</div></div>
        \${t.notes ? \`<div class="dp-field full"><div class="dp-field-label">Notes</div><div class="dp-field-value">\${t.notes}</div></div>\` : ''}
        <div class="dp-field full"><div class="dp-field-label">ID complet</div><div class="dp-field-value" style="font-size:11px">\${t.id}</div></div>
      </div>
    </div>

    \${t.bookings?.length ? \`
      <div class="dp-section">
        <div class="dp-section-title">📋 Réservations (\${t.bookings.length})</div>
        <div class="dp-timeline">
          \${t.bookings.map(b => \`<div class="dp-timeline-item">\${b.sender?.fullName||'?'} — \${b.weightKg}kg — \${fmtAmt(b.totalAmount)} \${badge(b.status)}</div>\`).join('')}
        </div>
      </div>
    \` : ''}
  \`;

  document.getElementById('dp-footer').innerHTML = t.carrier?.id
    ? \`<button class="btn btn-outline btn-sm" onclick="openUserDetail('\${t.carrier.id}')">👤 Voir transporteur</button>\`
    : '';
}

// ── DISPUTE DETAIL ────────────────────────────────────────

function openDisputeDetail(idx) {
  const dp = allDisputes[idx];
  if (!dp) return;
  openDetail();
  setDetailHeader('⚠️', 'Litige', shortId(dp.id).replace(/<[^>]+>/g,'') + '…', '#ffe0eb');
  renderDisputeDetail(dp);
}

function renderDisputeDetail(dp) {
  const bk = dp.booking;
  const bookingHtml = bk ? \`
    <div class="dp-parties">
      <div class="dp-party">
        <div class="dp-party-label">📤 Expéditeur</div>
        <div class="dp-party-name">\${bk.sender?.fullName||'—'}</div>
        <div class="dp-party-phone">\${bk.sender?.phone||''}</div>
      </div>
      <div class="dp-party">
        <div class="dp-party-label">🚗 Transporteur</div>
        <div class="dp-party-name">\${bk.carrier?.fullName||'—'}</div>
        <div class="dp-party-phone">\${bk.carrier?.phone||''}</div>
      </div>
    </div>
    \${bk.trip ? \`
      <div class="dp-field" style="margin-bottom:16px;grid-column:1/-1">
        <div class="dp-field-label">Trajet concerné</div>
        <div class="dp-field-value">\${bk.trip.originCity} → \${bk.trip.destinationCity}</div>
      </div>
    \` : ''}
    \${bk.payment ? \`
      <div class="dp-section">
        <div class="dp-section-title">💳 Paiement lié</div>
        <div class="dp-grid">
          <div class="dp-field"><div class="dp-field-label">Montant</div><div class="dp-field-value" style="color:#1814f3">\${fmtAmt(bk.payment.amount)}</div></div>
          <div class="dp-field"><div class="dp-field-label">Statut</div><div class="dp-field-value">\${badge(bk.payment.status)}</div></div>
        </div>
      </div>
    \` : ''}
  \` : '';

  document.getElementById('dp-body').innerHTML = \`
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div style="font-size:28px">\${dp.status==='RESOLVED' ? '✅' : dp.status==='UNDER_REVIEW' ? '🔍' : '🚨'}</div>
      <div>
        <div style="font-size:15px;font-weight:700">\${badge(dp.status)}</div>
        <div style="font-size:12px;color:var(--text-light);margin-top:4px">Ouvert le \${fmt(dp.createdAt)}</div>
      </div>
    </div>

    <div class="dp-section">
      <div class="dp-section-title">📝 Raison du litige</div>
      <div style="background:#fff5d9;border-radius:12px;padding:14px 16px;font-size:14px;color:var(--text-dark);line-height:1.6">\${dp.reason||'—'}</div>
      \${dp.description ? \`<div style="margin-top:10px;font-size:13px;color:var(--text-light);line-height:1.6">\${dp.description}</div>\` : ''}
    </div>

    <div class="dp-section">
      <div class="dp-section-title">👤 Ouvert par</div>
      <div class="dp-party">
        <div class="dp-party-name">\${dp.openedBy?.fullName||'—'}</div>
        <div class="dp-party-phone">\${dp.openedBy?.phone||''}</div>
      </div>
    </div>

    \${bookingHtml}

    <div class="dp-section">
      <div class="dp-section-title">🔑 Identifiants</div>
      <div class="dp-grid">
        <div class="dp-field full"><div class="dp-field-label">ID Litige</div><div class="dp-field-value" style="font-size:11px">\${dp.id}</div></div>
        <div class="dp-field full"><div class="dp-field-label">ID Réservation</div><div class="dp-field-value" style="font-size:11px">\${dp.bookingId||'—'}</div></div>
      </div>
    </div>
  \`;

  // Footer actions based on status
  const actions = [];
  if (dp.status === 'OPEN') {
    actions.push(\`<button class="btn btn-warning" onclick="setDisputeStatus('\${dp.id}','UNDER_REVIEW',\${allDisputes.indexOf(dp)})">🔍 Mettre en révision</button>\`);
    actions.push(\`<button class="btn btn-success" onclick="setDisputeStatus('\${dp.id}','RESOLVED',\${allDisputes.indexOf(dp)})">✅ Résoudre</button>\`);
  } else if (dp.status === 'UNDER_REVIEW') {
    actions.push(\`<button class="btn btn-success" onclick="setDisputeStatus('\${dp.id}','RESOLVED',\${allDisputes.indexOf(dp)})">✅ Marquer résolu</button>\`);
    actions.push(\`<button class="btn btn-danger" onclick="setDisputeStatus('\${dp.id}','OPEN',\${allDisputes.indexOf(dp)})">🔄 Rouvrir</button>\`);
  }
  if (dp.openedBy?.id) {
    actions.push(\`<button class="btn btn-outline btn-sm" onclick="openUserDetail('\${dp.openedBy.id}')">👤 Voir profil</button>\`);
  }
  document.getElementById('dp-footer').innerHTML = actions.join('');
}

async function setDisputeStatus(id, status, idx) {
  try {
    await api('/admin/disputes/'+id+'/status', {method:'PATCH', body:JSON.stringify({status})});
    // Reload disputes and refresh panel
    const d = await api('/admin/disputes?page=1&limit=50');
    allDisputes = d?.data || [];
    // Refresh table
    document.getElementById('disputes-table').innerHTML = allDisputes.map((dp, i) => \`
      <tr class="clickable" onclick="openDisputeDetail(\${i})">
        <td>\${shortId(dp.id)}</td>
        <td>\${shortId(dp.bookingId)}</td>
        <td>
          <div class="td-name">
            <div class="td-avatar" style="width:28px;height:28px;font-size:10px">\${(dp.openedBy?.fullName||'?')[0]}</div>
            <span style="font-size:13px">\${dp.openedBy?.fullName||'?'}</span>
          </div>
        </td>
        <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-light)">\${dp.reason}</td>
        <td>\${badge(dp.status)}</td>
        <td style="color:var(--text-light)">\${fmt(dp.createdAt)}</td>
        <td><span style="color:var(--primary);font-size:12px">Voir →</span></td>
      </tr>
    \`).join('');
    // Re-render the dispute if still found
    const updated = allDisputes.find(d => d.id === id);
    if (updated) {
      setDetailHeader('⚠️', 'Litige', shortId(updated.id).replace(/<[^>]+>/g,'') + '…', '#ffe0eb');
      renderDisputeDetail(updated);
    }
  } catch(e) { alert('Erreur: ' + e.message); }
}

// ── DEBUG ─────────────────────────────────────────────────
function openDebug() {
  const t = token || localStorage.getItem('colisn_admin_token') || '';
  window.open('http://localhost:3001/api-test?token=' + encodeURIComponent(t), '_blank');
}

// ── INIT ──────────────────────────────────────────────────
if (token) {
  document.getElementById('login-overlay').style.display = 'none';
  loadAll();
}
</script>
</body>
</html>`);
});

// ══════════════════════════════════════════════════════
//  ENDPOINT DE DEBUG — accessible à http://localhost:3001/api-test?token=TON_JWT
//  Effectue les appels API côté serveur Node.js et retourne les réponses brutes
// ══════════════════════════════════════════════════════
const http = require('http');

app.get('/api-test', async (req, res) => {
  const token = req.query.token || '';
  const backendBase = 'http://localhost:3000/api/v1';

  const call = (urlPath) => new Promise((resolve) => {
    const fullUrl = backendBase + urlPath;
    const opts = {
      hostname: 'localhost', port: 3000,
      path: '/api/v1' + urlPath, method: 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
    };
    const req2 = http.request(opts, (r) => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => {
        try { resolve({ status: r.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: r.statusCode, body: data, parseError: e.message }); }
      });
    });
    req2.on('error', e => resolve({ error: e.message }));
    req2.end();
  });

  console.log('\n🔍 [DEBUG] Appels API en cours...');
  const [dashboard, users, bookings, disputes, trips] = await Promise.all([
    call('/admin/dashboard'),
    call('/admin/users?page=1&limit=50'),
    call('/admin/bookings?page=1&limit=20'),
    call('/admin/disputes?page=1&limit=50'),
    call('/trips?page=1&limit=1'),
  ]);

  const result = { dashboard, users, bookings, disputes, trips };
  console.log('📋 Résultat:');
  console.log(JSON.stringify(result, null, 2));

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>ColiSN API Debug</title>
    <style>body{font-family:monospace;background:#0d1117;color:#c9d1d9;padding:20px}
      h2{color:#58a6ff} details{margin:12px 0} summary{cursor:pointer;color:#79c0ff;font-size:15px;padding:8px;background:#161b22;border-radius:6px}
      pre{background:#161b22;padding:16px;border-radius:8px;overflow:auto;font-size:12px;max-height:400px}
      .ok{color:#3fb950} .err{color:#f85149} .warn{color:#d29922}
    </style></head><body>
    <h2>🔍 ColiSN API Debug — ${new Date().toLocaleTimeString()}</h2>
    <p style="color:#8b949e">Token: ${token ? '✅ fourni ('+token.substring(0,20)+'...)' : '❌ manquant — ajoute ?token=TON_JWT dans l\'URL'}</p>
    ${Object.entries(result).map(([k, v]) => {
      const ok = v.status >= 200 && v.status < 300;
      const hasData = v.body?.data?.length > 0 || (v.body?.data && typeof v.body.data === 'object');
      return `<details open>
        <summary class="${ok ? 'ok' : 'err'}">
          ${ok ? '✅' : '❌'} ${k} — HTTP ${v.status || 'ERR'} ${hasData ? '| ' + (Array.isArray(v.body?.data) ? v.body.data.length + ' items' : 'objet') : '| VIDE'}
        </summary>
        <pre>${JSON.stringify(v, null, 2)}</pre>
      </details>`;
    }).join('')}
  </body></html>`);
});

app.listen(PORT, () => {
  console.log('✅ Admin ColiSN démarré sur http://localhost:' + PORT);
});
