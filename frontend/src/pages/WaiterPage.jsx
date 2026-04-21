import React, { useEffect, useState } from "react";

const NEXT_STATUS = {
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
};

export default function WaiterPage({ session }) {
  const [orders, setOrders] = useState([]);

  const load = async () => {
    try {
      const response = await fetch("/api/public/orders?limit=100");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed");
      const all = Array.isArray(data.orders) ? data.orders : [];
      const mine = all.filter((order) => {
        if (!order.waiterName) return true;
        return String(order.waiterName).toLowerCase() === String(session?.name || "").toLowerCase();
      });
      setOrders(mine.filter((order) => ["accepted", "preparing", "ready"].includes(order.status)));
    } catch {
      setOrders([]);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 9000);
    return () => clearInterval(timer);
  }, []);

  const update = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    const response = await fetch(`/api/public/orders/${order._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Unable to update");
      return;
    }
    setOrders((curr) => curr.map((row) => (row._id === order._id ? data.order : row)));
  };

  return (
    <section className="module-page">
      <div className="module-header">
        <h2>Waiter Workflow</h2>
        <button onClick={load}>Refresh</button>
      </div>

      <div className="tables-grid">
        {orders.map((order) => (
          <article key={order._id} className="module-card table-card">
            <h3>{order.invoiceNumber}</h3>
            <p>Customer: {order.customerName || "Walk-in"}</p>
            <p>Table: {order.tableNo || "N/A"}</p>
            <p>Status: {order.status}</p>
            <button onClick={() => update(order)}>{NEXT_STATUS[order.status] || "Done"}</button>
          </article>
        ))}
        {!orders.length && <div className="module-note">No assigned active orders.</div>}
      </div>
    </section>
  );
}
