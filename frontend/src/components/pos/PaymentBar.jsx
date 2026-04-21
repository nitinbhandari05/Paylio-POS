import React from "react";
import { CreditCard, Wallet, Smartphone, ReceiptText } from "lucide-react";
import { usePOS } from "../../context/POSContext";

export default function PaymentBar() {
  const {
    setDiscount,
    note,
    setNote,
    paymentMethod,
    setPaymentMethod,
    setSplitOpen,
    holdCurrentOrder,
    saveOrder,
    isSaving,
    cartItems,
  } = usePOS();

  return (
    <footer className="payment-bar card-shell">
      <button onClick={holdCurrentOrder}>Hold</button>
      <button onClick={() => setDiscount(Number(window.prompt("Discount amount", "0") || 0))}>Discount</button>
      <button onClick={() => setNote(window.prompt("Order note", note) || "")}>Note</button>
      <button onClick={() => { setPaymentMethod("split"); setSplitOpen(true); }}>Split</button>

      <button onClick={() => setPaymentMethod("cash")} className={paymentMethod === "cash" ? "active cash" : "cash"}>
        <Wallet size={15} /> Cash
      </button>
      <button onClick={() => setPaymentMethod("card")} className={paymentMethod === "card" ? "active card" : "card"}>
        <CreditCard size={15} /> Card
      </button>
      <button onClick={() => setPaymentMethod("upi")} className={paymentMethod === "upi" ? "active upi" : "upi"}>
        <Smartphone size={15} /> UPI
      </button>

      <button className="primary" onClick={saveOrder} disabled={!cartItems.length || isSaving}>
        <ReceiptText size={15} /> {isSaving ? "Saving..." : "Save & Print"}
      </button>
    </footer>
  );
}
