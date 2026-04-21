import React from "react";
import POSHeader from "../components/pos/POSHeader";
import CategorySidebar from "../components/pos/CategorySidebar";
import ProductGrid from "../components/pos/ProductGrid";
import CartPanel from "../components/pos/CartPanel";

export default function POSPage() {
  return (
    <div className="pos-page">
      <POSHeader />

      <div className="pos-layout">
        <CategorySidebar />
        <ProductGrid />
        <CartPanel />
      </div>
    </div>
  );
}
