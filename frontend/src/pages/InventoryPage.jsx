import React, { useEffect, useState } from "react";
import { authFetch } from "../lib/api.js";

export default function InventoryPage() {
  const [summary, setSummary] = useState(null);
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState("in");

  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    categoryId: "",
    price: "",
    cost: "",
    lowStockThreshold: "5",
    unit: "pcs",
  });
  const [dailyReport, setDailyReport] = useState(null);

  const load = async () => {
    try {
      const [summaryRes, stockRes, productsRes, categoriesRes, reportRes] = await Promise.all([
        fetch("/api/public/inventory/summary"),
        fetch("/api/public/inventory/stock"),
        authFetch("/api/products"),
        authFetch("/api/categories"),
        fetch("/api/public/inventory/daily-report"),
      ]);

      const summaryData = await summaryRes.json();
      const stockData = await stockRes.json();
      const productsData = productsRes;
      const categoriesData = categoriesRes;
      const reportData = await reportRes.json();

      if (summaryRes.ok) setSummary(summaryData.summary || null);
      if (stockRes.ok) setStock(Array.isArray(stockData.stock) ? stockData.stock : []);
      setProducts(Array.isArray(productsData.products) ? productsData.products : Array.isArray(productsData.data) ? productsData.data : []);
      setCategories(Array.isArray(categoriesData.categories) ? categoriesData.categories : Array.isArray(categoriesData.data) ? categoriesData.data : []);
      if (reportRes.ok) setDailyReport(reportData.report || null);
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

  const submitCategory = async (event) => {
    event.preventDefault();
    if (!newCategory.name.trim()) {
      window.alert("Category name is required");
      return;
    }

    try {
      await authFetch("/api/categories", {
      method: "POST",
      body: JSON.stringify({
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
      }),
      });
    } catch (error) {
      window.alert(error.message || "Unable to create category");
      return;
    }

    setNewCategory({ name: "", description: "" });
    load();
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    if (!newProduct.name.trim()) {
      window.alert("Product name is required");
      return;
    }
    if (!newProduct.price) {
      window.alert("Price is required");
      return;
    }

    try {
      await authFetch("/api/products", {
      method: "POST",
      body: JSON.stringify({
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim() || undefined,
        categoryId: newProduct.categoryId || "",
        price: Number(newProduct.price || 0),
        costPrice: Number(newProduct.cost || 0),
        taxPercentage: 5,
        stock: 0,
        lowStockThreshold: Number(newProduct.lowStockThreshold || 5),
      }),
      });
    } catch (error) {
      window.alert(error.message || "Unable to create product");
      return;
    }

    setNewProduct({
      name: "",
      sku: "",
      categoryId: "",
      price: "",
      cost: "",
      lowStockThreshold: "5",
      unit: "pcs",
    });

    load();
  };

  const productById = new Map(products.map((row) => [row._id, row]));

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
        <h3>Add Category (Self Service)</h3>
        <form className="inline-form" onSubmit={submitCategory}>
          <input
            placeholder="Category name"
            value={newCategory.name}
            onChange={(e) => setNewCategory((curr) => ({ ...curr, name: e.target.value }))}
          />
          <input
            placeholder="Description"
            value={newCategory.description}
            onChange={(e) => setNewCategory((curr) => ({ ...curr, description: e.target.value }))}
          />
          <button type="submit">Add Category</button>
        </form>
      </article>

      <article className="module-card form-card">
        <h3>Add Product (Self Service)</h3>
        <form className="inline-form" onSubmit={submitProduct}>
          <input
            placeholder="Product name"
            value={newProduct.name}
            onChange={(e) => setNewProduct((curr) => ({ ...curr, name: e.target.value }))}
          />
          <input
            placeholder="SKU (optional)"
            value={newProduct.sku}
            onChange={(e) => setNewProduct((curr) => ({ ...curr, sku: e.target.value }))}
          />
          <select
            value={newProduct.categoryId}
            onChange={(e) => setNewProduct((curr) => ({ ...curr, categoryId: e.target.value }))}
          >
            <option value="">No Category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>{category.name}</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            placeholder="Price"
            value={newProduct.price}
            onChange={(e) => setNewProduct((curr) => ({ ...curr, price: e.target.value }))}
          />
          <input
            type="number"
            min="0"
            placeholder="Cost"
            value={newProduct.cost}
            onChange={(e) => setNewProduct((curr) => ({ ...curr, cost: e.target.value }))}
          />
          <input
            type="number"
            min="0"
            placeholder="Low stock"
            value={newProduct.lowStockThreshold}
            onChange={(e) => setNewProduct((curr) => ({ ...curr, lowStockThreshold: e.target.value }))}
          />
          <select
            value={newProduct.unit}
            onChange={(e) => setNewProduct((curr) => ({ ...curr, unit: e.target.value }))}
          >
            <option value="pcs">pcs</option>
            <option value="kg">kg</option>
            <option value="ltr">ltr</option>
            <option value="pack">pack</option>
          </select>
          <button type="submit">Add Product</button>
        </form>
      </article>

      <article className="module-card form-card">
        <h3>Stock In / Out</h3>
        <form className="inline-form" onSubmit={submitMovement}>
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select Product</option>
            {products.map((row) => (
              <option key={row._id} value={row._id}>{row.name}</option>
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

      <article className="module-card">
        <h3>Daily Stock Report</h3>
        <p className="muted">
          Date: {dailyReport?.date || "--"} | In: {dailyReport?.totals?.stockIn ?? 0} | Out: {dailyReport?.totals?.stockOut ?? 0}
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Stock In</th>
                <th>Stock Out</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {(dailyReport?.items || []).map((row) => (
                <tr key={`${row.productId}-${row.productName}`}>
                  <td>{row.productName || productById.get(row.productId)?.name || "Unknown"}</td>
                  <td>{row.stockIn}</td>
                  <td>{row.stockOut}</td>
                  <td>{row.net}</td>
                </tr>
              ))}
              {!dailyReport?.items?.length && (
                <tr>
                  <td colSpan="4" className="muted">No movements for selected day.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
