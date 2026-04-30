import React from "react";
import { Search, UserRound, TableProperties } from "lucide-react";
import { usePOS } from "../../context/POSContext";

const TABLES = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];

export default function POSHeader() {
  const {
    searchTerm,
    setSearchTerm,
    orderType,
    setOrderType,
    customer,
    setCustomer,
    table,
    setTable,
  } = usePOS();

  return (
    <>
      <header className="pos-header">
        <div className="field search-field">
        <Search size={16} />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search products"
        />
        </div>

      <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="field">
        <option value="dinein">Dine In</option>
        <option value="delivery">Delivery</option>
        <option value="takeaway">Takeaway</option>
        <option value="pickup">Pickup</option>
      </select>

      <div className="field icon-field">
        <UserRound size={16} />
        <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer" />
      </div>

      <div className="field icon-field">
        <TableProperties size={16} />
        <select value={table} onChange={(e) => setTable(e.target.value)} disabled={orderType !== "dinein"}>
          {TABLES.map((tableNo) => (
            <option key={tableNo} value={tableNo}>
              {tableNo}
            </option>
          ))}
        </select>
      </div>

      </header>
    </>
  );
}
