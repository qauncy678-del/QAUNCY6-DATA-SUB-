const API = window.API_BASE_URL || "http://localhost:4000/api";

const NETWORKS = [
  { id: "mtn", name: "MTN", color: "#FFCC00", dark: true },
  { id: "glo", name: "Glo", color: "#00A651", dark: false },
  { id: "airtel", name: "Airtel", color: "#ED1C24", dark: false },
  { id: "9mobile", name: "9mobile", color: "#8DC63F", dark: true },
];

let state = {
  booting: true,
  token: localStorage.getItem("quancy6_token") || null,
  user: null,
  authMode: "login", // "login" | "register"
  authError: null,
  view: "user",
  activeNetwork: "mtn",
  toast: null,
  plans: [],
  transactions: [],
  editingId: null,
  editDraft: { cost: "", price: "" },
  newPlan: { network: "mtn", label: "", validity: "30 days", cost: "", price: "" },
  purchasePhone: "",
};

let toastTimer = null;

// ---------- Helpers ----------
const naira = (n) => `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
const netOf = (id) => NETWORKS.find((n) => n.id === id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

function icon(name, size = 14) {
  const s = size;
  const icons = {
    wifi: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 20 0"/><circle cx="12" cy="20" r="1"/></svg>`,
    wallet: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
    plus: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
    check: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    x: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    shield: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-3 8 3Z"/><path d="m9 12 2 2 4-4"/></svg>`,
    user: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`,
    trash: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
    pencil: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
    arrow: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    history: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`,
    logout: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
  };
  return icons[name] || "";
}

function signalBars(level = 4, small = false) {
  const heights = [6, 10, 14, 18].map((h) => (small ? h * 0.6 : h));
  return `<span class="signal-bars${small ? " sm" : ""}">${heights
    .map((h, i) => `<span class="bar${i < level ? " on" : ""}" style="height:${h}px"></span>`)
    .join("")}</span>`;
}

function statusPill(status) {
  return `<span class="status-pill status-${status}">${status}</span>`;
}

function showToast(msg, tone = "ok") {
  state.toast = { msg, tone };
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; render(); }, 2600);
}

// ---------- API ----------
async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* no body */ }
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function setToken(token) {
  state.token = token;
  if (token) localStorage.setItem("quancy6_token", token);
  else localStorage.removeItem("quancy6_token");
}

async function loadAppData() {
  const [plansRes, txRes, meRes] = await Promise.all([
    api("/plans", { auth: false }),
    api("/transactions"),
    api("/auth/me"),
  ]);
  state.plans = plansRes.plans;
  state.transactions = txRes.transactions;
  state.user = meRes.user;
}

async function boot() {
  if (state.token) {
    try {
      await loadAppData();
    } catch (err) {
      setToken(null);
      state.user = null;
    }
  }
  state.booting = false;
  render();
}

// ---------- Auth actions ----------
async function handleAuthSubmit(mode, fields) {
  state.authError = null;
  try {
    const payload =
      mode === "login"
        ? { email: fields.email, password: fields.password }
        : { name: fields.name, email: fields.email, phone: fields.phone, password: fields.password };
    const data = await api(mode === "login" ? "/auth/login" : "/auth/register", {
      method: "POST",
      auth: false,
      body: payload,
    });
    setToken(data.token);
    state.user = data.user;
    await loadAppData();
    render();
  } catch (err) {
    state.authError = err.message;
    render();
  }
}

function logout() {
  setToken(null);
  state.user = null;
  state.plans = [];
  state.transactions = [];
  render();
}

// ---------- App actions ----------
async function buyPlan(planId) {
  const plan = state.plans.find((p) => p.id === planId);
  const phone = state.purchasePhone.trim() || state.user.phone;
  if (!phone) {
    showToast("Enter a phone number to receive the data", "fail");
    return;
  }
  try {
    const data = await api("/transactions/purchase", { method: "POST", body: { planId, phone } });
    state.user.wallet_balance = data.balance;
    await refreshTransactions();
    const net = netOf(plan.network);
    if (data.transaction.status === "Successful") {
      showToast(`${net.name} ${plan.label} delivered to ${phone}`, "ok");
    } else {
      showToast(`Delivery failed for ${net.name} ${plan.label} — refunded`, "fail");
    }
  } catch (err) {
    if (err.status === 402) {
      showToast("Insufficient wallet balance", "fail");
      await refreshTransactions();
    } else {
      showToast(err.message, "fail");
    }
  }
  render();
}

async function refreshTransactions() {
  const txRes = await api("/transactions");
  state.transactions = txRes.transactions;
}

async function topUp(amount) {
  try {
    const data = await api("/wallet/topup", { method: "POST", body: { amount } });
    state.user.wallet_balance = data.balance;
    showToast(`Wallet funded with ${naira(amount)}`, "ok");
  } catch (err) {
    showToast(err.message, "fail");
  }
  render();
}

