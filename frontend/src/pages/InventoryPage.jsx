import React, { useEffect, useState } from "react";

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
  const [recipes, setRecipes] = useState([]);
  const [dailyReport, setDailyReport] = useState(null);
  const [recipeForm, setRecipeForm] = useState({
    productId: "",
    ingredientId: "",
    ingredientQty: "1",
    wastagePercent: "0",
  });

  const load = async () => {
    try {
      const [summaryRes, stockRes, productsRes, categoriesRes, recipesRes, reportRes] = await Promise.all([
        fetch("/api/public/inventory/summary"),
        fetch("/api/public/inventory/stock"),
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/public/recipes"),
        fetch("/api/public/inventory/daily-report"),
      ]);

      const summaryData = await summaryRes.json();
      const stockData = await stockRes.json();
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      const recipesData = await recipesRes.json();
      const reportData = await reportRes.json();

      if (summaryRes.ok) setSummary(summaryData.summary || null);
      if (stockRes.ok) setStock(Array.isArray(stockData.stock) ? stockData.stock : []);
      if (productsRes.ok) setProducts(Array.isArray(productsData.products) ? productsData.products : []);
      if (categoriesRes.ok) setCategories(Array.isArray(categoriesData.categories) ? categoriesData.categories : []);
      if (recipesRes.ok) setRecipes(Array.isArray(recipesData.recipes) ? recipesData.recipes : []);
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

    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Unable to create category");
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

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim() || undefined,
        categoryId: newProduct.categoryId || "",
        price: Number(newProduct.price || 0),
        cost: Number(newProduct.cost || 0),
        lowStockThreshold: Number(newProduct.lowStockThreshold || 5),
        unit: newProduct.unit || "pcs",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Unable to create product");
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

  const submitRecipe = async (event) => {
    event.preventDefault();
    if (!recipeForm.productId || !recipeForm.ingredientId) {
      window.alert("Select product and ingredient");
      return;
    }
    if (recipeForm.productId === recipeForm.ingredientId) {
      window.alert("Product and ingredient cannot be same");
      return;
    }
    const quantity = Number(recipeForm.ingredientQty || 0);
    if (quantity <= 0) {
      window.alert("Ingredient quantity must be greater than 0");
      return;
    }

    const existing = recipes.find((row) => row.productId === recipeForm.productId);
    const ingredients = Array.isArray(existing?.ingredients) ? [...existing.ingredients] : [];
    const idx = ingredients.findIndex((row) => row.itemId === recipeForm.ingredientId);
    if (idx === -1) {
      ingredients.push({ itemId: recipeForm.ingredientId, quantity, unit: "unit" });
    } else {
      ingredients[idx] = { ...ingredients[idx], quantity };
    }

    const response = await fetch("/api/public/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: recipeForm.productId,
        ingredients,
        wastagePercent: Number(recipeForm.wastagePercent || 0),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      window.alert(data.message || "Unable to save recipe");
      return;
    }
    setRecipeForm((curr) => ({ ...curr, ingredientQty: "1" }));
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

      <article className="module-card form-card">
        <h3>Recipe Mapping (Auto Raw Material Deduction)</h3>
        <form className="inline-form" onSubmit={submitRecipe}>
          <select
            value={recipeForm.productId}
            onChange={(e) => setRecipeForm((curr) => ({ ...curr, productId: e.target.value }))}
          >
            <option value="">Menu Product</option>
            {products.map((row) => (
              <option key={row._id} value={row._id}>{row.name}</option>
            ))}
          </select>
          <select
            value={recipeForm.ingredientId}
            onChange={(e) => setRecipeForm((curr) => ({ ...curr, ingredientId: e.target.value }))}
          >
            <option value="">Raw Ingredient Product</option>
            {products.map((row) => (
              <option key={row._id} value={row._id}>{row.name}</option>
            ))}
          </select>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Qty per bill item"
            value={recipeForm.ingredientQty}
            onChange={(e) => setRecipeForm((curr) => ({ ...curr, ingredientQty: e.target.value }))}
          />
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="Wastage %"
            value={recipeForm.wastagePercent}
            onChange={(e) => setRecipeForm((curr) => ({ ...curr, wastagePercent: e.target.value }))}
          />
          <button type="submit">Save Recipe</button>
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
