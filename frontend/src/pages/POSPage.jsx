import React from "react";
import POSHeader from "../components/pos/POSHeader";
import CategorySidebar from "../components/pos/CategorySidebar";
import ProductGrid from "../components/pos/ProductGrid";
import CartPanel from "../components/pos/CartPanel";
import PaymentBar from "../components/pos/PaymentBar";
import PaymentModal from "../components/pos/PaymentModal";

export default function POSPage() {
  return (
    <div className="pos-page">
      <POSHeader />

      <div className="pos-layout">
        <CategorySidebar />
        <ProductGrid />
        <CartPanel />
      </div>

      <PaymentBar />
      <PaymentModal />
    </div>
  );
}