function startEdit(id) {
  const p = state.plans.find((p) => p.id === id);
  state.editingId = id;
  state.editDraft = { cost: p.cost, price: p.price };
  render();
}

function cancelEdit() {
  state.editingId = null;
  render();
}

async function saveEdit(id) {
  try {
    const data = await api(`/plans/${id}`, {
      method: "PUT",
      body: { cost: Number(state.editDraft.cost), price: Number(state.editDraft.price) },
    });
    state.plans = state.plans.map((p) => (p.id === id ? data.plan : p));
    state.editingId = null;
    showToast("Plan updated", "ok");
  } catch (err) {
    showToast(err.message, "fail");
  }
  render();
}

async function deletePlan(id) {
  try {
    await api(`/plans/${id}`, { method: "DELETE" });
    state.plans = state.plans.filter((p) => p.id !== id);
    showToast("Plan removed", "ok");
  } catch (err) {
    showToast(err.message, "fail");
  }
  render();
}

async function addPlan() {
  const np = state.newPlan;
  if (!np.label || !np.cost || !np.price) {
    showToast("Fill in plan size, cost and selling price", "fail");
    return;
  }
  try {
    const data = await api("/plans", {
      method: "POST",
      body: { network: np.network, label: np.label, validity: np.validity, cost: Number(np.cost), price: Number(np.price) },
    });
    state.plans.push(data.plan);
    state.newPlan = { network: np.network, label: "", validity: "30 days", cost: "", price: "" };
    showToast("Plan added", "ok");
  } catch (err) {
    showToast(err.message, "fail");
  }
  render();
}

// ---------- Render ----------
function render() {
  const root = document.getElementById("app");

  if (state.booting) {
    root.innerHTML = `<div class="loading-note">Loading QUANCY6…</div>`;
    return;
  }
  if (!state.token || !state.user) {
    root.innerHTML = renderAuthScreen();
    bindAuthEvents();
    return;
  }

  root.innerHTML = `
    <div class="shell">
      <div class="header">
        <div class="brand">${signalBars(4)} QUANCY6</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="view-toggle">
            <button data-action="set-view" data-view="user" class="${state.view === "user" ? "active" : ""}">${icon("user", 13)} You</button>
            ${state.user.role === "admin" ? `<button data-action="set-view" data-view="admin" class="${state.view === "admin" ? "active" : ""}">${icon("shield", 13)} Admin</button>` : ""}
          </div>
          <button class="logout-btn" data-action="logout">${icon("logout", 12)}</button>
        </div>
      </div>

      ${state.toast ? `<div class="toast ${state.toast.tone}">${esc(state.toast.msg)}</div>` : ""}

      ${state.view === "admin" && state.user.role === "admin" ? renderAdminView() : renderUserView()}
    </div>
  `;
  bindEvents();
}

function renderAuthScreen() {
  const mode = state.authMode;
  return `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-brand">${signalBars(4)} QUANCY6</div>
        <div class="auth-title">${mode === "login" ? "Log in" : "Create your account"}</div>
        <div class="auth-sub">${mode === "login" ? "Welcome back — check your wallet and grab a plan." : "Set up a wallet to start buying data."}</div>
        ${state.authError ? `<div class="auth-error">${esc(state.authError)}</div>` : ""}
        <form id="auth-form">
          ${mode === "register" ? `
            <div class="auth-field"><label>Full name</label><input type="text" name="name" required /></div>
            <div class="auth-field"><label>Phone number</label><input type="text" name="phone" placeholder="080..." /></div>
          ` : ""}
          <div class="auth-field"><label>Email</label><input type="email" name="email" required /></div>
          <div class="auth-field"><label>Password</label><input type="password" name="password" required minlength="6" /></div>
          <button type="submit" class="auth-submit">${mode === "login" ? "Log in" : "Create account"}</button>
        </form>
        <div class="auth-switch">
          ${mode === "login" ? `New here? <button data-action="switch-auth" data-mode="register">Create an account</button>` : `Already have an account? <button data-action="switch-auth" data-mode="login">Log in</button>`}
        </div>
      </div>
    </div>
  `;
}

