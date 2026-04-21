import React, { useState } from "react";
import { usePOS } from "../../context/POSContext";

export default function POSQuickAddModal({ mode, onClose }) {
  const { masterCategories, quickAddCategory, quickAddProduct } = usePOS();
  const [loading, setLoading] = useState(false);

  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    categoryId: "",
    price: "",
    cost: "",
    unit: "pcs",
    lowStockThreshold: "5",
  });

  const submitCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      window.alert("Category name is required");
      return;
    }
    try {
      setLoading(true);
      await quickAddCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
      });
      onClose();
    } catch (error) {
      window.alert(error.message || "Category creation failed");
    } finally {
      setLoading(false);
    }
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      window.alert("Product name is required");
      return;
    }
    if (!productForm.price) {
      window.alert("Product price is required");
      return;
    }
    try {
      setLoading(true);
      await quickAddProduct({
        name: productForm.name.trim(),
        sku: productForm.sku.trim() || undefined,
        categoryId: productForm.categoryId || "",
        price: Number(productForm.price || 0),
        cost: Number(productForm.cost || 0),
        unit: productForm.unit || "pcs",
        lowStockThreshold: Number(productForm.lowStockThreshold || 5),
      });
      onClose();
    } catch (error) {
      window.alert(error.message || "Product creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card quick-add-card" onClick={(e) => e.stopPropagation()}>
        {mode === "category" ? (
          <>
            <h3>Quick Add Category</h3>
            <form className="quick-add-form" onSubmit={submitCategory}>
              <label>
                Name
                <input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((curr) => ({ ...curr, name: e.target.value }))}
                  placeholder="e.g. Beverages"
                />
              </label>
              <label>
                Description
                <input
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((curr) => ({ ...curr, description: e.target.value }))}
                  placeholder="Optional"
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="plain" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary" disabled={loading}>{loading ? "Saving..." : "Create"}</button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h3>Quick Add Product</h3>
            <form className="quick-add-form" onSubmit={submitProduct}>
              <label>
                Name
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm((curr) => ({ ...curr, name: e.target.value }))}
                  placeholder="e.g. Paneer Pizza"
                />
              </label>
              <label>
                SKU
                <input
                  value={productForm.sku}
                  onChange={(e) => setProductForm((curr) => ({ ...curr, sku: e.target.value }))}
                  placeholder="Optional"
                />
              </label>
              <label>
                Category
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm((curr) => ({ ...curr, categoryId: e.target.value }))}
                >
                  <option value="">No Category</option>
                  {masterCategories.map((category) => (
                    <option key={category._id} value={category._id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Price
                <input
                  type="number"
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm((curr) => ({ ...curr, price: e.target.value }))}
                />
              </label>
              <label>
                Cost
                <input
                  type="number"
                  min="0"
                  value={productForm.cost}
                  onChange={(e) => setProductForm((curr) => ({ ...curr, cost: e.target.value }))}
                />
              </label>
              <div className="quick-add-inline">
                <label>
                  Unit
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm((curr) => ({ ...curr, unit: e.target.value }))}
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="ltr">ltr</option>
                    <option value="pack">pack</option>
                  </select>
                </label>
                <label>
                  Low Stock
                  <input
                    type="number"
                    min="0"
                    value={productForm.lowStockThreshold}
                    onChange={(e) => setProductForm((curr) => ({ ...curr, lowStockThreshold: e.target.value }))}
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="plain" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary" disabled={loading}>{loading ? "Saving..." : "Create"}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
