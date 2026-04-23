import React, { useEffect, useState } from "react";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function ReportsPage({ title = "Reports" }) {
  const [report, setReport] = useState(null);

  const load = async () => {
    try {
      const response = await fetch("/api/public/reports/overview");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Reports failed");
      setReport(data);
    } catch {
      setReport(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="module-page">
      <div className="module-header">
        <h2>{title}</h2>
        <button onClick={load}>Refresh</button>
      </div>

      {!report && <div className="module-note">Reports unavailable right now.</div>}

      {!!report && (
        <>
          <div className="module-kpis">
            <article className="module-card"><span>Orders</span><strong>{report.headline.orders}</strong></article>
            <article className="module-card"><span>Revenue</span><strong>{money(report.headline.grossRevenue)}</strong></article>
            <article className="module-card"><span>Taxes</span><strong>{money(report.headline.taxes)}</strong></article>
            <article className="module-card"><span>Staff</span><strong>{report.headline.staffCount}</strong></article>
          </div>

          <div className="reports-grid">
            <article className="module-card">
              <h3>Best Selling Products</h3>
              <ul className="plain-list">
                {(report.topProducts || []).map((row) => (
                  <li key={row.productId || row.name}>
                    <span>{row.name}</span>
                    <strong>{row.quantity} sold</strong>
                  </li>
                ))}
              </ul>
            </article>

            <article className="module-card">
              <h3>Recent Revenue Trend</h3>
              <ul className="plain-list">
                {(report.recentTrend || []).slice(-8).map((row) => (
                  <li key={`${row.date}-${row.total}`}>
                    <span>{new Date(row.date).toLocaleString()}</span>
                    <strong>{money(row.total)}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
