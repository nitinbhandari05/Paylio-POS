import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ScanLine,
  Warehouse,
  Armchair,
  FileBarChart2,
  UtensilsCrossed,
  Settings,
  LifeBuoy,
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
import KitchenPage from "./pages/KitchenPage";
import LoginPage from "./pages/LoginPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import { POSProvider } from "./context/POSContext";
import logo from "./assets/logo-paylio-pos.png";

const NAV_ITEMS = [
  { id: "pos", label: "POS", icon: ScanLine },
  { id: "admin", label: "Admin", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Warehouse },
  { id: "tables", label: "Tables", icon: Armchair },
  { id: "waiter", label: "Waiter", icon: HandPlatter },
  { id: "kitchen", label: "Kitchen", icon: UtensilsCrossed },
  { id: "reports", label: "Reports", icon: FileBarChart2 },
  { id: "support", label: "Help & Support", icon: LifeBuoy },
  { id: "settings", label: "Settings", icon: Settings },
];

const getAllowedNav = () => NAV_ITEMS.map((item) => item.id);

function renderPage(activePage, session, dark, toggleDark, logout) {
  if (activePage === "pos") return <POSPage />;
  if (activePage === "admin") return <AdminPage />;
  if (activePage === "inventory") return <InventoryPage />;
  if (activePage === "tables") return <TableManagementPage />;
  if (activePage === "waiter") return <WaiterPage session={session} />;
  if (activePage === "kitchen") return <KitchenPage />;
  if (activePage === "reports") return <ReportsPage />;
  if (activePage === "support") return <HelpSupportPage />;
  if (activePage === "settings") {
    return (
      <SettingsPage
        session={session}
        dark={dark}
        onToggleDark={toggleDark}
        onLogout={logout}
      />
    );
  }
  return (
    <section className="module-note">You do not have access to this module.</section>
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

  const allowedNavIds = useMemo(() => getAllowedNav(), []);
  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => allowedNavIds.includes(item.id)),
    [allowedNavIds]
  );

  useEffect(() => {
    if (!allowedNavIds.includes(activePage)) {
      setActivePage(allowedNavIds[0] || "settings");
    }
  }, [activePage, allowedNavIds]);

  if (!session) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <POSProvider>
      <div className="saas-shell">
        <aside className="side-nav">
          <div className="brand-block">
            <img src={logo} alt="Paylio" className="sidebar-logo" />
          </div>

          <nav>
            {visibleNavItems.map((item) => {
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
              <span><ShieldCheck size={14} /> Staff</span>
            </div>
            <button onClick={() => setDark((v) => !v)} className="theme-btn">
              {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? "Light" : "Dark"}
            </button>
          </header>

          {allowedNavIds.includes(activePage)
            ? renderPage(activePage, session, dark, () => setDark((v) => !v), logout)
            : <section className="module-note">Access denied for your role.</section>}
        </section>
      </div>
    </POSProvider>
  );
}
