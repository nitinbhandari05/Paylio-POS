import React, { useState } from "react";

export default function SettingsPage({ session, dark, onToggleDark, onLogout }) {
  const [sms, setSms] = useState(true);
  const [whatsapp, setWhatsapp] = useState(true);
  const [loyalty, setLoyalty] = useState(true);

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
