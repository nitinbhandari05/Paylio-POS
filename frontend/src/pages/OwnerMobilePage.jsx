import React, { useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/api";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatTime = (value) => {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString();
};

export default function OwnerMobilePage({ session }) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const data = await authFetch("/api/saas/owner-dashboard");
      setPayload(data);
    } catch (err) {
      setError(err.message || "Unable to load owner dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const planLabel = useMemo(() => {
    const plan = payload?.subscription?.plan;
    if (!plan) return "No active plan";
    return `${plan.name} • ${money(plan.monthlyINR)}/month`;
  }, [payload]);

  return (
    <section className="owner-mobile">
      <div className="owner-hero">
        <div>
          <p className="eyebrow">Mobile Owner Command</p>
          <h2>{session?.name || "Owner"} Dashboard</h2>
          <span>{planLabel}</span>
        </div>
        <button onClick={load}>Refresh</button>
      </div>

      {loading && <div className="module-note">Loading owner metrics...</div>}
      {!loading && error && <div className="module-note owner-error">{error}</div>}

      {!!payload && !error && (
        <>
          <div className="owner-kpis">
            <article><span>Net Sales</span><strong>{money(payload.kpis.netSales)}</strong></article>
            <article><span>Total Orders</span><strong>{payload.kpis.totalOrders}</strong></article>
            <article><span>Kitchen Pending</span><strong>{payload.kpis.pendingKitchen}</strong></article>
            <article><span>Branches</span><strong>{payload.kpis.activeBranches}/{payload.kpis.totalBranches}</strong></article>
          </div>

          <div className="owner-grid">
            <article className="owner-card">
              <h3>Outlet Performance</h3>
              <div className="owner-list">
                {(payload.outlets || []).slice(0, 6).map((outlet) => (
                  <div key={outlet.outletId} className="owner-row">
                    <p>{outlet.name}</p>
                    <span>{outlet.orders} orders</span>
                    <strong>{money(outlet.netRevenue ?? outlet.revenue)}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="owner-card">
              <h3>Recent Bills</h3>
              <div className="owner-list">
                {(payload.recentOrders || []).slice(0, 8).map((order) => (
                  <div key={order.id} className="owner-row">
                    <p>{order.invoiceNumber}</p>
                    <span>{order.outletName}</span>
                    <strong>{money(order.total)}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="owner-footnote">
            Last sync: {formatTime(payload.generatedAt)}
          </div>
        </>
      )}
    </section>
  );
}
