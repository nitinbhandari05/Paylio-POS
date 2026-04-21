import React, { useState } from "react";
import POSPage from "./pages/POSPage";
import AdminPage from "./pages/AdminPage";
import { POSProvider } from "./context/POSContext";

export default function App() {
  const [screen, setScreen] = useState("pos");

  return (
    <POSProvider>
      <div className="screen-switcher">
        <button className={screen === "pos" ? "active" : ""} onClick={() => setScreen("pos")}>POS</button>
        <button className={screen === "admin" ? "active" : ""} onClick={() => setScreen("admin")}>Admin</button>
      </div>

      {screen === "pos" ? <POSPage /> : <AdminPage />}
    </POSProvider>
  );
}
