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
  const role = normalizeRole(session?.role);
  const profile = ROLE_CAPABILITY[role] || {
    title: "Standard access",
    allow: ["POS access", "Basic support"],
  };

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
      </div>
    </section>
  );
}
