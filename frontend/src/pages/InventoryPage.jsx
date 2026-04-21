import React, { useEffect, useState } from "react";

export default function InventoryPage() {
  const [summary, setSummary] = useState(null);
  const [stock, setStock] = useState([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState("in");

  const load = async () => {
    try {
      const [summaryRes, stockRes] = await Promise.all([
        fetch("/api/public/inventory/summary"),
        fetch("/api/public/inventory/stock"),
      ]);
      const summaryData = await summaryRes.json();
      const stockData = await stockRes.json();

      if (summaryRes.ok) setSummary(summaryData.summary || null);
      if (stockRes.ok) setStock(Array.isArray(stockData.stock) ? stockData.stock : []);
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitMovement = async (event) => {
    event.preventDefault();
    if (!productId) {
      window.alert("Select product");
      return;
    }

    const response = await fetch("/api/public/inventory/movement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: Number(quantity || 0), type }),
    });
    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Stock movement failed");
      return;
    }

    load();
  };

  return (
    <section className="module-page">
      <div className="module-header">
        <h2>Inventory Management</h2>
        <button onClick={load}>Refresh</button>
      </div>

      <div className="module-kpis">
        <article className="module-card"><span>SKUs</span><strong>{summary?.productsCount ?? 0}</strong></article>
        <article className="module-card"><span>Total Units</span><strong>{summary?.totalUnits ?? 0}</strong></article>
        <article className="module-card"><span>Low Stock</span><strong>{summary?.lowStockItems?.length ?? 0}</strong></article>
        <article className="module-card"><span>Movements</span><strong>{summary?.movementsCount ?? 0}</strong></article>
      </div>

      <article className="module-card form-card">
        <h3>Stock In / Out</h3>
        <form className="inline-form" onSubmit={submitMovement}>
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select Product</option>
            {stock.map((row) => (
              <option key={row.productId} value={row.productId}>{row.productName}</option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
          </select>
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <button type="submit">Update</button>
        </form>
      </article>

      <article className="module-card">
        <h3>Current Stock</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Units</th>
                <th>Low Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((row) => (
                <tr key={row._id}>
                  <td>{row.productName}</td>
                  <td>{row.sku}</td>
                  <td>{row.quantity}</td>
                  <td>{row.lowStockThreshold}</td>
                  <td>{row.quantity <= row.lowStockThreshold ? "Low" : "Healthy"}</td>
                </tr>
              ))}
              {!stock.length && (
                <tr>
                  <td colSpan="5" className="muted">No stock rows yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
