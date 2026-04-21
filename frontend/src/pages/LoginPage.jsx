import React, { useState } from "react";
import logo from "../assets/logo.svg";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9]{10,15}$/;

const isPhone = (value) => phonePattern.test(String(value || "").trim());

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [registerOtpSent, setRegisterOtpSent] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);

  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: "",
    pin: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    pin: "",
    role: "cashier",
    otpChannel: "email",
    otpCode: "",
  });

  const [forgotForm, setForgotForm] = useState({
    channel: "email",
    target: "",
    otpCode: "",
    newPassword: "",
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
    if (!usePin && (!loginForm.identifier.trim() || !loginForm.password.trim())) {
      window.alert("Enter email/phone and password, or use PIN");
      return;
    }
    if (usePin && !/^\d{4,6}$/.test(loginForm.pin.trim())) {
      window.alert("PIN must be 4 to 6 digits");
      return;
    }

    try {
      setLoading(true);
      const identifier = loginForm.identifier.trim();
      const loginPayload = isPhone(identifier)
        ? { phone: identifier, password: loginForm.password }
        : { email: identifier.toLowerCase(), password: loginForm.password };

      const response = await fetch(usePin ? "/api/auth/pin-login" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usePin ? { pin: loginForm.pin.trim() } : loginPayload),
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

  const requestRegisterOtp = async () => {
    const channel = registerForm.otpChannel;
    const target = channel === "phone" ? registerForm.phone.trim() : registerForm.email.trim().toLowerCase();
    if (!target) {
      window.alert(`Enter ${channel} first`);
      return;
    }
    if (channel === "email" && !emailPattern.test(target)) {
      window.alert("Enter a valid email");
      return;
    }
    if (channel === "phone" && !phonePattern.test(target)) {
      window.alert("Phone must be 10 to 15 digits");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/register/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(channel === "phone" ? { channel, phone: target } : { channel, email: target }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send OTP");
      setRegisterOtpSent(true);
      window.alert(data.debugOtp ? `OTP sent. Dev code: ${data.debugOtp}` : "OTP sent successfully");
    } catch (error) {
      window.alert(error.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    if (!registerForm.name.trim() || !registerForm.password.trim()) {
      window.alert("Name and password are required");
      return;
    }
    if (registerForm.password.length < 6) {
      window.alert("Password must be at least 6 characters");
      return;
    }
    if (registerForm.pin.trim() && !/^\d{4,6}$/.test(registerForm.pin.trim())) {
      window.alert("PIN must be 4 to 6 digits");
      return;
    }
    if (!registerForm.otpCode.trim()) {
      window.alert("Enter OTP");
      return;
    }

    const usePhone = registerForm.otpChannel === "phone";
    const email = registerForm.email.trim().toLowerCase();
    const phone = registerForm.phone.trim();

    if (!usePhone && !emailPattern.test(email)) {
      window.alert("Valid email is required for email OTP registration");
      return;
    }
    if (usePhone && !phonePattern.test(phone)) {
      window.alert("Valid phone is required for phone OTP registration");
      return;
    }

    try {
      setLoading(true);
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerForm.name.trim(),
          email,
          phone,
          password: registerForm.password,
          pin: registerForm.pin.trim(),
          role: registerForm.role,
          otpChannel: registerForm.otpChannel,
          otpCode: registerForm.otpCode.trim(),
        }),
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        throw new Error(registerData.message || "Registration failed");
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usePhone ? { phone, password: registerForm.password } : { email, password: registerForm.password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.message || "Registered, but auto-login failed");
      onLogin(normalizeSession(loginData));
    } catch (error) {
      window.alert(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const requestForgotOtp = async () => {
    const target = forgotForm.target.trim();
    if (!target) {
      window.alert("Enter email or phone");
      return;
    }
    if (forgotForm.channel === "email" && !emailPattern.test(target)) {
      window.alert("Enter a valid email");
      return;
    }
    if (forgotForm.channel === "phone" && !phonePattern.test(target)) {
      window.alert("Phone must be 10 to 15 digits");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/forgot-password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          forgotForm.channel === "phone"
            ? { channel: "phone", phone: target }
            : { channel: "email", email: target.toLowerCase() }
        ),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to send OTP");
      setForgotOtpSent(true);
      window.alert(data.debugOtp ? `OTP sent. Dev code: ${data.debugOtp}` : "OTP sent successfully");
    } catch (error) {
      window.alert(error.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const submitForgotPassword = async (event) => {
    event.preventDefault();
    if (!forgotForm.target.trim() || !forgotForm.otpCode.trim() || !forgotForm.newPassword) {
      window.alert("All fields are required");
      return;
    }
    if (forgotForm.newPassword.length < 6) {
      window.alert("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: forgotForm.channel,
          target: forgotForm.channel === "email" ? forgotForm.target.trim().toLowerCase() : forgotForm.target.trim(),
          otpCode: forgotForm.otpCode.trim(),
          newPassword: forgotForm.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Reset failed");
      window.alert("Password reset successful. Please login.");
      setMode("login");
      setForgotOtpSent(false);
      setForgotForm({ channel: "email", target: "", otpCode: "", newPassword: "" });
    } catch (error) {
      window.alert(error.message || "Reset failed");
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
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Login
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Register
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={submitLogin} className="login-form">
            <label>
              Email or Phone
              <input
                value={loginForm.identifier}
                onChange={(e) => setLoginForm((curr) => ({ ...curr, identifier: e.target.value }))}
                placeholder="you@restaurant.com / 9876543210"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((curr) => ({ ...curr, password: e.target.value }))}
                placeholder="••••••••"
              />
            </label>
            <label>
              PIN (optional quick login)
              <input
                type="password"
                value={loginForm.pin}
                onChange={(e) => setLoginForm((curr) => ({ ...curr, pin: e.target.value }))}
                placeholder="1234"
              />
            </label>
            <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
            <button type="button" className="link-btn" onClick={() => setMode("forgot")}>
              Forgot password?
            </button>
          </form>
        ) : null}

        {mode === "register" ? (
          <form onSubmit={submitRegister} className="login-form">
            <label>
              Full Name
              <input
                value={registerForm.name}
                onChange={(e) => setRegisterForm((curr) => ({ ...curr, name: e.target.value }))}
                placeholder="Staff name"
              />
            </label>

            <label>
              OTP Channel
              <select
                value={registerForm.otpChannel}
                onChange={(e) => setRegisterForm((curr) => ({ ...curr, otpChannel: e.target.value, otpCode: "" }))}
              >
                <option value="email">Email OTP</option>
                <option value="phone">Phone OTP</option>
              </select>
            </label>

            <label>
              Email
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((curr) => ({ ...curr, email: e.target.value }))}
                placeholder="you@restaurant.com"
              />
            </label>

            <label>
              Phone
              <input
                value={registerForm.phone}
                onChange={(e) => setRegisterForm((curr) => ({ ...curr, phone: e.target.value }))}
                placeholder="9876543210"
              />
            </label>

            <button type="button" onClick={requestRegisterOtp} disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>

            {registerOtpSent && (
              <label>
                OTP Code
                <input
                  value={registerForm.otpCode}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, otpCode: e.target.value }))}
                  placeholder="Enter 6-digit OTP"
                />
              </label>
            )}

            <label>
              Password
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((curr) => ({ ...curr, password: e.target.value }))}
                placeholder="Minimum 6+"
              />
            </label>

            <label>
              PIN (optional for quick login)
              <input
                type="password"
                value={registerForm.pin}
                onChange={(e) => setRegisterForm((curr) => ({ ...curr, pin: e.target.value }))}
                placeholder="1234"
              />
            </label>

            <label>
              Role
              <select
                value={registerForm.role}
                onChange={(e) => setRegisterForm((curr) => ({ ...curr, role: e.target.value }))}
              >
                <option value="user">User</option>
                <option value="cashier">Cashier</option>
                <option value="waiter">Waiter</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Register & Login"}
            </button>
          </form>
        ) : null}

        {mode === "forgot" ? (
          <form onSubmit={submitForgotPassword} className="login-form">
            <label>
              OTP Channel
              <select
                value={forgotForm.channel}
                onChange={(e) =>
                  setForgotForm((curr) => ({ ...curr, channel: e.target.value, otpCode: "" }))
                }
              >
                <option value="email">Email OTP</option>
                <option value="phone">Phone OTP</option>
              </select>
            </label>

            <label>
              Email or Phone
              <input
                value={forgotForm.target}
                onChange={(e) => setForgotForm((curr) => ({ ...curr, target: e.target.value }))}
                placeholder={forgotForm.channel === "email" ? "you@restaurant.com" : "9876543210"}
              />
            </label>

            <button type="button" onClick={requestForgotOtp} disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>

            {forgotOtpSent && (
              <>
                <label>
                  OTP Code
                  <input
                    value={forgotForm.otpCode}
                    onChange={(e) => setForgotForm((curr) => ({ ...curr, otpCode: e.target.value }))}
                    placeholder="Enter 6-digit OTP"
                  />
                </label>
                <label>
                  New Password
                  <input
                    type="password"
                    value={forgotForm.newPassword}
                    onChange={(e) => setForgotForm((curr) => ({ ...curr, newPassword: e.target.value }))}
                    placeholder="New password"
                  />
                </label>
                <button type="submit" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </>
            )}

            <button type="button" className="link-btn" onClick={() => setMode("login")}>
              Back to login
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
