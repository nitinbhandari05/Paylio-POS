import React, { useEffect, useState } from "react";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function ReportsPage({ title = "Reports" }) {
  const [report, setReport] = useState(null);
  const [staffActivity, setStaffActivity] = useState([]);
  const [outletComparison, setOutletComparison] = useState([]);
  const [crmSummary, setCrmSummary] = useState(null);
  const [aiAnalytics, setAiAnalytics] = useState(null);

  const load = async () => {
    try {
      const [overviewRes, staffRes, outletRes, crmRes, aiRes] = await Promise.all([
        fetch("/api/public/reports/overview"),
        fetch("/api/public/reports/staff-activity"),
        fetch("/api/public/reports/outlet-comparison"),
        fetch("/api/public/crm/summary"),
        fetch("/api/public/ai/analytics"),
      ]);
      const overviewData = await overviewRes.json();
      const staffData = await staffRes.json();
      const outletData = await outletRes.json();
      const crmData = await crmRes.json();
      const aiData = await aiRes.json();
      if (!overviewRes.ok) throw new Error(overviewData.message || "Reports failed");
      setReport(overviewData);
      setStaffActivity(Array.isArray(staffData.staffActivity) ? staffData.staffActivity : []);
      setOutletComparison(Array.isArray(outletData.outlets) ? outletData.outlets : []);
      setCrmSummary(crmData.summary || null);
      setAiAnalytics(aiRes.ok ? aiData : null);
    } catch {
      setReport(null);
      setStaffActivity([]);
      setOutletComparison([]);
      setCrmSummary(null);
      setAiAnalytics(null);
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
            <article className="module-card"><span>Repeat Customers</span><strong>{crmSummary?.repeatCustomers ?? 0}</strong></article>
            <article className="module-card"><span>Loyalty Points</span><strong>{crmSummary?.loyaltyPointsIssued ?? 0}</strong></article>
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

          <div className="reports-grid">
            <article className="module-card">
              <h3>Staff Activity</h3>
              <ul className="plain-list">
                {staffActivity.slice(0, 8).map((row) => (
                  <li key={`${row.name}-${row.role}`}>
                    <span>{row.name} ({row.role})</span>
                    <strong>{row.ordersHandled} orders · {money(row.salesHandled)}</strong>
                  </li>
                ))}
                {!staffActivity.length && <li><span>No staff activity yet.</span><strong>-</strong></li>}
              </ul>
            </article>

            <article className="module-card">
              <h3>Outlet Comparison</h3>
              <ul className="plain-list">
                {outletComparison.slice(0, 8).map((row) => (
                  <li key={row.outletId}>
                    <span>{row.outletName}</span>
                    <strong>{money(row.netRevenue)} · {row.orders} orders</strong>
                  </li>
                ))}
                {!outletComparison.length && <li><span>No outlet data yet.</span><strong>-</strong></li>}
              </ul>
            </article>
          </div>

          <article className="module-card">
            <h3>AI Analytics</h3>
            <p className="muted">
              Predicted Peak Hour: {aiAnalytics?.metrics?.predictedPeakHour || "--"} | Avg Order: {money(aiAnalytics?.metrics?.avgOrderValue || 0)}
            </p>
            <ul className="plain-list">
              {(aiAnalytics?.insights || []).map((row) => (
                <li key={row.id}>
                  <span>{row.id}</span>
                  <strong>{row.text}</strong>
                </li>
              ))}
            </ul>
          </article>
        </>
      )}
    </section>
  );
}
