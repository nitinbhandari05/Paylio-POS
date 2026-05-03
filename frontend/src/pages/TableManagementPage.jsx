import React, { useEffect, useMemo, useState } from "react";

const STATUSES = ["free", "occupied", "reserved", "cleaning"];

export default function TableManagementPage() {
  const [tables, setTables] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ number: "", seats: "4", label: "", notes: "" });
  const [bulkForm, setBulkForm] = useState({ startNumber: "", endNumber: "", seats: "4", notes: "" });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({ seats: "4", label: "", notes: "" });

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

  const createTable = async (event) => {
    event.preventDefault();
    if (!form.number) {
      window.alert("Table number is required");
      return;
    }
    const response = await fetch("/api/public/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: Number(form.number),
        seats: Number(form.seats || 4),
        label: form.label.trim() || undefined,
        notes: form.notes.trim() || "",
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Unable to add table");
      return;
    }
    setForm({ number: "", seats: "4", label: "", notes: "" });
    setCreating(false);
    load();
  };

  const createBulkTables = async (event) => {
    event.preventDefault();
    const response = await fetch("/api/public/tables/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startNumber: Number(bulkForm.startNumber),
        endNumber: Number(bulkForm.endNumber),
        seats: Number(bulkForm.seats || 4),
        notes: bulkForm.notes.trim() || "",
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Unable to bulk add tables");
      return;
    }
    window.alert(`Created ${data.createdCount} tables${data.skippedCount ? `, skipped ${data.skippedCount}` : ""}.`);
    setBulkForm({ startNumber: "", endNumber: "", seats: "4", notes: "" });
    load();
  };

  const startEdit = (table) => {
    setEditingId(table._id);
    setEditForm({
      seats: String(table.seats || 4),
      label: table.label || "",
      notes: table.notes || "",
    });
  };

  const saveEdit = async (tableId) => {
    const response = await fetch(`/api/public/tables/${tableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seats: Number(editForm.seats || 4),
        label: editForm.label.trim() || undefined,
        notes: editForm.notes.trim() || "",
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Unable to update table");
      return;
    }
    setTables((current) => current.map((table) => (table._id === tableId ? data.table : table)));
    setEditingId("");
  };

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesStatus = statusFilter === "all" || table.status === statusFilter;
      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" ? table.active !== false : table.active === false);
      const q = search.trim().toLowerCase();
      if (!q) return matchesStatus && matchesActive;
      const name = String(table.label || `Table ${table.number}`).toLowerCase();
      const num = String(table.number || "");
      return matchesStatus && matchesActive && (name.includes(q) || num.includes(q));
    });
  }, [tables, search, statusFilter, activeFilter]);

  const counts = useMemo(() => {
    const base = { all: tables.length, free: 0, occupied: 0, reserved: 0, cleaning: 0 };
    for (const table of tables) {
      const key = String(table.status || "free");
      if (base[key] !== undefined) base[key] += 1;
    }
    return base;
  }, [tables]);

  return (
    <section className="module-page">
      <div className="module-header">
        <h2>Table Management</h2>
        <button onClick={load}>Refresh</button>
      </div>

      <article className="module-card form-card">
        <form className="inline-form" onSubmit={createTable}>
          <input
            placeholder="Search by table name or number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All ({counts.all})</option>
            <option value="free">Free ({counts.free})</option>
            <option value="occupied">Occupied ({counts.occupied})</option>
            <option value="reserved">Reserved ({counts.reserved})</option>
            <option value="cleaning">Cleaning ({counts.cleaning})</option>
          </select>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
            <option value="all">All visibility</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          {!creating ? (
            <button type="button" onClick={() => setCreating(true)}>Add Table</button>
          ) : (
            <>
              <input
                type="number"
                min="1"
                placeholder="Table no"
                value={form.number}
                onChange={(e) => setForm((curr) => ({ ...curr, number: e.target.value }))}
              />
              <input
                type="number"
                min="1"
                placeholder="Seats"
                value={form.seats}
                onChange={(e) => setForm((curr) => ({ ...curr, seats: e.target.value }))}
              />
              <input
                placeholder="Label (optional)"
                value={form.label}
                onChange={(e) => setForm((curr) => ({ ...curr, label: e.target.value }))}
              />
              <input
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm((curr) => ({ ...curr, notes: e.target.value }))}
              />
              <button type="submit">Save Table</button>
              <button type="button" onClick={() => setCreating(false)}>Cancel</button>
            </>
          )}
        </form>
        <form className="inline-form" onSubmit={createBulkTables}>
          <input
            type="number"
            min="1"
            placeholder="Bulk start no"
            value={bulkForm.startNumber}
            onChange={(e) => setBulkForm((curr) => ({ ...curr, startNumber: e.target.value }))}
          />
          <input
            type="number"
            min="1"
            placeholder="Bulk end no"
            value={bulkForm.endNumber}
            onChange={(e) => setBulkForm((curr) => ({ ...curr, endNumber: e.target.value }))}
          />
          <input
            type="number"
            min="1"
            placeholder="Seats"
            value={bulkForm.seats}
            onChange={(e) => setBulkForm((curr) => ({ ...curr, seats: e.target.value }))}
          />
          <input
            placeholder="Default notes (optional)"
            value={bulkForm.notes}
            onChange={(e) => setBulkForm((curr) => ({ ...curr, notes: e.target.value }))}
          />
          <button type="submit">Bulk Add</button>
        </form>
      </article>

      <div className="tables-grid">
        {filteredTables.map((table) => (
          <article key={table._id} className={`module-card table-card status-${table.status}`}>
            <h3>{table.label || `Table ${table.number}`}</h3>
            <p>Table No: {table.number}</p>
            <p>Seats: {table.seats}</p>
            <p>Status: {table.status}</p>
            <p>Visibility: {table.active === false ? "inactive" : "active"}</p>
            {!!table.notes && <p>Notes: {table.notes}</p>}
            <div className="status-buttons">
              {STATUSES.map((status) => (
                <button key={status} className={table.status === status ? "active" : ""} onClick={() => updateStatus(table._id, status)}>
                  {status}
                </button>
              ))}
            </div>
            <div className="status-buttons">
              <button onClick={() => updateStatus(table._id, "free")}>Release Table</button>
              <button
                onClick={async () => {
                  const response = await fetch(`/api/public/tables/${table._id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ active: table.active === false }),
                  });
                  const data = await response.json();
                  if (!response.ok) {
                    window.alert(data.message || "Unable to update visibility");
                    return;
                  }
                  setTables((current) =>
                    current.map((row) => (row._id === table._id ? data.table : row))
                  );
                }}
              >
                {table.active === false ? "Activate" : "Deactivate"}
              </button>
              {editingId === table._id ? (
                <button onClick={() => setEditingId("")}>Cancel Edit</button>
              ) : (
                <button onClick={() => startEdit(table)}>Edit</button>
              )}
            </div>
            {editingId === table._id ? (
              <div className="inline-form">
                <input
                  type="number"
                  min="1"
                  value={editForm.seats}
                  onChange={(e) => setEditForm((curr) => ({ ...curr, seats: e.target.value }))}
                />
                <input
                  placeholder="Table label"
                  value={editForm.label}
                  onChange={(e) => setEditForm((curr) => ({ ...curr, label: e.target.value }))}
                />
                <input
                  placeholder="Table notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((curr) => ({ ...curr, notes: e.target.value }))}
                />
                <button onClick={() => saveEdit(table._id)}>Save</button>
              </div>
            ) : null}
          </article>
        ))}
        {!filteredTables.length && <div className="module-note">No tables match this filter.</div>}
      </div>
    </section>
  );
}
