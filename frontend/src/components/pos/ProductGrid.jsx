import React from "react";
import { usePOS } from "../../context/POSContext";
import ProductCard from "./ProductCard";

export default function ProductGrid() {
  const { filteredProducts } = usePOS();

  return (
    <section className="product-grid-wrap card-shell">
      <div className="card-title">Products</div>
      <div className="product-grid">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {!filteredProducts.length && <div className="empty-block">No products matched your search.</div>}
      </div>
    </section>
  );
}
