import React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { usePOS } from "../../context/POSContext";

export default function CartItem({ item }) {
  const { updateQty, removeItem, formatMoney } = usePOS();

  return (
    <article className="cart-item">
      <div className="cart-line">
        <strong>{item.name}</strong>
        <button className="ghost-icon" onClick={() => removeItem(item.id)}>
          <Trash2 size={14} />
        </button>
      </div>

      <div className="cart-line sub">
        <span>{formatMoney(item.price)} each</span>
        <div className="qty-controller">
          <button onClick={() => updateQty(item.id, -1)}>
            <Minus size={14} />
          </button>
          <span>{item.qty}</span>
          <button onClick={() => updateQty(item.id, 1)}>
            <Plus size={14} />
          </button>
        </div>
        <strong>{formatMoney(item.qty * item.price)}</strong>
      </div>
    </article>
  );
}
