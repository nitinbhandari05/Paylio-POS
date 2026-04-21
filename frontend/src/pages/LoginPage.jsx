import React, { useState } from "react";
import logo from "../assets/logo.svg";

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    pin: "",
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    pin: "",
    role: "cashier",
  });

  const normalizeSession = (data) => ({
    name: data.user?.name || "Staff",
    role: data.user?.role || "cashier",
    token: data.token,
    outletId: data.user?.outletId || "main",
    organizationId: data.user?.organizationId || "org-main",
    accessibleOutletIds: data.user?.accessibleOutletIds || [data.user?.outletId || "main"],
    loginAt: new Date().toISOString(),
  });

  const submitLogin = async (event) => {
    event.preventDefault();
    const usePin = Boolean(loginForm.pin.trim());
    if (!usePin && (!loginForm.email.trim() || !loginForm.password.trim())) {
      window.alert("Enter email and password, or use PIN");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(usePin ? "/api/auth/pin-login" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          usePin
            ? { pin: loginForm.pin.trim() }
            : { email: loginForm.email.trim(), password: loginForm.password }
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }
      onLogin(normalizeSession(data));
    } catch (error) {
      window.alert(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.password.trim()) {
      window.alert("Name, email, and password are required");
      return;
    }

    try {
      setLoading(true);
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerForm.name.trim(),
          email: registerForm.email.trim(),
          password: registerForm.password,
          pin: registerForm.pin.trim(),
          role: registerForm.role,
        }),
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        throw new Error(registerData.message || "Registration failed");
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerForm.email.trim(),
          password: registerForm.password,
        }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(loginData.message || "Registered, but auto-login failed");
      }

      onLogin(normalizeSession(loginData));
    } catch (error) {
      window.alert(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src={logo} alt="Paylio logo" />
          <div>
            <h1>Paylio Cloud POS</h1>
            <p>Restaurant + Retail Management Suite</p>
          </div>
        </div>

        <div className="screen-switcher">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={submitLogin} className="login-form">
            <label>
              Email
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm((curr) => ({ ...curr, email: e.target.value }))
                }
                placeholder="you@restaurant.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm((curr) => ({ ...curr, password: e.target.value }))
                }
                placeholder="••••••••"
              />
            </label>

            <label>
              PIN (optional quick login)
              <input
                type="password"
                value={loginForm.pin}
                onChange={(e) =>
                  setLoginForm((curr) => ({ ...curr, pin: e.target.value }))
                }
                placeholder="1234"
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
            <small className="login-note">Use PIN for faster counter login</small>
          </form>
        ) : (
          <form onSubmit={submitRegister} className="login-form">
            <label>
              Full Name
              <input
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm((curr) => ({ ...curr, name: e.target.value }))
                }
                placeholder="Staff name"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm((curr) => ({ ...curr, email: e.target.value }))
                }
                placeholder="you@restaurant.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm((curr) => ({ ...curr, password: e.target.value }))
                }
                placeholder="Minimum 6+"
              />
            </label>

            <label>
              PIN (optional for quick login)
              <input
                type="password"
                value={registerForm.pin}
                onChange={(e) =>
                  setRegisterForm((curr) => ({ ...curr, pin: e.target.value }))
                }
                placeholder="1234"
              />
            </label>

            <label>
              Role
              <select
                value={registerForm.role}
                onChange={(e) =>
                  setRegisterForm((curr) => ({ ...curr, role: e.target.value }))
                }
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
                <option value="waiter">Waiter</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Register & Login"}
            </button>
            <small className="login-note">Admins and managers get advanced modules</small>
          </form>
        )}
      </div>
    </main>
  );
}
