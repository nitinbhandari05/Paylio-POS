import React, { useState } from "react";
import { usePOS } from "../../context/POSContext";
import ProductCard from "./ProductCard";

export default function ProductGrid() {
  const { filteredProducts } = usePOS();
  const [selectedProductId, setSelectedProductId] = useState("");

  const handleAdded = (productId) => {
    setSelectedProductId(productId);
    window.setTimeout(() => {
      setSelectedProductId((current) => (current === productId ? "" : current));
    }, 320);
  };

  return (
    <section className="product-grid-wrap card-shell">
      <div className="card-title">Products</div>
      <div className="product-grid">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            selected={selectedProductId === product.id}
            onAdded={handleAdded}
          />
        ))}
        {!filteredProducts.length && <div className="empty-block">No products matched your search.</div>}
      </div>
    </section>
  );
}
