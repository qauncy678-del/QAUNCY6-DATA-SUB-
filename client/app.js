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
  authMode: "login",
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

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) { }
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