function renderUserView() {
  const balance = state.user.wallet_balance;
  const activeNet = netOf(state.activeNetwork);
  const level = balance > 5000 ? 4 : balance > 1500 ? 3 : balance > 300 ? 2 : 1;
  const visiblePlans = state.plans.filter((p) => p.network === state.activeNetwork);

  return `
    <div class="wallet-card">
      <div class="wifi-bg">${icon("wifi", 140)}</div>
      <div class="wallet-label">${icon("wallet", 14)} WALLET BALANCE</div>
      <div class="wallet-amount">${naira(balance)} ${signalBars(level)}</div>
      <div class="topup-row">
        ${[500, 1000, 2000, 5000].map((amt) => `
          <button class="topup-chip" data-action="topup" data-amount="${amt}">${icon("plus", 11)} ${naira(amt)}</button>
        `).join("")}
      </div>
    </div>

    <div class="auth-field" style="margin-bottom:16px">
      <label>Phone to receive data</label>
      <input type="text" id="purchase-phone" placeholder="${esc(state.user.phone || "080...")}" value="${esc(state.purchasePhone)}" />
    </div>

    <div class="network-tabs">
      ${NETWORKS.map((n) => `
        <button class="network-tab" data-action="set-network" data-network="${n.id}"
          style="${n.id === state.activeNetwork ? `border-color:${n.color};background:${n.color}1A;color:${n.color};` : ""}">
          <span class="dot" style="background:${n.color}"></span>${n.name}
        </button>
      `).join("")}
    </div>

    <div class="plan-grid">
      ${visiblePlans.length === 0 ? `<div class="empty-note">No plans on this network yet.</div>` : visiblePlans.map((p) => `
        <div class="plan-card">
          <div>
            <div class="plan-size">${esc(p.label)}</div>
            <div class="plan-validity">${esc(p.validity)}</div>
          </div>
          <div class="plan-price" style="color:${activeNet.color}">${naira(p.price)}</div>
          <button class="buy-btn" data-action="buy" data-id="${p.id}"
            style="background:${activeNet.color};color:${activeNet.dark ? "#0F1B2B" : "#fff"}">
            Buy ${icon("arrow", 13)}
          </button>
        </div>
      `).join("")}
    </div>

    <div class="section-label">${icon("history", 14)} RECENT TRANSACTIONS</div>
    <div class="tx-list">
      ${state.transactions.slice(0, 8).map((tx) => {
        const net = netOf(tx.network);
        return `
          <div class="tx-row">
            <div class="tx-left">
              <span class="dot" style="width:8px;height:8px;border-radius:50%;background:${net.color};flex-shrink:0"></span>
              <div style="min-width:0">
                <div class="tx-title">${net.name} · ${esc(tx.label)}</div>
                <div class="tx-meta">${tx.id} · ${new Date(tx.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div class="tx-right">
              <div class="tx-amount">${naira(tx.amount)}</div>
              ${statusPill(tx.status)}
            </div>
          </div>
        `;
      }).join("")}
      ${state.transactions.length === 0 ? `<div class="empty-note">No transactions yet.</div>` : ""}
    </div>
  `;
}

function renderAdminView() {
  return `
    <div>
      <div class="admin-title">Manage plans</div>
      <div class="admin-sub">Adjust cost and selling price per network.</div>
      ${state.plans.map((p) => {
        const net = netOf(p.network);
        const editing = state.editingId === p.id;
        const margin = p.price - p.cost;
        return `
          <div class="plan-admin-row">
            <div class="plan-admin-top">
              <div class="plan-admin-info">
                <span class="dot" style="width:8px;height:8px;border-radius:50%;background:${net.color}"></span>
                <div>
                  <div class="plan-admin-name">${net.name} · ${esc(p.label)}</div>
                  <div class="plan-admin-validity">${esc(p.validity)}</div>
                </div>
              </div>
              <div class="plan-admin-actions">
                ${editing ? `
                  <button class="icon-btn" data-action="save-edit" data-id="${p.id}" style="border-color:#3DDC9755;background:#3DDC9715;color:#3DDC97">${icon("check", 14)}</button>
                  <button class="icon-btn" data-action="cancel-edit" style="border-color:#8792A355;background:#8792A315;color:#8792A3">${icon("x", 14)}</button>
                ` : `
                  <button class="icon-btn" data-action="start-edit" data-id="${p.id}" style="border-color:#FFB02055;background:#FFB02015;color:#FFB020">${icon("pencil", 13)}</button>
                  <button class="icon-btn" data-action="delete-plan" data-id="${p.id}" style="border-color:#FF547055;background:#FF547015;color:#FF5470">${icon("trash", 13)}</button>
                `}
              </div>
            </div>
            ${editing ? `
              <div class="plan-edit-row">
                <label class="field-wrap">
                  <span class="field-label">Cost</span>
                  <input type="number" data-field="cost" value="${p.cost}" />
                </label>
                <label class="field-wrap">
                  <span class="field-label">Sell</span>
                  <input type="number" data-field="price" value="${p.price}" />
                </label>
              </div>
            ` : `
              <div class="plan-admin-stats">
                <span style="color:#8792A3">Cost ${naira(p.cost)}</span>
                <span style="color:#8792A3">Sell ${naira(p.price)}</span>
                <span style="color:${margin >= 0 ? "#3DDC97" : "#FF5470"}">Margin ${naira(margin)}</span>
              </div>
            `}
          </div>
        `;
      }).join("")}
    </div>

    <div class="add-plan-box">
      <div class="add-plan-title">Add a plan</div>
      <div class="add-plan-row">
        <select id="np-network">
          ${NETWORKS.map((n) => `<option value="${n.id}" ${n.id === state.newPlan.network ? "selected" : ""}>${n.name}</option>`).join("")}
        </select>
        <input type="text" id="np-label" placeholder="Size e.g. 3GB" value="${esc(state.newPlan.label)}" />
        <input type="text" id="np-validity" placeholder="Validity" value="${esc(state.newPlan.validity)}" />
      </div>
      <div class="add-plan-row">
        <input type="number" id="np-cost" placeholder="Cost price" value="${esc(state.newPlan.cost)}" />
        <input type="number" id="np-price" placeholder="Selling price" value="${esc(state.newPlan.price)}" />
        <button class="add-btn" data-action="add-plan">Add</button>
      </div>
    </div>

    <div class="section-label">${icon("history", 14)} ALL TRANSACTIONS</div>
    <div class="tx-list" id="admin-tx-list">
      <div class="empty-note">Loading…</div>
    </div>
  `;
}

async function loadAdminTransactions() {
  try {
    const data = await api("/transactions/all");
    const list = document.getElementById("admin-tx-list");
    if (!list) return;
    list.innerHTML = data.transactions.map((tx) => {
      const net = netOf(tx.network);
      return `
        <div class="tx-row">
          <div>
            <div class="tx-title">${net.name} · ${esc(tx.label)}</div>
            <div class="tx-meta">${tx.id} · ${esc(tx.user_email)} · ${new Date(tx.created_at).toLocaleString()}</div>
          </div>
          <div class="tx-right">
            <div class="tx-amount">${naira(tx.amount)}</div>
            ${statusPill(tx.status)}
          </div>
        </div>
      `;
    }).join("") || `<div class="empty-note">No transactions yet.</div>`;
  } catch (err) {
    showToast(err.message, "fail");
  }
}

// ---------- Event binding ----------
function bindAuthEvents() {
  const root = document.getElementById("app");
  root.querySelectorAll("[data-action='switch-auth']").forEach((el) => {
    el.addEventListener("click", () => {
      state.authMode = el.getAttribute("data-mode");
      state.authError = null;
      render();
    });
  });
  const form = document.getElementById("auth-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      handleAuthSubmit(state.authMode, {
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        password: fd.get("password"),
      });
    });
  }
}

