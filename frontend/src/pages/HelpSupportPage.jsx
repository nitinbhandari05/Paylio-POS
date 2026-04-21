import React from "react";

export default function HelpSupportPage() {
  const openIssueEmail = () => {
    const subject = encodeURIComponent("Paylio Support Request");
    const body = encodeURIComponent(
      "Restaurant Name:\nOutlet:\nIssue Type:\nWhat happened:\nScreenshot/Order ID:\nUrgency:"
    );
    window.open(`mailto:support@paylio.app?subject=${subject}&body=${body}`, "_blank");
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent(
      "Hi Paylio Support, I need help with my POS. Here are the details:"
    );
    window.open(`https://wa.me/919999999999?text=${msg}`, "_blank");
  };

  return (
    <section className="module-page">
      <div className="module-header">
        <h2>Help & Support</h2>
      </div>

      <div className="settings-grid">
        <article className="module-card">
          <h3>Contact Support</h3>
          <p className="muted">Mon-Sat, 9:00 AM - 9:00 PM IST</p>
          <p>Email: support@paylio.app</p>
          <p>Phone: +91 99999 99999</p>
          <button onClick={openIssueEmail}>Report via Email</button>
          <button onClick={openWhatsApp}>Chat on WhatsApp</button>
        </article>

        <article className="module-card">
          <h3>Quick Help</h3>
          <ul className="plain-list">
            <li>
              <span>Billing not saving</span>
              <strong>Check internet, retry in 30 sec</strong>
            </li>
            <li>
              <span>Printer not working</span>
              <strong>Reconnect thermal printer and refresh</strong>
            </li>
            <li>
              <span>Wrong stock count</span>
              <strong>Open inventory movement and verify entries</strong>
            </li>
            <li>
              <span>Staff login issue</span>
              <strong>Reset password from admin settings</strong>
            </li>
          </ul>
        </article>

        <article className="module-card">
          <h3>Escalation</h3>
          <p className="muted">For urgent downtime, mention “POS DOWN” in subject.</p>
          <p>SLA target: Response within 15 minutes for critical issues.</p>
          <p>Include invoice/order ID for faster diagnosis.</p>
        </article>
      </div>
    </section>
  );
}
