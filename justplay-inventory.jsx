import { useState, useEffect, useCallback, useRef } from "react";

// ── Storage helpers ──
const KEYS = {
  products: "jp-products",
  sales: "jp-sales",
  b2b: "jp-b2b-ledger",
  consignment: "jp-consignment",
  purepadel: "jp-purepadel-card",
  expenses: "jp-expenses",
};

async function load(key) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}
async function save(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch (e) { console.error(e); }
}

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n) => `Rs.${Number(n || 0).toLocaleString("en-PK")}`;
const today = () => new Date().toISOString().slice(0, 10);
const monthLabel = (d) => new Date(d + "T00:00:00").toLocaleString("en", { month: "short", year: "numeric" });

const BRANDS = ["Adidas", "Babolat", "Bullpadel", "Head", "Nox", "Siux", "Wilson", "4ON", "Other"];
const CATEGORIES = ["Rackets", "Padel Balls", "Shoes", "Accessories", "Bags", "Grips", "Other"];
const PAY_METHODS = ["Cash", "Card (Pure Padel)", "Bank Transfer", "Online", "Credit"];

// ── Seed demo data ──
function seedProducts() {
  return [
    { id: uid(), name: "Adidas Metalbone 3.5 2026", brand: "Adidas", category: "Rackets", sku: "ADI-MB35-26", costPrice: 72000, salePrice: 98000, shopQty: 1, warehouseQty: 2, consignment: false, supplier: "", minStock: 1 },
    { id: uid(), name: "Adidas Metalbone HRD+ 2026", brand: "Adidas", category: "Rackets", sku: "ADI-MBHRD-26", costPrice: 73000, salePrice: 98000, shopQty: 1, warehouseQty: 1, consignment: false, supplier: "", minStock: 1 },
    { id: uid(), name: "Head Speed PRO 2025", brand: "Head", category: "Rackets", sku: "HEAD-SP25", costPrice: 58000, salePrice: 80000, shopQty: 1, warehouseQty: 3, consignment: false, supplier: "", minStock: 1 },
    { id: uid(), name: "Wilson Bela Pro V3", brand: "Wilson", category: "Rackets", sku: "WIL-BELA3", costPrice: 50000, salePrice: 70000, shopQty: 0, warehouseQty: 2, consignment: true, supplier: "Ali Sports", minStock: 1 },
    { id: uid(), name: "Head Pro S+ Balls (can)", brand: "Head", category: "Padel Balls", sku: "HEAD-PS-CAN", costPrice: 1600, salePrice: 2300, shopQty: 12, warehouseQty: 48, consignment: false, supplier: "", minStock: 10 },
    { id: uid(), name: "Wilson Premier Gold Balls (can)", brand: "Wilson", category: "Padel Balls", sku: "WIL-PG-CAN", costPrice: 1500, salePrice: 2400, shopQty: 6, warehouseQty: 96, consignment: false, supplier: "", minStock: 20 },
    { id: uid(), name: "Babolat Frame Protector", brand: "Babolat", category: "Accessories", sku: "BAB-FP", costPrice: 2000, salePrice: 3000, shopQty: 3, warehouseQty: 10, consignment: false, supplier: "", minStock: 2 },
    { id: uid(), name: "Nox ML10 Pro Cup", brand: "Nox", category: "Rackets", sku: "NOX-ML10", costPrice: 42000, salePrice: 60000, shopQty: 1, warehouseQty: 1, consignment: false, supplier: "", minStock: 1 },
    { id: uid(), name: "Babolat Overgrips 3-pack", brand: "Babolat", category: "Grips", sku: "BAB-OG3", costPrice: 2000, salePrice: 3000, shopQty: 5, warehouseQty: 15, consignment: false, supplier: "", minStock: 3 },
  ];
}