function bindEvents() {
  const root = document.getElementById("app");

  root.querySelectorAll("[data-action]").forEach((el) => {
    const action = el.getAttribute("data-action");
    el.addEventListener("click", () => {
      switch (action) {
        case "set-view":
          state.view = el.getAttribute("data-view");
          render();
          if (state.view === "admin") loadAdminTransactions();
          break;
        case "set-network":
          state.activeNetwork = el.getAttribute("data-network");
          render();
          break;
        case "topup":
          topUp(Number(el.getAttribute("data-amount")));
          break;
        case "buy":
          buyPlan(el.getAttribute("data-id"));
          break;
        case "start-edit":
          startEdit(el.getAttribute("data-id"));
          break;
        case "save-edit":
          syncEditDraft();
          saveEdit(el.getAttribute("data-id"));
          break;
        case "cancel-edit":
          cancelEdit();
          break;
        case "delete-plan":
          deletePlan(el.getAttribute("data-id"));
          break;
        case "add-plan":
          syncNewPlanFields();
          addPlan();
          break;
        case "logout":
          logout();
          break;
      }
    });
  });

  const phoneInput = document.getElementById("purchase-phone");
  if (phoneInput) phoneInput.addEventListener("input", () => { state.purchasePhone = phoneInput.value; });

  root.querySelectorAll('[data-field]').forEach((inp) => {
    inp.addEventListener("input", () => {
      state.editDraft[inp.getAttribute("data-field")] = inp.value;
    });
  });

  const map = { "np-network": "network", "np-label": "label", "np-validity": "validity", "np-cost": "cost", "np-price": "price" };
  Object.keys(map).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => { state.newPlan[map[id]] = el.value; });
  });

  if (state.view === "admin" && state.user.role === "admin") loadAdminTransactions();
}

function syncEditDraft() {
  document.querySelectorAll('[data-field]').forEach((inp) => {
    state.editDraft[inp.getAttribute("data-field")] = inp.value;
  });
}

function syncNewPlanFields() {
  const map = { "np-network": "network", "np-label": "label", "np-validity": "validity", "np-cost": "cost", "np-price": "price" };
  Object.keys(map).forEach((id) => {
    const el = document.getElementById(id);
    if (el) state.newPlan[map[id]] = el.value;
  });
}

// ---------- Init ----------
boot();
