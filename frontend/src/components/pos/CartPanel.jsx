import React from "react";
import { usePOS } from "../../context/POSContext";
import CartItem from "./CartItem";

export default function CartPanel() {
  const {
    cartItems,
    subtotal,
    tax,
    discount,
    total,
    formatMoney,
    clearCart,
    heldOrders,
    restoreHeldOrder,
  } = usePOS();

  const itemCount = cartItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  return (
    <aside className="cart-panel card-shell">
      <div className="card-title cart-title-row">
        <span>Cart Panel</span>
        <em>{itemCount} items</em>
      </div>

      <div className="cart-items">
        {!cartItems.length && <div className="empty-block">No items in cart.</div>}
        {cartItems.map((item) => (
          <CartItem key={item.id} item={item} />
        ))}
      </div>

      <div className="totals-box">
        <div className="line"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
        <div className="line"><span>Tax</span><strong>{formatMoney(tax)}</strong></div>
        <div className="line"><span>Discount</span><strong>-{formatMoney(discount)}</strong></div>
        <div className="line total"><span>Total</span><strong>{formatMoney(total)}</strong></div>
        {!!cartItems.length && (
          <button className="cart-clear-btn" onClick={clearCart}>Clear Cart</button>
        )}
      </div>

      {!!heldOrders.length && (
        <div className="held-orders">
          <h4>Held Orders</h4>
          {heldOrders.slice(-3).map((order) => (
            <button key={order.id} onClick={() => restoreHeldOrder(order.id)}>
              {order.customer} · {order.table} · {order.items.length} items
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
