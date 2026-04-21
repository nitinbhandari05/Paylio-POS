import React, { useEffect, useState } from "react";

const STATUSES = ["free", "occupied", "reserved", "cleaning"];

export default function TableManagementPage() {
  const [tables, setTables] = useState([]);

  const load = async () => {
    try {
      const response = await fetch("/api/public/tables");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load tables");
      setTables(Array.isArray(data.tables) ? data.tables : []);
    } catch {
      setTables([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (tableId, status) => {
    const response = await fetch(`/api/public/tables/${tableId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Status update failed");
      return;
    }

    setTables((current) => current.map((table) => (table._id === tableId ? data.table : table)));
  };

  return (
    <section className="module-page">
      <div className="module-header">
        <h2>Table Management</h2>
        <button onClick={load}>Refresh</button>
      </div>

      <div className="tables-grid">
        {tables.map((table) => (
          <article key={table._id} className={`module-card table-card status-${table.status}`}>
            <h3>{table.label || `Table ${table.number}`}</h3>
            <p>Seats: {table.seats}</p>
            <p>Status: {table.status}</p>
            <div className="status-buttons">
              {STATUSES.map((status) => (
                <button key={status} className={table.status === status ? "active" : ""} onClick={() => updateStatus(table._id, status)}>
                  {status}
                </button>
              ))}
            </div>
          </article>
        ))}
        {!tables.length && <div className="module-note">No tables configured. Add tables from backend admin.</div>}
      </div>
    </section>
  );
}
