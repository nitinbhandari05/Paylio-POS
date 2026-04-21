import React from "react";
import { Dot } from "lucide-react";
import { usePOS } from "../../context/POSContext";

export default function ProductCard({ product }) {
  const { addToCart, formatMoney } = usePOS();

  return (
    <button className="product-card" onClick={() => addToCart(product)}>
      <div className="product-thumb" />
      <strong>{product.name}</strong>
      <span>{formatMoney(product.price)}</span>
      <div className="product-meta">
        <em>
          <Dot size={18} /> {product.type || "veg"}
        </em>
        <small>{product.stock > 0 ? "In Stock" : "Out of Stock"}</small>
      </div>
    </button>
  );
}
