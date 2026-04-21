import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ScanLine,
  Warehouse,
  Armchair,
  FileBarChart2,
  Settings,
  HandPlatter,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
} from "lucide-react";
import POSPage from "./pages/POSPage";
import AdminPage from "./pages/AdminPage";
import InventoryPage from "./pages/InventoryPage";
import TableManagementPage from "./pages/TableManagementPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import WaiterPage from "./pages/WaiterPage";
import LoginPage from "./pages/LoginPage";
import { POSProvider } from "./context/POSContext";

const NAV_ITEMS = [
  { id: "pos", label: "POS", icon: ScanLine },
  { id: "admin", label: "Admin", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Warehouse },
  { id: "tables", label: "Tables", icon: Armchair },
  { id: "waiter", label: "Waiter", icon: HandPlatter },
  { id: "reports", label: "Reports", icon: FileBarChart2 },
  { id: "settings", label: "Settings", icon: Settings },
];

function renderPage(activePage, session, dark, toggleDark, logout) {
  if (activePage === "pos") return <POSPage />;
  if (activePage === "admin") return <AdminPage />;
  if (activePage === "inventory") return <InventoryPage />;
  if (activePage === "tables") return <TableManagementPage />;
  if (activePage === "waiter") return <WaiterPage session={session} />;
  if (activePage === "reports") return <ReportsPage />;
  return (
    <SettingsPage
      session={session}
      dark={dark}
      onToggleDark={toggleDark}
      onLogout={logout}
    />
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("paylio-session") || "null");
    } catch {
      return null;
    }
  });
  const [activePage, setActivePage] = useState("pos");
  const [dark, setDark] = useState(() => localStorage.getItem("paylio-theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("paylio-theme", dark ? "dark" : "light");
  }, [dark]);

  const login = (payload) => {
    setSession(payload);
    localStorage.setItem("paylio-session", JSON.stringify(payload));
    if (payload?.token) {
      localStorage.setItem("paylio-token", payload.token);
    }
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem("paylio-session");
    localStorage.removeItem("paylio-token");
  };

  const roleLabel = useMemo(() => session?.role || "guest", [session]);

  if (!session) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <POSProvider>
      <div className="saas-shell">
        <aside className="side-nav">
          <div className="brand-block">
            <h1>Paylio</h1>
            <p>Restaurant Cloud</p>
          </div>

          <nav>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={activePage === item.id ? "active" : ""}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <button className="nav-logout" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </aside>

        <section className="main-area">
          <header className="shell-top">
            <div>
              <strong>{session.name}</strong>
              <span><ShieldCheck size={14} /> {roleLabel}</span>
            </div>
            <button onClick={() => setDark((v) => !v)} className="theme-btn">
              {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? "Light" : "Dark"}
            </button>
          </header>

          {renderPage(activePage, session, dark, () => setDark((v) => !v), logout)}
        </section>
      </div>
    </POSProvider>
  );
}
