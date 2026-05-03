import React, { useEffect, useMemo, useState } from "react";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const computeSummary = (orders) => {
  const billed = orders.filter((o) => !["cancelled", "refunded"].includes(String(o.status || "").toLowerCase()));
  const completed = orders.filter((o) => o.status === "completed");
  const refunded = orders.filter((o) => o.status === "refunded");
  const cancelled = orders.filter((o) => o.status === "cancelled");

  const totalSales = billed.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const totalTax = billed.reduce((sum, o) => sum + Number(o.gstAmount || 0), 0);
  const totalRefunds = refunded.reduce((sum, o) => sum + Number(o.refundAmount || o.total || 0), 0);

  const paymentBreakdown = {};
  for (const order of orders) {
    if (["cancelled", "refunded"].includes(String(order.status || "").toLowerCase())) continue;
    const payments = Array.isArray(order.payments) ? order.payments : [];
    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const cappedPaid = Math.max(0, Math.min(totalPaid, Number(order.total || 0)));
    const scale = totalPaid > 0 ? cappedPaid / totalPaid : 0;

    for (const payment of payments) {
      const method = String(payment.method || "unknown").toLowerCase();
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + Number(payment.amount || 0) * scale;
    }
  }

  return {
    totalOrders: orders.length,
    completedOrders: completed.length,
    refundedOrders: refunded.length,
    cancelledOrders: cancelled.length,
    totalSales,
    totalTax,
    totalRefunds,
    netSales: totalSales - totalRefunds,
    avgOrderValue: billed.length ? totalSales / billed.length : 0,
    paymentBreakdown,
  };
};

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Invalid JSON response" };
  }
}

export default function AdminPage() {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [source, setSource] = useState("summary-api");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const ordersRes = await fetch("/api/public/orders?limit=100");
      const ordersData = await parseJsonSafe(ordersRes);

      if (!ordersRes.ok) {
        throw new Error(ordersData.message || `Orders API failed (${ordersRes.status})`);
      }

      const liveOrders = Array.isArray(ordersData.orders) ? ordersData.orders : [];
      setOrders(liveOrders);

      const summaryRes = await fetch("/api/public/orders/summary");
      const summaryData = await parseJsonSafe(summaryRes);

      if (summaryRes.ok && summaryData.summary) {
        setSummary(summaryData.summary);
        setSource("summary-api");
      } else {
        setSummary(computeSummary(liveOrders));
        setSource("orders-fallback");
      }
    } catch (err) {
      setError(err.message || "Unable to load admin dashboard");
      setSummary(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const paymentMix = useMemo(
    () => Object.entries(summary?.paymentBreakdown || {}).sort((a, b) => Number(b[1]) - Number(a[1])),
    [summary]
  );

  return (
    <div className="admin-page">
      <div className="admin-top">
        <h2>Owner Analytics</h2>
        <button onClick={load}>Refresh</button>
      </div>

      <div className="admin-source">Data mode: {source}</div>

      {loading && <div className="admin-note">Loading dashboard...</div>}
      {!loading && error && <div className="admin-note error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="admin-kpis">
            <article className="kpi"><span>Total Orders</span><strong>{summary?.totalOrders ?? 0}</strong></article>
            <article className="kpi"><span>Net Sales</span><strong>{money(summary?.netSales || 0)}</strong></article>
            <article className="kpi"><span>Total Tax</span><strong>{money(summary?.totalTax || 0)}</strong></article>
            <article className="kpi"><span>Avg Order</span><strong>{money(summary?.avgOrderValue || 0)}</strong></article>
          </section>

          <section className="admin-panels">
            <article className="panel">
              <h3>Payment Mix</h3>
              {!paymentMix.length && <p className="muted">No payment data yet.</p>}
              {!!paymentMix.length && (
                <div className="mix-list">
                  {paymentMix.map(([method, amount]) => (
                    <div key={method} className="mix-row">
                      <span>{method.toUpperCase()}</span>
                      <strong>{money(amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="panel">
              <h3>Recent Orders</h3>
              {!orders.length && <p className="muted">No orders yet.</p>}
              {!!orders.length && (
                <div className="orders-list">
                  {orders.map((order) => (
                    <div key={order._id} className="order-row">
                      <span>{order.invoiceNumber || order._id}</span>
                      <span>{order.customerName || "Walk-in"}</span>
                      <strong>{money(order.total || 0)}</strong>
                      <em>{order.status}</em>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
