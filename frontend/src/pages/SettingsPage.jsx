import React, { useState } from "react";

const normalizeRole = (role) => {
  const base = String(role || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (base === "super admin" || base === "superadmin") return "superadmin";
  if (base === "kitchen staff" || base === "kitchenstaff") return "kitchen";
  return base.replace(/\s+/g, "");
};

const ROLE_CAPABILITY = {
  superadmin: {
    title: "For your SaaS company",
    allow: ["All clients", "All outlets", "Subscription billing", "Support tools"],
  },
  owner: {
    title: "Business owner",
    allow: ["Full outlet access", "Reports", "Staff management", "Products", "Finance", "Settings"],
  },
  manager: {
    title: "Outlet manager",
    allow: ["Orders", "Refund approval", "Inventory", "Staff shifts", "Reports (limited)", "Table management"],
  },
  cashier: {
    title: "Billing desk user",
    allow: ["POS billing", "Apply allowed discounts", "Print invoice", "View today's orders"],
    deny: ["Cannot delete products", "Cannot see payroll", "Cannot change settings"],
  },
  waiter: {
    title: "Waiter",
    allow: ["Create table orders", "Update table status", "Request bill"],
    deny: ["No sales reports"],
  },
  kitchen: {
    title: "Kitchen staff",
    allow: ["Kitchen screen only", "Update status (Preparing / Ready)"],
  },
  accountant: {
    title: "Accountant",
    allow: ["GST reports", "Expenses", "Profit/loss", "Exports"],
  },
};

export default function SettingsPage({ session, dark, onToggleDark, onLogout }) {
  const [sms, setSms] = useState(true);
  const [whatsapp, setWhatsapp] = useState(true);
  const [loyalty, setLoyalty] = useState(true);
  const [integrationStatus, setIntegrationStatus] = useState([]);
  const [billingInvoices, setBillingInvoices] = useState([]);
  const [opsMessage, setOpsMessage] = useState("");
  const role = normalizeRole(session?.role);
  const profile = ROLE_CAPABILITY[role] || {
    title: "Standard access",
    allow: ["POS access", "Basic support"],
  };

  const loadOps = async () => {
    try {
      const [intRes, invRes] = await Promise.all([
        fetch("/api/public/integrations/status"),
        fetch("/api/public/saas/billing/invoices?organizationId=org-main"),
      ]);
      const intData = await intRes.json();
      const invData = await invRes.json();
      if (intRes.ok) setIntegrationStatus(Array.isArray(intData.providers) ? intData.providers : []);
      if (invRes.ok) setBillingInvoices(Array.isArray(invData.invoices) ? invData.invoices : []);
    } catch {
      setIntegrationStatus([]);
      setBillingInvoices([]);
    }
  };

  const syncZomato = async () => {
    const response = await fetch("/api/public/integrations/sync-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "zomato", limit: 8 }),
    });
    const data = await response.json();
    setOpsMessage(response.ok ? `${data.syncedOrders} orders synced from Zomato` : data.message || "Sync failed");
    loadOps();
  };

  const testPaymentGateway = async () => {
    const intentRes = await fetch("/api/public/payments/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 499, method: "upi" }),
    });
    const intentData = await intentRes.json();
    if (!intentRes.ok) {
      setOpsMessage(intentData.message || "Payment intent failed");
      return;
    }
    const verifyRes = await fetch("/api/public/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId: intentData.intentId }),
    });
    const verifyData = await verifyRes.json();
    setOpsMessage(verifyRes.ok ? `Payment verified: ${verifyData.reference}` : verifyData.message || "Verify failed");
  };

  const runSaasCheckout = async () => {
    const response = await fetch("/api/public/saas/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: "org-main",
        planId: "growth",
        planName: "Growth",
        amount: 1999,
        paymentMethod: "upi",
      }),
    });
    const data = await response.json();
    setOpsMessage(response.ok ? `SaaS invoice created: ${data.invoice?._id}` : data.message || "Checkout failed");
    loadOps();
  };

  React.useEffect(() => {
    loadOps();
  }, []);

  return (
    <section className="module-page">
      <div className="module-header">
        <h2>Settings</h2>
      </div>

      <div className="settings-grid">
        <article className="module-card">
          <h3>Account</h3>
          <p>Name: {session?.name}</p>
          <p>Role: {session?.role}</p>
          <p>Mode: {profile.title}</p>
          <ul className="plain-list">
            {profile.allow.map((item) => (
              <li key={item}>✔ {item}</li>
            ))}
            {(profile.deny || []).map((item) => (
              <li key={item}>❌ {item}</li>
            ))}
          </ul>
          <button onClick={onLogout}>Logout</button>
        </article>

        <article className="module-card">
          <h3>Theme</h3>
          <p>Current: {dark ? "Dark" : "Light"}</p>
          <button onClick={onToggleDark}>{dark ? "Switch to Light" : "Switch to Dark"}</button>
        </article>

        <article className="module-card">
          <h3>Customer Features</h3>
          <label><input type="checkbox" checked={sms} onChange={() => setSms((v) => !v)} /> SMS Receipt</label>
          <label><input type="checkbox" checked={whatsapp} onChange={() => setWhatsapp((v) => !v)} /> WhatsApp Receipt</label>
          <label><input type="checkbox" checked={loyalty} onChange={() => setLoyalty((v) => !v)} /> Loyalty Program</label>
        </article>

        <article className="module-card">
          <h3>Phase 3 + 4 Ops</h3>
          <p className="muted">Integrations, payment gateway, SaaS billing, and multi-outlet readiness.</p>
          <button onClick={syncZomato}>Sync Zomato Orders</button>
          <button onClick={testPaymentGateway}>Test Payment Gateway</button>
          <button onClick={runSaasCheckout}>Run SaaS Checkout</button>
          <p className="muted">{opsMessage || "No actions run yet."}</p>
          <ul className="plain-list">
            {integrationStatus.map((row) => (
              <li key={row.id}>
                <span>{row.id.toUpperCase()}</span>
                <strong>{row.connected ? "Connected" : "Not Connected"}</strong>
              </li>
            ))}
            {!integrationStatus.length && <li><span>Integrations</span><strong>No data</strong></li>}
          </ul>
          <p className="muted">Recent SaaS invoices: {billingInvoices.length}</p>
        </article>
      </div>
    </section>
  );
}
