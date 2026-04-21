import React from "react";
import { Dot } from "lucide-react";
import { usePOS } from "../../context/POSContext";

export default function ProductCard({ product, selected = false, onAdded }) {
  const { addToCart, formatMoney } = usePOS();
  const outOfStock = Number(product.stock || 0) <= 0;

  const handleClick = () => {
    const added = addToCart(product);
    if (added && onAdded) onAdded(product.id);
  };

  return (
    <button
      className={`product-card ${selected ? "selected" : ""}`}
      onClick={handleClick}
      disabled={outOfStock}
      aria-label={`Add ${product.name}`}
    >
      <strong>{product.name}</strong>
      <span>{formatMoney(product.price)}</span>
      <div className="product-meta">
        <em>
          <Dot size={18} /> {product.type || "veg"}
        </em>
        <small>{outOfStock ? "Out of Stock" : "In Stock"}</small>
      </div>
    </button>
  );
}
