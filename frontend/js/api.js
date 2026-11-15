/* =====================================================================
   api.js — Backend (Flask) နှင့် ဆက်သွယ်ခြင်း + Offline queue
   ===================================================================== */

// Flask server ၏ လိပ်စာ — local XAMPP/Flask
const API_BASE = "http://localhost:5000/api";

const Store = {
  // offline mode အခြေအနေ
  isOffline: () => localStorage.getItem("offline") === "1",
  setOffline: (v) => localStorage.setItem("offline", v ? "1" : "0"),

  // login user
  getUser: () => JSON.parse(localStorage.getItem("user") || "null"),
  setUser: (u) => localStorage.setItem("user", JSON.stringify(u)),
  clearUser: () => localStorage.removeItem("user"),

  // offline price queue
  getQueue: () => JSON.parse(localStorage.getItem("queue") || "[]"),
  pushQueue: (rec) => {
    const q = Store.getQueue();
    q.push(rec);
    localStorage.setItem("queue", JSON.stringify(q));
  },
  clearQueue: () => localStorage.removeItem("queue"),

  // dashboard data cache (offline ဖတ်ရန်)
  cache: (key, val) => localStorage.setItem("cache_" + key, JSON.stringify(val)),
  getCache: (key) => JSON.parse(localStorage.getItem("cache_" + key) || "null"),
};

async function apiGet(path) {
  // offline ဖြစ်နေပါက cache ကို သုံးမည်
  if (Store.isOffline()) {
    const cached = Store.getCache(path);
    if (cached) return cached;
    throw new Error("offline-no-cache");
  }
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  Store.cache(path, data); // အောင်မြင်ပါက cache ထဲ သိမ်း
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error("HTTP " + res.status), { data });
  return data;
}

// offline queue ကို server သို့ sync
async function syncQueue() {
  const q = Store.getQueue();
  if (!q.length) return { inserted: 0 };
  const result = await apiPost("/sync", { records: q });
  Store.clearQueue();
  return result;
}