// ── Tabs ──
const TABS = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "inventory", label: "Inventory", icon: "📦" },
  { key: "sale", label: "New Sale", icon: "🛒" },
  { key: "sales", label: "Sales Log", icon: "📋" },
  { key: "b2b", label: "B2B Courts", icon: "🏟️" },
  { key: "consignment", label: "Consignment", icon: "🤝" },
  { key: "cardpay", label: "Card Payments", icon: "💳" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

// ── Color palette ──
const C = {
  bg: "#0a0a0f",
  surface: "#12121a",
  card: "#1a1a26",
  border: "#2a2a3a",
  accent: "#22c55e",
  accentDim: "#166534",
  accentGlow: "rgba(34,197,94,0.12)",
  danger: "#ef4444",
  dangerDim: "#7f1d1d",
  warn: "#f59e0b",
  warnDim: "#78350f",
  blue: "#3b82f6",
  text: "#e4e4e7",
  textDim: "#71717a",
  textMuted: "#52525b",
  white: "#fafafa",
};

// ── Styles ──
const S = {
  app: { background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", fontSize: 14 },
  header: { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 },
  logo: { fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: C.white },
  logoDot: { color: C.accent },
  tabBar: { display: "flex", gap: 2, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 12px", overflowX: "auto", WebkitOverflowScrolling: "touch" },
  tab: (active) => ({ padding: "12px 14px", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.accent : C.textDim, borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap", background: "none", border: "none", transition: "all 0.15s" }),
  page: { padding: "20px", maxWidth: 1200, margin: "0 auto" },
  h2: { fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 16 },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 },
  cardSm: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 },
  stat: (color = C.accent) => ({ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", borderLeft: `3px solid ${color}` }),
  statLabel: { fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: 800, color: C.white },
  statSub: { fontSize: 12, color: C.textDim, marginTop: 2 },
  input: { width: "100%", padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" },
  select: { width: "100%", padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" },
  btn: (color = C.accent) => ({ padding: "10px 20px", background: color, color: color === C.warn ? "#000" : "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "opacity 0.15s" }),
  btnOutline: { padding: "10px 20px", background: "transparent", color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnSm: (color = C.accent) => ({ padding: "6px 14px", background: color, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }),
  btnDanger: { padding: "6px 14px", background: C.dangerDim, color: C.danger, border: `1px solid ${C.danger}33`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 12px", borderBottom: `1px solid ${C.border}`, color: C.textDim, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" },
  td: { padding: "10px 12px", borderBottom: `1px solid ${C.border}22` },
  badge: (color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${color}22`, color }),
  tag: { display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: C.accentGlow, color: C.accent },
  pill: (active) => ({ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: active ? `1px solid ${C.accent}` : `1px solid ${C.border}`, background: active ? C.accentGlow : "transparent", color: active ? C.accent : C.textDim, cursor: "pointer" }),
  search: { padding: "10px 14px 10px 36px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box" },
  row: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  col: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 140 },
  divider: { height: 1, background: C.border, margin: "16px 0" },
  empty: { textAlign: "center", padding: 40, color: C.textMuted },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modalBox: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto" },
};

// ── Field component ──
function Field({ label, children }) {
  return <div style={S.col}><label style={S.label}>{label}</label>{children}</div>;
}

// ── Modal ──
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.white, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Toast ──
function Toast({ msg, type }) {
  if (!msg) return null;
  const bg = type === "error" ? C.dangerDim : type === "warn" ? C.warnDim : C.accentDim;
  const c = type === "error" ? C.danger : type === "warn" ? C.warn : C.accent;
  return <div style={{ position: "fixed", bottom: 20, right: 20, background: bg, color: c, border: `1px solid ${c}44`, padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 13, zIndex: 200, boxShadow: `0 4px 20px ${c}22` }}>{msg}</div>;
}


// ══════════════════════════════════════════════
// ██ MAIN APP
// ══════════════════════════════════════════════
export default function JustPlayApp() {
  const [tab, setTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [b2b, setB2b] = useState([]);
  const [consignment, setConsignment] = useState([]);
  const [cardPay, setCardPay] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [role, setRole] = useState("owner"); // owner | staff

  const flash = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Load
  useEffect(() => {
    (async () => {
      const p = await load(KEYS.products);
      const s = await load(KEYS.sales);
      const b = await load(KEYS.b2b);
      const cn = await load(KEYS.consignment);
      const cp = await load(KEYS.purepadel);
      const ex = await load(KEYS.expenses);
      setProducts(p && p.length ? p : seedProducts());
      setSales(s || []);
      setB2b(b || []);
      setConsignment(cn || []);
      setCardPay(cp || []);
      setExpenses(ex || []);
      setLoading(false);
    })();
  }, []);

  // Auto-save
  useEffect(() => { if (!loading) save(KEYS.products, products); }, [products, loading]);
  useEffect(() => { if (!loading) save(KEYS.sales, sales); }, [sales, loading]);
  useEffect(() => { if (!loading) save(KEYS.b2b, b2b); }, [b2b, loading]);
  useEffect(() => { if (!loading) save(KEYS.consignment, consignment); }, [consignment, loading]);
  useEffect(() => { if (!loading) save(KEYS.purepadel, cardPay); }, [cardPay, loading]);
  useEffect(() => { if (!loading) save(KEYS.expenses, expenses); }, [expenses, loading]);

  const updateProduct = (id, patch) => setProducts(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));

  if (loading) return <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 12 }}>🏸</div><div style={{ color: C.textDim, fontWeight: 600 }}>Loading JustPlay...</div></div></div>;

  const ctx = { products, setProducts, updateProduct, sales, setSales, b2b, setB2b, consignment, setConsignment, cardPay, setCardPay, expenses, setExpenses, flash, role };

  return (
    <div style={S.app}>
      {/* HEADER */}
      <div style={S.header}>
        <div>
          <span style={S.logo}>JustPlay<span style={S.logoDot}>.pk</span></span>
          <span style={{ fontSize: 11, color: C.textDim, marginLeft: 10 }}>Inventory Manager</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ ...S.select, width: "auto", padding: "6px 10px", fontSize: 12 }}>
            <option value="owner">👑 Owner (Anas)</option>
            <option value="staff">🧑‍💼 Staff</option>
          </select>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={S.tabBar}>
        {TABS.filter(t => role === "owner" || ["sale", "sales", "inventory"].includes(t.key)).map(t => (
          <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* PAGE */}
      <div style={S.page}>
        {tab === "dashboard" && <Dashboard {...ctx} />}
        {tab === "inventory" && <Inventory {...ctx} />}
        {tab === "sale" && <NewSale {...ctx} />}
        {tab === "sales" && <SalesLog {...ctx} />}
        {tab === "b2b" && <B2BLedger {...ctx} />}
        {tab === "consignment" && <ConsignmentTracker {...ctx} />}
        {tab === "cardpay" && <CardPayments {...ctx} />}
        {tab === "settings" && <Settings {...ctx} />}
      </div>

      <Toast msg={toast?.msg} type={toast?.type} />
    </div>
  );
}


// ══════════════════════════════════════════════
// ██ DASHBOARD
// ══════════════════════════════════════════════
function Dashboard({ products, sales, b2b, cardPay, expenses }) {
  const [period, setPeriod] = useState("month");
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const thisWeek = new Date(now - 7 * 86400000).toISOString().slice(0, 10);

  const filtered = sales.filter(s => {
    if (period === "today") return s.date === today();
    if (period === "week") return s.date >= thisWeek;
    if (period === "month") return s.date?.startsWith(thisMonth);
    return true;
  });

  const totalRevenue = filtered.reduce((a, s) => a + (s.total || 0), 0);
  const totalCost = filtered.reduce((a, s) => a + (s.costTotal || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const shopSales = filtered.filter(s => s.location === "shop");
  const whSales = filtered.filter(s => s.location === "warehouse");
  const cashSales = filtered.filter(s => s.payMethod === "Cash").reduce((a, s) => a + s.total, 0);
  const cardSalesTotal = filtered.filter(s => s.payMethod === "Card (Pure Padel)").reduce((a, s) => a + s.total, 0);

  const totalStock = products.reduce((a, p) => a + p.shopQty + p.warehouseQty, 0);
  const shopStock = products.reduce((a, p) => a + p.shopQty, 0);
  const whStock = products.reduce((a, p) => a + p.warehouseQty, 0);
  const lowStock = products.filter(p => (p.shopQty + p.warehouseQty) <= (p.minStock || 1));
  const stockValue = products.reduce((a, p) => a + (p.costPrice * (p.shopQty + p.warehouseQty)), 0);

  const b2bOutstanding = b2b.filter(e => e.type === "sale").reduce((a, e) => a + e.amount, 0) - b2b.filter(e => e.type === "payment").reduce((a, e) => a + e.amount, 0);
  const cardOutstanding = cardPay.filter(e => !e.settled).reduce((a, e) => a + e.amount, 0);

  const periodExpenses = expenses.filter(e => {
    if (period === "today") return e.date === today();
    if (period === "week") return e.date >= thisWeek;
    if (period === "month") return e.date?.startsWith(thisMonth);
    return true;
  }).reduce((a, e) => a + e.amount, 0);

  const netProfit = totalProfit - periodExpenses;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ ...S.h2, marginBottom: 0 }}>Dashboard</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {["today", "week", "month", "all"].map(p => (
            <button key={p} style={S.pill(period === p)} onClick={() => setPeriod(p)}>{p === "all" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Revenue */}
      <div style={S.grid4}>
        <div style={S.stat(C.accent)}>
          <div style={S.statLabel}>Revenue</div>
          <div style={S.statVal}>{fmt(totalRevenue)}</div>
          <div style={S.statSub}>{filtered.length} sales</div>
        </div>
        <div style={S.stat(C.blue)}>
          <div style={S.statLabel}>Cost of Goods</div>
          <div style={S.statVal}>{fmt(totalCost)}</div>
        </div>
        <div style={S.stat(totalProfit >= 0 ? C.accent : C.danger)}>
          <div style={S.statLabel}>Gross Profit</div>
          <div style={S.statVal}>{fmt(totalProfit)}</div>
          <div style={S.statSub}>{totalRevenue ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% margin</div>
        </div>
        <div style={S.stat(netProfit >= 0 ? C.accent : C.danger)}>
          <div style={S.statLabel}>Net Profit</div>
          <div style={{ ...S.statVal, color: netProfit >= 0 ? C.accent : C.danger }}>{fmt(netProfit)}</div>
          <div style={S.statSub}>After {fmt(periodExpenses)} expenses</div>
        </div>
      </div>

      {/* Shop vs Warehouse */}
      <div style={{ ...S.grid2, marginTop: 14 }}>
        <div style={S.stat("#8b5cf6")}>
          <div style={S.statLabel}>Shop Sales (Pure Padel)</div>
          <div style={S.statVal}>{fmt(shopSales.reduce((a, s) => a + s.total, 0))}</div>
          <div style={S.statSub}>{shopSales.length} transactions</div>
        </div>
        <div style={S.stat(C.blue)}>
          <div style={S.statLabel}>Warehouse / Delivery Sales</div>
          <div style={S.statVal}>{fmt(whSales.reduce((a, s) => a + s.total, 0))}</div>
          <div style={S.statSub}>{whSales.length} transactions</div>
        </div>
      </div>

      {/* Payment Split */}
      <div style={{ ...S.grid3, marginTop: 14 }}>
        <div style={S.stat(C.accent)}>
          <div style={S.statLabel}>Cash Collected</div>
          <div style={S.statVal}>{fmt(cashSales)}</div>
        </div>
        <div style={S.stat(C.warn)}>
          <div style={S.statLabel}>Card (via Pure Padel)</div>
          <div style={S.statVal}>{fmt(cardSalesTotal)}</div>
          <div style={S.statSub}>{fmt(cardOutstanding)} pending release</div>
        </div>
        <div style={S.stat(C.danger)}>
          <div style={S.statLabel}>B2B Outstanding</div>
          <div style={S.statVal}>{fmt(b2bOutstanding)}</div>
        </div>
      </div>

      {/* Inventory snapshot */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.white, marginTop: 24, marginBottom: 12 }}>📦 Inventory Snapshot</h3>
      <div style={S.grid4}>
        <div style={S.stat(C.blue)}>
          <div style={S.statLabel}>Total Units</div>
          <div style={S.statVal}>{totalStock}</div>
        </div>
        <div style={S.stat("#8b5cf6")}>
          <div style={S.statLabel}>In Shop</div>
          <div style={S.statVal}>{shopStock}</div>
        </div>
        <div style={S.stat(C.accent)}>
          <div style={S.statLabel}>In Warehouse</div>
          <div style={S.statVal}>{whStock}</div>
        </div>
        <div style={S.stat(C.warn)}>
          <div style={S.statLabel}>Stock Value (Cost)</div>
          <div style={S.statVal}>{fmt(stockValue)}</div>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div style={{ ...S.card, marginTop: 14, borderColor: `${C.warn}44` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.warn, marginBottom: 10 }}>⚠️ Low Stock Alerts ({lowStock.length})</h3>
          {lowStock.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 600, color: C.white }}>{p.name}</span>
                <span style={{ color: C.textDim, marginLeft: 8, fontSize: 12 }}>{p.brand}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={S.badge(C.warn)}>Shop: {p.shopQty}</span>
                <span style={S.badge(C.blue)}>WH: {p.warehouseQty}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════
// ██ INVENTORY
// ══════════════════════════════════════════════
function Inventory({ products, setProducts, updateProduct, flash }) {
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [moveId, setMoveId] = useState(null);
  const [moveQty, setMoveQty] = useState(1);
  const [moveDir, setMoveDir] = useState("to-shop"); // to-shop | to-wh

  const filtered = products.filter(p => {
    if (filterBrand !== "All" && p.brand !== filterBrand) return false;
    if (filterCat !== "All" && p.category !== filterCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleMove = () => {
    const p = products.find(x => x.id === moveId);
    if (!p) return;
    const qty = Math.max(1, parseInt(moveQty) || 1);
    if (moveDir === "to-shop") {
      if (qty > p.warehouseQty) { flash("Not enough in warehouse", "error"); return; }
      updateProduct(moveId, { shopQty: p.shopQty + qty, warehouseQty: p.warehouseQty - qty });
    } else {
      if (qty > p.shopQty) { flash("Not enough in shop", "error"); return; }
      updateProduct(moveId, { shopQty: p.shopQty - qty, warehouseQty: p.warehouseQty + qty });
    }
    flash(`Moved ${qty}x ${p.name} ${moveDir === "to-shop" ? "→ Shop" : "→ Warehouse"}`);
    setMoveId(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ ...S.h2, marginBottom: 0 }}>Inventory ({filtered.length})</h2>
        <button style={S.btn()} onClick={() => setShowAdd(true)}>+ Add Product</button>
      </div>

      {/* Filters */}
      <div style={{ ...S.row, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 2, minWidth: 200 }}>
          <span style={{ position: "absolute", left: 12, top: 10, color: C.textDim }}>🔍</span>
          <input style={S.search} placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ ...S.select, flex: 1, minWidth: 100 }} value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
          <option value="All">All Brands</option>
          {BRANDS.map(b => <option key={b}>{b}</option>)}
        </select>
        <select style={{ ...S.select, flex: 1, minWidth: 100 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Product</th>
              <th style={S.th}>Brand</th>
              <th style={S.th}>SKU</th>
              <th style={S.th}>Cost</th>
              <th style={S.th}>Price</th>
              <th style={{ ...S.th, textAlign: "center" }}>Shop</th>
              <th style={{ ...S.th, textAlign: "center" }}>Warehouse</th>
              <th style={{ ...S.th, textAlign: "center" }}>Total</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ background: (p.shopQty + p.warehouseQty) <= (p.minStock || 1) ? `${C.warn}08` : "transparent" }}>
                <td style={S.td}>
                  <div style={{ fontWeight: 600, color: C.white }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>{p.category} {p.consignment && <span style={S.badge(C.warn)}>Consignment</span>}</div>
                </td>
                <td style={S.td}><span style={S.badge(C.blue)}>{p.brand}</span></td>
                <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12, color: C.textDim }}>{p.sku || "-"}</td>
                <td style={S.td}>{fmt(p.costPrice)}</td>
                <td style={{ ...S.td, fontWeight: 700, color: C.accent }}>{fmt(p.salePrice)}</td>
                <td style={{ ...S.td, textAlign: "center", fontWeight: 700 }}>{p.shopQty}</td>
                <td style={{ ...S.td, textAlign: "center", fontWeight: 700 }}>{p.warehouseQty}</td>
                <td style={{ ...S.td, textAlign: "center", fontWeight: 700, color: C.white }}>{p.shopQty + p.warehouseQty}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button style={S.btnSm(C.blue)} onClick={() => setEditId(p.id)}>Edit</button>
                    <button style={S.btnSm("#8b5cf6")} onClick={() => { setMoveId(p.id); setMoveQty(1); }}>Move</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div style={S.empty}>No products found</div>}

      {/* Add Product Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Product">
        <ProductForm onSave={(p) => { setProducts(prev => [...prev, { ...p, id: uid() }]); setShowAdd(false); flash("Product added!"); }} />
      </Modal>

      {/* Edit Product Modal */}
      <Modal open={!!editId} onClose={() => setEditId(null)} title="Edit Product">
        {editId && <ProductForm
          initial={products.find(p => p.id === editId)}
          onSave={(p) => { updateProduct(editId, p); setEditId(null); flash("Product updated!"); }}
          onDelete={() => { setProducts(ps => ps.filter(p => p.id !== editId)); setEditId(null); flash("Product deleted", "warn"); }}
        />}
      </Modal>

      {/* Move Stock Modal */}
      <Modal open={!!moveId} onClose={() => setMoveId(null)} title="Move Stock">
        {moveId && (() => {
          const p = products.find(x => x.id === moveId);
          return (
            <div>
              <p style={{ color: C.textDim, marginBottom: 14 }}>{p?.name}</p>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={S.stat(C.blue)}><div style={S.statLabel}>Shop</div><div style={{ ...S.statVal, fontSize: 18 }}>{p?.shopQty}</div></div>
                <div style={S.stat(C.accent)}><div style={S.statLabel}>Warehouse</div><div style={{ ...S.statVal, fontSize: 18 }}>{p?.warehouseQty}</div></div>
              </div>
              <Field label="Direction">
                <select style={S.select} value={moveDir} onChange={e => setMoveDir(e.target.value)}>
                  <option value="to-shop">Warehouse → Shop</option>
                  <option value="to-wh">Shop → Warehouse</option>
                </select>
              </Field>
              <div style={{ height: 10 }} />
              <Field label="Quantity">
                <input type="number" min={1} style={S.input} value={moveQty} onChange={e => setMoveQty(e.target.value)} />
              </Field>
              <div style={{ height: 14 }} />
              <button style={S.btn()} onClick={handleMove}>Move Stock</button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}


// ── Product Form ──
function ProductForm({ initial, onSave, onDelete }) {
  const [f, setF] = useState(initial || { name: "", brand: "Adidas", category: "Rackets", sku: "", costPrice: "", salePrice: "", shopQty: 0, warehouseQty: 0, consignment: false, supplier: "", minStock: 1 });
  const u = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Product Name"><input style={S.input} value={f.name} onChange={e => u("name", e.target.value)} placeholder="e.g. Adidas Metalbone 3.5 2026" /></Field>
        <div style={S.row}>
          <Field label="Brand"><select style={S.select} value={f.brand} onChange={e => u("brand", e.target.value)}>{BRANDS.map(b => <option key={b}>{b}</option>)}</select></Field>
          <Field label="Category"><select style={S.select} value={f.category} onChange={e => u("category", e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <Field label="SKU Code"><input style={S.input} value={f.sku} onChange={e => u("sku", e.target.value)} placeholder="e.g. ADI-MB35-26" /></Field>
        <div style={S.row}>
          <Field label="Cost Price (Rs)"><input type="number" style={S.input} value={f.costPrice} onChange={e => u("costPrice", Number(e.target.value))} /></Field>
          <Field label="Sale Price (Rs)"><input type="number" style={S.input} value={f.salePrice} onChange={e => u("salePrice", Number(e.target.value))} /></Field>
        </div>
        <div style={S.row}>
          <Field label="Shop Qty"><input type="number" min={0} style={S.input} value={f.shopQty} onChange={e => u("shopQty", Number(e.target.value))} /></Field>
          <Field label="Warehouse Qty"><input type="number" min={0} style={S.input} value={f.warehouseQty} onChange={e => u("warehouseQty", Number(e.target.value))} /></Field>
        </div>
        <Field label="Min Stock Alert"><input type="number" min={0} style={S.input} value={f.minStock} onChange={e => u("minStock", Number(e.target.value))} /></Field>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={f.consignment} onChange={e => u("consignment", e.target.checked)} />
          <span style={{ fontSize: 13, color: C.textDim }}>Consignment item (pay supplier after sale)</span>
        </div>
        {f.consignment && <Field label="Supplier Name"><input style={S.input} value={f.supplier} onChange={e => u("supplier", e.target.value)} /></Field>}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button style={S.btn()} onClick={() => onSave(f)}>Save Product</button>
        {onDelete && <button style={S.btnDanger} onClick={onDelete}>Delete</button>}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════
// ██ NEW SALE
// ══════════════════════════════════════════════
function NewSale({ products, updateProduct, sales, setSales, flash, role }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("shop");
  const [payMethod, setPayMethod] = useState("Cash");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);

  const searchResults = search.length >= 2 ? products.filter(p => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
  }).slice(0, 8) : [];

  const addToCart = (product) => {
    const loc = location;
    const avail = loc === "shop" ? product.shopQty : product.warehouseQty;
    const existing = cart.find(c => c.productId === product.id);
    const currentQty = existing ? existing.qty : 0;
    if (currentQty >= avail) { flash(`No more stock at ${loc}`, "error"); return; }
    if (existing) {
      setCart(cart.map(c => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, brand: product.brand, price: product.salePrice, costPrice: product.costPrice, qty: 1, consignment: product.consignment, supplier: product.supplier }]);
    }
    setSearch("");
  };

  const updateCartQty = (pid, qty) => {
    if (qty <= 0) { setCart(cart.filter(c => c.productId !== pid)); return; }
    setCart(cart.map(c => c.productId === pid ? { ...c, qty } : c));
  };

  const cartTotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const costTotal = cart.reduce((a, c) => a + c.costPrice * c.qty, 0);
  const finalTotal = cartTotal - (Number(discount) || 0);

  const completeSale = () => {
    if (cart.length === 0) { flash("Cart is empty", "error"); return; }
    // Deduct stock
    cart.forEach(item => {
      const p = products.find(x => x.id === item.productId);
      if (!p) return;
      if (location === "shop") updateProduct(p.id, { shopQty: Math.max(0, p.shopQty - item.qty) });
      else updateProduct(p.id, { warehouseQty: Math.max(0, p.warehouseQty - item.qty) });
    });
    const sale = {
      id: uid(),
      date: today(),
      time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
      items: cart,
      total: finalTotal,
      costTotal,
      discount: Number(discount) || 0,
      location,
      payMethod,
      customerName,
      notes,
      recordedBy: role,
    };
    setSales(prev => [sale, ...prev]);
    flash(`Sale recorded: ${fmt(finalTotal)} ✓`);
    setCart([]);
    setDiscount(0);
    setCustomerName("");
    setNotes("");
  };

  return (
    <div>
      <h2 style={S.h2}>🛒 New Sale</h2>
      <div style={S.grid2}>
        {/* LEFT: product search + cart */}
        <div>
          <div style={S.card}>
            <div style={S.row}>
              <Field label="Selling From">
                <select style={S.select} value={location} onChange={e => setLocation(e.target.value)}>
                  <option value="shop">🏪 Shop (Pure Padel)</option>
                  <option value="warehouse">🏢 Warehouse</option>
                </select>
              </Field>
            </div>
            <div style={{ height: 10 }} />
            <Field label="Search Product">
              <div style={{ position: "relative" }}>
                <input style={S.input} placeholder="Type product name, brand or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
                {searchResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: 240, overflowY: "auto", zIndex: 20 }}>
                    {searchResults.map(p => {
                      const avail = location === "shop" ? p.shopQty : p.warehouseQty;
                      return (
                        <div key={p.id} onClick={() => avail > 0 && addToCart(p)} style={{ padding: "10px 14px", cursor: avail > 0 ? "pointer" : "not-allowed", borderBottom: `1px solid ${C.border}22`, opacity: avail > 0 ? 1 : 0.4, display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontWeight: 600, color: C.white, fontSize: 13 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: C.textDim }}>{p.brand} · {fmt(p.salePrice)}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={S.badge(avail > 0 ? C.accent : C.danger)}>{avail} in {location}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Field>
          </div>

          {/* Cart items */}
          <div style={S.card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 10 }}>Cart ({cart.length} items)</h3>
            {cart.length === 0 && <div style={{ color: C.textDim, fontSize: 13, padding: "10px 0" }}>Search and add products above</div>}
            {cart.map(item => (
              <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: C.white, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>{item.brand} · {fmt(item.price)} each {item.consignment && <span style={S.badge(C.warn)}>C</span>}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button style={{ ...S.btnSm(C.surface), border: `1px solid ${C.border}` }} onClick={() => updateCartQty(item.productId, item.qty - 1)}>−</button>
                  <span style={{ fontWeight: 700, minWidth: 24, textAlign: "center" }}>{item.qty}</span>
                  <button style={{ ...S.btnSm(C.surface), border: `1px solid ${C.border}` }} onClick={() => updateCartQty(item.productId, item.qty + 1)}>+</button>
                  <span style={{ fontWeight: 700, color: C.accent, minWidth: 80, textAlign: "right" }}>{fmt(item.price * item.qty)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: payment + summary */}
        <div>
          <div style={S.card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 10 }}>Payment Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="Payment Method">
                <select style={S.select} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Customer Name (Optional)">
                <input style={S.input} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in customer" />
              </Field>
              <Field label="Discount (Rs)">
                <input type="number" style={S.input} value={discount} onChange={e => setDiscount(e.target.value)} />
              </Field>
              <Field label="Notes">
                <input style={S.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
              </Field>
            </div>
          </div>

          <div style={{ ...S.card, background: `${C.accent}0a`, borderColor: `${C.accent}33` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: C.textDim }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>{fmt(cartTotal)}</span>
            </div>
            {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: C.danger }}>Discount</span>
              <span style={{ fontWeight: 600, color: C.danger }}>-{fmt(discount)}</span>
            </div>}
            <div style={S.divider} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.white }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{fmt(finalTotal)}</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <button style={{ ...S.btn(), width: "100%", padding: "14px 20px", fontSize: 16 }} onClick={completeSale}>
                Complete Sale ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════
// ██ SALES LOG
// ══════════════════════════════════════════════
function SalesLog({ sales, setSales, flash }) {
  const [filterDate, setFilterDate] = useState(today());
  const [filterLoc, setFilterLoc] = useState("all");

  const filtered = sales.filter(s => {
    if (filterDate && s.date !== filterDate) return false;
    if (filterLoc !== "all" && s.location !== filterLoc) return false;
    return true;
  });

  const dayTotal = filtered.reduce((a, s) => a + s.total, 0);

  return (
    <div>
      <h2 style={S.h2}>📋 Sales Log</h2>
      <div style={{ ...S.row, marginBottom: 14 }}>
        <Field label="Date"><input type="date" style={S.input} value={filterDate} onChange={e => setFilterDate(e.target.value)} /></Field>
        <Field label="Location">
          <select style={S.select} value={filterLoc} onChange={e => setFilterLoc(e.target.value)}>
            <option value="all">All</option>
            <option value="shop">Shop</option>
            <option value="warehouse">Warehouse</option>
          </select>
        </Field>
        <div style={{ ...S.stat(C.accent), minWidth: 150, marginTop: 18 }}>
          <div style={S.statLabel}>Day Total</div>
          <div style={{ ...S.statVal, fontSize: 18 }}>{fmt(dayTotal)}</div>
          <div style={S.statSub}>{filtered.length} sales</div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Time</th>
              <th style={S.th}>Items</th>
              <th style={S.th}>Location</th>
              <th style={S.th}>Payment</th>
              <th style={S.th}>Customer</th>
              <th style={S.th}>Total</th>
              <th style={S.th}>Profit</th>
              <th style={S.th}>By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={S.td}>{s.time}</td>
                <td style={S.td}>
                  {s.items.map((it, i) => <div key={i} style={{ fontSize: 12 }}>{it.qty}x {it.name}</div>)}
                </td>
                <td style={S.td}><span style={S.badge(s.location === "shop" ? "#8b5cf6" : C.blue)}>{s.location === "shop" ? "Shop" : "Warehouse"}</span></td>
                <td style={S.td}><span style={{ fontSize: 12 }}>{s.payMethod}</span></td>
                <td style={S.td}><span style={{ fontSize: 12, color: C.textDim }}>{s.customerName || "Walk-in"}</span></td>
                <td style={{ ...S.td, fontWeight: 700, color: C.accent }}>{fmt(s.total)}</td>
                <td style={{ ...S.td, fontWeight: 600, color: (s.total - s.costTotal) >= 0 ? C.accent : C.danger }}>{fmt(s.total - (s.costTotal || 0))}</td>
                <td style={S.td}><span style={{ fontSize: 11, color: C.textDim }}>{s.recordedBy === "owner" ? "Anas" : "Staff"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div style={S.empty}>No sales for this date</div>}
    </div>
  );
}


// ══════════════════════════════════════════════
// ██ B2B LEDGER (Courts Credit)
// ══════════════════════════════════════════════
function B2BLedger({ b2b, setB2b, flash }) {
  const [showAdd, setShowAdd] = useState(false);
  const [court, setCourt] = useState("");
  const [type, setType] = useState("sale");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(today());

  const courts = [...new Set(b2b.map(e => e.court))].filter(Boolean);
  const [filterCourt, setFilterCourt] = useState("all");

  const addEntry = () => {
    if (!court || !amount) { flash("Fill court name & amount", "error"); return; }
    setB2b(prev => [{ id: uid(), court, type, amount: Number(amount), desc, date }, ...prev]);
    flash(`B2B ${type} recorded: ${fmt(amount)} for ${court}`);
    setShowAdd(false);
    setAmount("");
    setDesc("");
  };

  const filteredB2b = filterCourt === "all" ? b2b : b2b.filter(e => e.court === filterCourt);

  // Balances per court
  const courtBalances = {};
  b2b.forEach(e => {
    if (!courtBalances[e.court]) courtBalances[e.court] = { sales: 0, payments: 0 };
    if (e.type === "sale") courtBalances[e.court].sales += e.amount;
    else courtBalances[e.court].payments += e.amount;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ ...S.h2, marginBottom: 0 }}>🏟️ B2B Court Ledger</h2>
        <button style={S.btn()} onClick={() => setShowAdd(true)}>+ Add Entry</button>
      </div>

      {/* Balances */}
      <div style={S.grid3}>
        {Object.entries(courtBalances).map(([name, bal]) => (
          <div key={name} style={S.stat(bal.sales - bal.payments > 0 ? C.warn : C.accent)}>
            <div style={S.statLabel}>{name}</div>
            <div style={{ ...S.statVal, fontSize: 18, color: (bal.sales - bal.payments) > 0 ? C.warn : C.accent }}>{fmt(bal.sales - bal.payments)}</div>
            <div style={S.statSub}>Outstanding</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <select style={{ ...S.select, width: "auto", marginBottom: 10 }} value={filterCourt} onChange={e => setFilterCourt(e.target.value)}>
          <option value="all">All Courts</option>
          {courts.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Date</th><th style={S.th}>Court</th><th style={S.th}>Type</th><th style={S.th}>Description</th><th style={S.th}>Amount</th></tr></thead>
          <tbody>
            {filteredB2b.map(e => (
              <tr key={e.id}>
                <td style={S.td}>{e.date}</td>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{e.court}</span></td>
                <td style={S.td}><span style={S.badge(e.type === "sale" ? C.warn : C.accent)}>{e.type === "sale" ? "Sale (Credit)" : "Payment Received"}</span></td>
                <td style={{ ...S.td, color: C.textDim }}>{e.desc}</td>
                <td style={{ ...S.td, fontWeight: 700, color: e.type === "sale" ? C.warn : C.accent }}>{e.type === "sale" ? "+" : "-"}{fmt(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add B2B Entry">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Court Name">
            <input style={S.input} value={court} onChange={e => setCourt(e.target.value)} placeholder="e.g. Pure Padel, PadelX" list="courts-list" />
            <datalist id="courts-list">{courts.map(c => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Entry Type">
            <select style={S.select} value={type} onChange={e => setType(e.target.value)}>
              <option value="sale">Sale (Credit Given)</option>
              <option value="payment">Payment Received</option>
            </select>
          </Field>
          <Field label="Amount (Rs)"><input type="number" style={S.input} value={amount} onChange={e => setAmount(e.target.value)} /></Field>
          <Field label="Description"><input style={S.input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. 20x Wilson Premier Gold cans" /></Field>
          <Field label="Date"><input type="date" style={S.input} value={date} onChange={e => setDate(e.target.value)} /></Field>
          <button style={{ ...S.btn(), marginTop: 6 }} onClick={addEntry}>Save Entry</button>
        </div>
      </Modal>
    </div>
  );
}


// ══════════════════════════════════════════════
// ██ CONSIGNMENT TRACKER
// ══════════════════════════════════════════════
function ConsignmentTracker({ products, consignment, setConsignment, flash }) {
  const consignmentProducts = products.filter(p => p.consignment);
  const [showAdd, setShowAdd] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("sold");
  const [date, setDate] = useState(today());

  const addEntry = () => {
    if (!supplier || !amount) { flash("Fill supplier & amount", "error"); return; }
    setConsignment(prev => [{ id: uid(), supplier, type, amount: Number(amount), desc, date }, ...prev]);
    flash("Consignment entry added");
    setShowAdd(false);
    setAmount("");
    setDesc("");
  };

  const supplierBalances = {};
  consignment.forEach(e => {
    if (!supplierBalances[e.supplier]) supplierBalances[e.supplier] = { owed: 0, paid: 0 };
    if (e.type === "sold") supplierBalances[e.supplier].owed += e.amount;
    else supplierBalances[e.supplier].paid += e.amount;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ ...S.h2, marginBottom: 0 }}>🤝 Consignment Tracker</h2>
        <button style={S.btn()} onClick={() => setShowAdd(true)}>+ Add Entry</button>
      </div>

      {/* Consignment products */}
      {consignmentProducts.length > 0 && (
        <div style={{ ...S.card, marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.warn, marginBottom: 10 }}>Consignment Items in Stock</h3>
          {consignmentProducts.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 600, color: C.white }}>{p.name}</span>
                <span style={{ color: C.textDim, marginLeft: 8, fontSize: 12 }}>from {p.supplier || "Unknown"}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={S.badge(C.blue)}>Shop: {p.shopQty} | WH: {p.warehouseQty}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier balances */}
      <div style={S.grid3}>
        {Object.entries(supplierBalances).map(([name, bal]) => (
          <div key={name} style={S.stat(bal.owed - bal.paid > 0 ? C.danger : C.accent)}>
            <div style={S.statLabel}>{name}</div>
            <div style={{ ...S.statVal, fontSize: 18, color: (bal.owed - bal.paid) > 0 ? C.danger : C.accent }}>{fmt(bal.owed - bal.paid)}</div>
            <div style={S.statSub}>You owe</div>
          </div>
        ))}
      </div>

      <div style={{ overflowX: "auto", marginTop: 14 }}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Date</th><th style={S.th}>Supplier</th><th style={S.th}>Type</th><th style={S.th}>Description</th><th style={S.th}>Amount</th></tr></thead>
          <tbody>
            {consignment.map(e => (
              <tr key={e.id}>
                <td style={S.td}>{e.date}</td>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{e.supplier}</span></td>
                <td style={S.td}><span style={S.badge(e.type === "sold" ? C.danger : C.accent)}>{e.type === "sold" ? "Item Sold (Owe)" : "Paid Supplier"}</span></td>
                <td style={{ ...S.td, color: C.textDim }}>{e.desc}</td>
                <td style={{ ...S.td, fontWeight: 700, color: e.type === "sold" ? C.danger : C.accent }}>{fmt(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Consignment Entry">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Supplier Name"><input style={S.input} value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. Ali Sports" /></Field>
          <Field label="Type">
            <select style={S.select} value={type} onChange={e => setType(e.target.value)}>
              <option value="sold">Item Sold (You Owe Supplier)</option>
              <option value="paid">Payment Made to Supplier</option>
            </select>
          </Field>
          <Field label="Amount (Rs)"><input type="number" style={S.input} value={amount} onChange={e => setAmount(e.target.value)} /></Field>
          <Field label="Description"><input style={S.input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Wilson Bela Pro V3 sold" /></Field>
          <Field label="Date"><input type="date" style={S.input} value={date} onChange={e => setDate(e.target.value)} /></Field>
          <button style={{ ...S.btn(), marginTop: 6 }} onClick={addEntry}>Save</button>
        </div>
      </Modal>
    </div>
  );
}


// ══════════════════════════════════════════════
// ██ CARD PAYMENTS (Pure Padel)
// ══════════════════════════════════════════════
function CardPayments({ cardPay, setCardPay, sales, flash }) {
  const [showSettle, setShowSettle] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleDate, setSettleDate] = useState(today());
  const [settleNote, setSettleNote] = useState("");

  // Auto-add card sales
  const cardSales = sales.filter(s => s.payMethod === "Card (Pure Padel)");
  const totalCardSales = cardSales.reduce((a, s) => a + s.total, 0);
  const totalSettled = cardPay.filter(e => e.type === "settlement").reduce((a, e) => a + e.amount, 0);
  const outstanding = totalCardSales - totalSettled;

  const addSettlement = () => {
    if (!settleAmount) return;
    setCardPay(prev => [...prev, { id: uid(), type: "settlement", amount: Number(settleAmount), date: settleDate, note: settleNote }]);
    flash(`Settlement recorded: ${fmt(settleAmount)}`);
    setShowSettle(false);
    setSettleAmount("");
    setSettleNote("");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ ...S.h2, marginBottom: 0 }}>💳 Card Payments (Pure Padel)</h2>
        <button style={S.btn()} onClick={() => setShowSettle(true)}>+ Record Settlement</button>
      </div>

      <div style={S.grid3}>
        <div style={S.stat(C.warn)}>
          <div style={S.statLabel}>Total Card Sales</div>
          <div style={S.statVal}>{fmt(totalCardSales)}</div>
          <div style={S.statSub}>{cardSales.length} transactions</div>
        </div>
        <div style={S.stat(C.accent)}>
          <div style={S.statLabel}>Settled by Pure Padel</div>
          <div style={S.statVal}>{fmt(totalSettled)}</div>
        </div>
        <div style={S.stat(outstanding > 0 ? C.danger : C.accent)}>
          <div style={S.statLabel}>Outstanding</div>
          <div style={{ ...S.statVal, color: outstanding > 0 ? C.danger : C.accent }}>{fmt(outstanding)}</div>
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.white, marginTop: 20, marginBottom: 10 }}>Settlement History</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Date</th><th style={S.th}>Type</th><th style={S.th}>Note</th><th style={S.th}>Amount</th></tr></thead>
          <tbody>
            {cardPay.filter(e => e.type === "settlement").map(e => (
              <tr key={e.id}>
                <td style={S.td}>{e.date}</td>
                <td style={S.td}><span style={S.badge(C.accent)}>Settlement</span></td>
                <td style={{ ...S.td, color: C.textDim }}>{e.note}</td>
                <td style={{ ...S.td, fontWeight: 700, color: C.accent }}>{fmt(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showSettle} onClose={() => setShowSettle(false)} title="Record Settlement from Pure Padel">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Amount Received (Rs)"><input type="number" style={S.input} value={settleAmount} onChange={e => setSettleAmount(e.target.value)} /></Field>
          <Field label="Date"><input type="date" style={S.input} value={settleDate} onChange={e => setSettleDate(e.target.value)} /></Field>
          <Field label="Note"><input style={S.input} value={settleNote} onChange={e => setSettleNote(e.target.value)} placeholder="e.g. May 2026 settlement" /></Field>
          <button style={{ ...S.btn(), marginTop: 6 }} onClick={addSettlement}>Record Settlement</button>
        </div>
      </Modal>
    </div>
  );
}


// ══════════════════════════════════════════════
// ██ SETTINGS (Expenses + Data)
// ══════════════════════════════════════════════
function Settings({ expenses, setExpenses, products, setProducts, sales, setSales, b2b, setB2b, consignment, setConsignment, cardPay, setCardPay, flash }) {
  const [expAmt, setExpAmt] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expDate, setExpDate] = useState(today());
  const [expCat, setExpCat] = useState("General");

  const addExpense = () => {
    if (!expAmt) return;
    setExpenses(prev => [{ id: uid(), amount: Number(expAmt), desc: expDesc, date: expDate, category: expCat }, ...prev]);
    flash("Expense recorded");
    setExpAmt("");
    setExpDesc("");
  };

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses.filter(e => e.date?.startsWith(thisMonth));
  const monthTotal = monthExpenses.reduce((a, e) => a + e.amount, 0);

  const resetAll = () => {
    if (confirm("⚠️ This will delete ALL data. Are you sure?")) {
      setProducts(seedProducts());
      setSales([]);
      setB2b([]);
      setConsignment([]);
      setCardPay([]);
      setExpenses([]);
      flash("All data reset", "warn");
    }
  };

  return (
    <div>
      <h2 style={S.h2}>⚙️ Settings & Expenses</h2>

      <div style={S.grid2}>
        {/* Add Expense */}
        <div style={S.card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 10 }}>Add Expense</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Amount (Rs)"><input type="number" style={S.input} value={expAmt} onChange={e => setExpAmt(e.target.value)} /></Field>
            <Field label="Category">
              <select style={S.select} value={expCat} onChange={e => setExpCat(e.target.value)}>
                {["General", "Rent", "Staff Salary", "Shipping", "Marketing", "Utilities", "Supplies", "Other"].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Description"><input style={S.input} value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="e.g. Staff salary May" /></Field>
            <Field label="Date"><input type="date" style={S.input} value={expDate} onChange={e => setExpDate(e.target.value)} /></Field>
            <button style={S.btn()} onClick={addExpense}>Add Expense</button>
          </div>
        </div>

        {/* Month summary */}
        <div>
          <div style={S.stat(C.danger)}>
            <div style={S.statLabel}>This Month's Expenses</div>
            <div style={S.statVal}>{fmt(monthTotal)}</div>
            <div style={S.statSub}>{monthExpenses.length} entries</div>
          </div>
          <div style={{ marginTop: 14, maxHeight: 300, overflowY: "auto" }}>
            {monthExpenses.map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
                <div>
                  <div style={{ fontWeight: 600, color: C.white, fontSize: 13 }}>{e.desc || e.category}</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>{e.date} · {e.category}</div>
                </div>
                <span style={{ fontWeight: 700, color: C.danger }}>{fmt(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data management */}
      <div style={{ ...S.card, marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 10 }}>Data Management</h3>
        <p style={{ color: C.textDim, fontSize: 13, marginBottom: 14 }}>All data is saved automatically and persists across sessions.</p>
        <button style={{ ...S.btnDanger, padding: "10px 20px" }} onClick={resetAll}>⚠️ Reset All Data</button>
      </div>
    </div>
  );
}
