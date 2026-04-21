import React from "react";
import { usePOS } from "../../context/POSContext";

export default function PaymentModal() {
  const { splitOpen, setSplitOpen, splitAmounts, setSplitAmounts, total, formatMoney } = usePOS();

  if (!splitOpen) return null;

  const paid = Number(splitAmounts.cash || 0) + Number(splitAmounts.card || 0) + Number(splitAmounts.upi || 0);

  return (
    <div className="modal-backdrop" onClick={() => setSplitOpen(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Split Payment</h3>
        <p>Total: {formatMoney(total)}</p>

        {[
          ["cash", "Cash"],
          ["card", "Card"],
          ["upi", "UPI"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min="0"
              value={splitAmounts[key]}
              onChange={(e) => setSplitAmounts((curr) => ({ ...curr, [key]: Number(e.target.value || 0) }))}
            />
          </label>
        ))}

        <div className="modal-summary">
          <span>Paid: {formatMoney(paid)}</span>
          <span>Balance: {formatMoney(Math.max(total - paid, 0))}</span>
        </div>

        <div className="modal-actions">
          <button onClick={() => setSplitOpen(false)} className="plain">Close</button>
          <button onClick={() => setSplitOpen(false)} className="primary">Apply</button>
        </div>
      </div>
    </div>
  );
}
