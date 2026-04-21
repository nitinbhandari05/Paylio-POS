import React, { useEffect, useMemo, useState } from "react";

const STAGES = ["pending", "accepted", "preparing", "ready"];
const NEXT_STATUS = {
  pending: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
};

const ageLabel = (dateStr) => {
  const ts = new Date(dateStr).getTime();
  if (!ts) return "--";
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const response = await fetch("/api/public/kitchen/board");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Kitchen fetch failed");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      // keep previous list
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((status) => [status, []]));
    for (const order of orders) {
      if (map[order.status]) map[order.status].push(order);
    }
    return map;
  }, [orders]);

  const moveStatus = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    const response = await fetch(`/api/public/orders/${order._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });

    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Failed to update status");
      return;
    }

    setOrders((current) => current.map((item) => (item._id === order._id ? data.order : item)));
  };

  return (
    <section className="module-page">
      <div className="module-header">
        <h2>Kitchen Display</h2>
        <button onClick={load}>Refresh</button>
      </div>

      {loading && <div className="module-note">Loading kitchen board...</div>}

      <div className="kitchen-grid">
        {STAGES.map((stage) => (
          <article key={stage} className="module-card kitchen-column">
            <h3>{stage.toUpperCase()}</h3>
            {!grouped[stage]?.length && <p className="muted">No tickets</p>}
            {!!grouped[stage]?.length && (
              <div className="kitchen-list">
                {grouped[stage].map((order) => (
                  <div key={order._id} className="ticket-card">
                    <div className="ticket-top">
                      <strong>{order.kotNumber || "KOT"}</strong>
                      <span>{ageLabel(order.createdAt)}</span>
                    </div>
                    <p>{order.invoiceNumber}</p>
                    <ul>
                      {(order.items || []).map((item) => (
                        <li key={item._id || `${order._id}-${item.name}`}>{item.quantity} x {item.name}</li>
                      ))}
                    </ul>
                    <button onClick={() => moveStatus(order)}>{NEXT_STATUS[order.status] || "Done"}</button>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
