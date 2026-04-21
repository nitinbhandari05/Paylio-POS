import { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { money } from "./lib/utils";

const seedProducts = [
  { id: "seed-1", productId: "seed-1", name: "Adrak Chai", price: 20, category: "Chai", type: "veg", favorite: true },
  { id: "seed-2", productId: "seed-2", name: "Elaichi Chai", price: 25, category: "Chai", type: "veg", favorite: true },
  { id: "seed-3", productId: "seed-3", name: "Masala Fries", price: 90, category: "Food", type: "veg", favorite: false },
  { id: "seed-4", productId: "seed-4", name: "Paneer Burger Deluxe", price: 149, category: "Food", type: "veg", favorite: true },
];

function App() {
  const [tab, setTab] = useState("pos");
  const [products, setProducts] = useState(seedProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState("Connecting...");
  const [payments, setPayments] = useState({ cash: 0, card: 0, upi: 0 });

  useEffect(() => {
    fetchMenu();
  }, []);

  const categories = ["All", ...new Set(products.map((p) => p.category))];
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const gst = subtotal * 0.05;
  const discount = subtotal > 500 ? 30 : 0;
  const total = subtotal + gst - discount;
  const paid = Number(payments.cash) + Number(payments.card) + Number(payments.upi);
  const balance = total - paid;

  async function fetchMenu() {
    try {
      const response = await fetch("/api/public/menu");
      if (!response.ok) throw new Error("menu failed");
      const payload = await response.json();
      const menu = Array.isArray(payload.menu) ? payload.menu : [];
      if (!menu.length) throw new Error("empty menu");
      const mapped = menu.map((item, idx) => ({
        id: item._id || `p-${idx}`,
        productId: item._id || `p-${idx}`,
        name: item.name || "Unnamed",
        price: Number(item.price || 0),
        category: item.categoryName || "Uncategorized",
        type: "veg",
        favorite: idx < 5,
      }));
      setProducts(mapped);
      setApiStatus(`API Connected (${mapped.length} products)`);
    } catch {
      setApiStatus("API Offline (demo mode)");
    }
  }

  function addToCart(product) {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) return current.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...current, { ...product, qty: 1 }];
    });
  }

  function changeQty(id, delta) {
    setCart((current) =>
      current.map((item) => item.id === id ? { ...item, qty: item.qty + delta } : item).filter((item) => item.qty > 0)
    );
  }

  async function confirmPayment() {
    if (paid < total) {
      window.alert("Payment not complete");
      return;
    }
    try {
      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: "main",
          orderType: "pickup",
          orderSource: "counter",
          customerName: "Walk-in",
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.qty,
            unitPrice: item.price,
          })),
          payments: [
            { method: "cash", amount: Number(payments.cash || 0) },
            { method: "card", amount: Number(payments.card || 0) },
            { method: "upi", amount: Number(payments.upi || 0) },
          ].filter((p) => p.amount > 0),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Order failed");
      window.alert(`Order created: ${payload.order?.invoiceNumber || "N/A"}`);
      setCart([]);
      setModalOpen(false);
      setPayments({ cash: 0, card: 0, upi: 0 });
    } catch (error) {
      window.alert(error.message);
    }
  }

  const visibleProducts = products.filter((p) => {
    const byCategory = category === "All" || p.category === category;
    const bySearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return byCategory && bySearch;
  });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 p-4 backdrop-blur">
        <div className="grid gap-2 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-full border border-slate-200 px-4 text-sm outline-none"
            placeholder="Search products..."
          />
          <Pill text="Main Outlet" />
          <Pill text="Cashier Asha" />
          <Pill text="Shift Morning" />
          <Pill text={apiStatus} />
        </div>
      </header>

      <nav className="sticky top-[72px] z-10 flex gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <Button variant={tab === "pos" ? "primary" : "default"} className="rounded-full" onClick={() => setTab("pos")}>POS Billing</Button>
        <Button variant={tab === "admin" ? "primary" : "default"} className="rounded-full" onClick={() => setTab("admin")}>Admin Dashboard</Button>
        <Button variant={tab === "kitchen" ? "primary" : "default"} className="rounded-full" onClick={() => setTab("kitchen")}>Kitchen Display</Button>
      </nav>

      {tab === "pos" && (
        <main className="grid gap-4 p-4 xl:grid-cols-[230px_1fr_360px]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
            <h3 className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Categories</h3>
            <div className="grid gap-2 p-2">
              {categories.map((item) => (
                <Button key={item} className="justify-start" variant={category === item ? "primary" : "default"} onClick={() => setCategory(item)}>
                  {item}
                </Button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="grid gap-2 rounded-xl border border-slate-200 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <strong className="text-3xl leading-tight">{item.name}</strong>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{money(item.price)}</span>
                    <span>{item.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
            <h3 className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Cart</h3>
            <div className="grid max-h-[48vh] gap-2 overflow-auto p-3">
              {!cart.length && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-500">Cart is empty.</div>}
              {cart.map((item) => (
                <div key={item.id} className="grid gap-2 rounded-xl border border-slate-200 p-3">
                  <div className="flex justify-between"><strong>{item.name}</strong><strong>{money(item.price * item.qty)}</strong></div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Qty</span>
                    <div className="flex items-center gap-2">
                      <Button className="h-8 px-3" onClick={() => changeQty(item.id, -1)}>-</Button>
                      <strong>{item.qty}</strong>
                      <Button className="h-8 px-3" onClick={() => changeQty(item.id, 1)}>+</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-1 border-t border-slate-200 p-4 text-sm">
              <Row label="Subtotal" value={money(subtotal)} />
              <Row label="GST (5%)" value={money(gst)} />
              <Row label="Discount" value={`-${money(discount)}`} />
              <div className="mt-2 flex justify-between border-t border-dashed pt-2 text-3xl font-extrabold text-brand"><span>Total</span><span>{money(total)}</span></div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-slate-200 p-3">
              <Button onClick={() => setModalOpen(true)}>Cash</Button>
              <Button onClick={() => setModalOpen(true)}>Card</Button>
              <Button onClick={() => setModalOpen(true)}>UPI</Button>
              <Button onClick={() => window.alert("Order held")}>Hold</Button>
              <Button onClick={() => window.alert("Printing...")}>Print</Button>
              <Button variant="primary" onClick={() => setModalOpen(true)}>Pay</Button>
            </div>
          </section>
        </main>
      )}

      {tab === "admin" && <main className="p-4 text-lg font-semibold">Admin dashboard screen</main>}
      {tab === "kitchen" && <main className="p-4 text-lg font-semibold">Kitchen display screen</main>}

      {modalOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <h2 className="text-lg font-bold">Split Payment</h2>
            <FormInput label="Cash" value={payments.cash} onChange={(v) => setPayments((p) => ({ ...p, cash: Number(v) }))} />
            <FormInput label="Card" value={payments.card} onChange={(v) => setPayments((p) => ({ ...p, card: Number(v) }))} />
            <FormInput label="UPI" value={payments.upi} onChange={(v) => setPayments((p) => ({ ...p, upi: Number(v) }))} />
            <div className="my-3 flex justify-between"><span>Balance</span><strong className={balance <= 0 ? "text-emerald-600" : "text-rose-600"}>{money(balance)}</strong></div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button className="flex-1" variant="primary" onClick={confirmPayment}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ text }) {
  return <div className="flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600">{text}</div>;
}

function Row({ label, value }) {
  return <div className="flex justify-between"><span className="text-slate-600">{label}</span><strong>{value}</strong></div>;
}

function FormInput({ label, value, onChange }) {
  return (
    <label className="mt-2 grid gap-1 text-sm text-slate-600">
      <span>{label}</span>
      <input className="h-11 rounded-xl border border-slate-200 px-3 outline-none" type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default App;
