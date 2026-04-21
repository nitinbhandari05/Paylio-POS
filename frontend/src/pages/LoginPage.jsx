import React, { useState } from "react";

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState("Nitin");
  const [role, setRole] = useState("admin");
  const [pin, setPin] = useState("1234");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!pin.trim()) {
      window.alert("Enter PIN");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Invalid PIN");
      }

      onLogin({
        name: data.user?.name || name.trim() || "Staff",
        role: data.user?.role || role,
        pin: pin.trim(),
        token: data.token,
        outletId: data.user?.outletId || "main",
        loginAt: new Date().toISOString(),
      });
    } catch (error) {
      window.alert(error.message || "PIN login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>Paylio Cloud POS</h1>
        <p>Restaurant + Retail Management Suite</p>

        <label>
          Staff Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name (fallback)" />
        </label>

        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="waiter">Waiter</option>
          </select>
        </label>

        <label>
          PIN / Password
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" />
        </label>

        <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Login to Dashboard"}</button>
      </form>
    </main>
  );
}
